import cron from 'node-cron';
import prisma from './prismaClient.js';

// Store toggle states in memory (loaded from DB on init)
let automationConfig = {
  dailyAbsentMarking: true,
  dailyAttendanceSummary: true,
  dailyBirthdayNotify: true,
  dailyAnniversaryNotify: true,
  dailyProbationCheck: true,
  databaseKeepAlive: true,
  weeklyAttendanceSummary: true,
  weeklyPendingReminder: true,
  monthlyLeaveReset: false,
  monthlyPayrollDraft: true,
  monthlyLeaveBalanceSummary: true,
  monthlyArchiveNotifications: true,
};

// Alert thresholds
let alertRules = {
  attendanceThreshold: 75,
  leaveBalanceAlert: 2,
  overtimeAlertHours: 10,
  documentExpiryDays: 30,
  probationAlertDays: 7,
};

export function getAutomationConfig() { return automationConfig; }
export function getAlertRules() { return alertRules; }

export function updateAutomationConfig(updates) {
  automationConfig = { ...automationConfig, ...updates };
}
export function updateAlertRules(updates) {
  alertRules = { ...alertRules, ...updates };
}

// ═══ DAILY JOBS (midnight) ═══
cron.schedule('0 0 * * *', async () => {
  console.log('[CRON] Running daily jobs...');
  try {
    if (automationConfig.dailyAbsentMarking) await markAbsentEmployees();
    if (automationConfig.dailyBirthdayNotify) await checkBirthdays();
    if (automationConfig.dailyAnniversaryNotify) await checkAnniversaries();
    if (automationConfig.dailyProbationCheck) await checkProbation();
  } catch (err) { console.error('[CRON] Daily job error:', err); }
});

// ═══ WEEKLY JOBS (Monday 9 AM) ═══
cron.schedule('0 9 * * 1', async () => {
  console.log('[CRON] Running weekly jobs...');
  try {
    if (automationConfig.weeklyPendingReminder) await sendPendingReminders();
  } catch (err) { console.error('[CRON] Weekly job error:', err); }
});

// ═══ MONTHLY JOBS (1st of month, 1 AM) ═══
cron.schedule('0 1 1 * *', async () => {
  console.log('[CRON] Running monthly jobs...');
  try {
    if (automationConfig.monthlyArchiveNotifications) await archiveOldNotifications();
    if (automationConfig.monthlyLeaveBalanceSummary) await sendLeaveBalanceSummary();
  } catch (err) { console.error('[CRON] Monthly job error:', err); }
});

cron.schedule('0 */4 * * *', async () => {
  console.log('[CRON] Running database keep-alive...');
  try {
    if (automationConfig.databaseKeepAlive) await databaseKeepAlive();
  } catch (err) { console.error('[CRON] Keep-alive error:', err); }
});

// ═══ ALERT CHECK (runs every 6 hours) ═══
cron.schedule('0 */6 * * *', async () => {
  console.log('[CRON] Running alert checks...');
  try {
    await checkLowLeaveBalance();
  } catch (err) { console.error('[CRON] Alert check error:', err); }
});

// ─────────────── JOB IMPLEMENTATIONS ───────────────

async function markAbsentEmployees() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return; // Skip weekends

  // Check if today is a holiday
  const holiday = await prisma.holiday.findFirst({ where: { date: { gte: today, lt: new Date(today.getTime() + 86400000) } } });
  if (holiday) return;

  const employees = await prisma.user.findMany({ where: { role: 'EMPLOYEE', status: 'active' }, select: { id: true } });
  const todayRecords = await prisma.attendance.findMany({
    where: { date: { gte: today, lt: new Date(today.getTime() + 86400000) } },
    select: { userId: true }
  });
  const punchedIds = new Set(todayRecords.map(r => r.userId));

  let markedCount = 0;
  for (const emp of employees) {
    if (!punchedIds.has(emp.id)) {
      // Check if they're on approved leave
      const onLeave = await prisma.leave.findFirst({
        where: { userId: emp.id, status: 'APPROVED', startDate: { lte: today }, endDate: { gte: today } }
      });
      if (!onLeave) {
        await prisma.attendance.create({ data: { userId: emp.id, date: today, status: 'ABSENT' } });
        markedCount++;
      }
    }
  }
  console.log(`[CRON] Marked ${markedCount} employees as absent.`);
}

async function checkBirthdays() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const profiles = await prisma.employeeProfile.findMany({
    where: { dob: { not: null } },
    include: { user: { select: { id: true, name: true, department: true } } }
  });

  const birthdayPeople = profiles.filter(p => {
    const dob = new Date(p.dob);
    return dob.getMonth() + 1 === month && dob.getDate() === day;
  });

  for (const p of birthdayPeople) {
    // Create announcement
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (admin) {
      await prisma.announcement.create({
        data: {
          title: `🎂 Happy Birthday, ${p.user.name}!`,
          content: `Wishing ${p.user.name} (${p.user.department || 'Team'}) a wonderful birthday! 🎉`,
          type: 'GENERAL', category: 'Birthday', postedById: admin.id,
          targetRoles: ['ALL'], readBy: []
        }
      });
    }

    // Notify the person
    await prisma.notification.create({
      data: {
        userId: p.user.id, type: 'birthday',
        title: '🎂 Happy Birthday!',
        message: 'Wishing you a wonderful birthday from the PrimeCode family!'
      }
    });
  }
  console.log(`[CRON] ${birthdayPeople.length} birthday(s) today.`);
}

async function checkAnniversaries() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const profiles = await prisma.employeeProfile.findMany({
    where: { joiningDate: { not: null } },
    include: { user: { select: { id: true, name: true } } }
  });

  const anniversaryPeople = profiles.filter(p => {
    const jd = new Date(p.joiningDate);
    return jd.getMonth() + 1 === month && jd.getDate() === day && jd.getFullYear() < today.getFullYear();
  });

  for (const p of anniversaryPeople) {
    const years = today.getFullYear() - new Date(p.joiningDate).getFullYear();
    await prisma.notification.create({
      data: {
        userId: p.user.id, type: 'anniversary',
        title: `🎉 ${years} Year Anniversary!`,
        message: `Congratulations on completing ${years} year${years > 1 ? 's' : ''} at PrimeCode!`
      }
    });
  }
  console.log(`[CRON] ${anniversaryPeople.length} anniversary(ies) today.`);
}

async function checkProbation() {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + alertRules.probationAlertDays);
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const profiles = await prisma.employeeProfile.findMany({
    where: { probationEnd: { gte: today, lte: futureDate } },
    include: { user: { select: { id: true, name: true } } }
  });

  const hrUsers = await prisma.user.findMany({ where: { role: { in: ['HR', 'ADMIN'] } }, select: { id: true } });

  for (const p of profiles) {
    for (const hr of hrUsers) {
      await prisma.notification.create({
        data: {
          userId: hr.id, type: 'probation',
          title: `Probation Ending: ${p.user.name}`,
          message: `${p.user.name}'s probation ends on ${new Date(p.probationEnd).toLocaleDateString()}`,
          link: `/dashboard/employees/${p.user.id}`
        }
      });
    }
  }
  console.log(`[CRON] ${profiles.length} probation(s) ending soon.`);
}

async function sendPendingReminders() {
  const pending = await prisma.leave.findMany({
    where: { status: 'PENDING' },
    include: { user: { select: { name: true } } }
  });

  if (pending.length > 0) {
    const hrUsers = await prisma.user.findMany({ where: { role: { in: ['HR', 'ADMIN'] } }, select: { id: true } });
    for (const hr of hrUsers) {
      await prisma.notification.create({
        data: {
          userId: hr.id, type: 'new_leave',
          title: `${pending.length} Pending Leave Approval${pending.length > 1 ? 's' : ''}`,
          message: `You have ${pending.length} leave request(s) awaiting your approval.`,
          link: '/dashboard/leaves'
        }
      });
    }
  }
  console.log(`[CRON] Reminded about ${pending.length} pending leaves.`);
}

async function archiveOldNotifications() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const result = await prisma.notification.deleteMany({ where: { createdAt: { lt: cutoff }, isRead: true } });
  console.log(`[CRON] Archived ${result.count} old notifications.`);
}

async function sendLeaveBalanceSummary() {
  const year = new Date().getFullYear();
  const employees = await prisma.user.findMany({ where: { role: 'EMPLOYEE', status: 'active' }, select: { id: true } });
  let count = 0;
  for (const emp of employees) {
    const balance = await prisma.leaveBalance.findFirst({ where: { userId: emp.id, year } });
    if (balance) {
      const casual = balance.casual?.remaining || 0;
      const sick = balance.sick?.remaining || 0;
      const earned = balance.earned?.remaining || 0;
      await prisma.notification.create({
        data: {
          userId: emp.id, type: 'low_balance',
          title: 'Monthly Leave Balance Summary',
          message: `CL: ${casual} | SL: ${sick} | EL: ${earned} days remaining`,
          link: '/dashboard/leaves'
        }
      });
      count++;
    }
  }
  console.log(`[CRON] Sent leave balance summary to ${count} employees.`);
}

async function checkLowLeaveBalance() {
  const year = new Date().getFullYear();
  const balances = await prisma.leaveBalance.findMany({
    where: { year },
    include: { user: { select: { id: true, name: true } } }
  });

  let alertCount = 0;
  for (const b of balances) {
    const types = ['casual', 'sick', 'earned'];
    for (const t of types) {
      const remaining = b[t]?.remaining ?? 0;
      if (remaining > 0 && remaining <= alertRules.leaveBalanceAlert) {
        // Check if we already sent a similar notification recently
        const recent = await prisma.notification.findFirst({
          where: { userId: b.user.id, type: 'low_balance', createdAt: { gte: new Date(Date.now() - 7 * 86400000) } }
        });
        if (!recent) {
          await prisma.notification.create({
            data: {
              userId: b.user.id, type: 'low_balance',
              title: `Low ${t.charAt(0).toUpperCase() + t.slice(1)} Leave Balance`,
              message: `Only ${remaining} day(s) remaining. Plan wisely!`,
              link: '/dashboard/leaves'
            }
          });
          alertCount++;
        }
      }
    }
  }
  console.log(`[CRON] Sent ${alertCount} low leave balance alerts.`);
}

async function databaseKeepAlive() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('[CRON] Database keep-alive successful.');
  } catch (err) {
    console.error('[CRON] Database keep-alive failed:', err);
  }
}

// ─── Manual Trigger (for testing) ───
export async function runJobManually(jobName) {
  const jobs = {
    markAbsent: markAbsentEmployees,
    birthdays: checkBirthdays,
    anniversaries: checkAnniversaries,
    probation: checkProbation,
    pendingReminders: sendPendingReminders,
    archiveNotifications: archiveOldNotifications,
    leaveBalanceSummary: sendLeaveBalanceSummary,
    lowLeaveBalance: checkLowLeaveBalance,
    databaseKeepAlive: databaseKeepAlive,
  };
  if (jobs[jobName]) {
    await jobs[jobName]();
    return { success: true, job: jobName };
  }
  return { success: false, error: `Unknown job: ${jobName}` };
}

console.log('[CRON] Automation engine initialized.');
