import express from 'express';
const router = express.Router();
import prisma from '../prismaClient.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

router.post('/query', authMiddleware, async (req, res) => {
  try {
    const { query } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const q = (query || '').toLowerCase();

    // ═══ ATTENDANCE QUERIES ═══
    if (q.includes('attendance') && (q.includes('my') || q.includes('this month') || q.includes('today'))) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const records = await prisma.attendance.findMany({
        where: { userId, date: { gte: startOfMonth, lte: now } },
        orderBy: { date: 'desc' }
      });
      const present = records.filter(r => ['PRESENT', 'WFH'].includes(r.status)).length;
      const late = records.filter(r => r.lateMinutes > 0).length;
      const absent = records.filter(r => r.status === 'ABSENT').length;
      const totalDays = records.length;
      return res.json({
        type: 'attendance_stats',
        message: `📊 **Your Attendance This Month**\n\n• Total Days Recorded: **${totalDays}**\n• Present/WFH: **${present}**\n• Late Arrivals: **${late}**\n• Absent: **${absent}**\n• Attendance Rate: **${totalDays ? Math.round((present/totalDays)*100) : 0}%**`,
        data: { totalDays, present, late, absent }
      });
    }

    // ═══ LEAVE BALANCE ═══
    if ((q.includes('leave') && (q.includes('balance') || q.includes('left') || q.includes('remaining') || q.includes('how many')))) {
      const year = new Date().getFullYear();
      const balance = await prisma.leaveBalance.findFirst({ where: { userId, year } });
      if (balance) {
        const casual = balance.casual || {};
        const sick = balance.sick || {};
        const earned = balance.earned || {};
        return res.json({
          type: 'leave_balance',
          message: `🏝️ **Your Leave Balance (${year})**\n\n• Casual Leave: **${casual.remaining ?? 0}** / ${casual.total ?? 0}\n• Sick Leave: **${sick.remaining ?? 0}** / ${sick.total ?? 0}\n• Earned Leave: **${earned.remaining ?? 0}** / ${earned.total ?? 0}\n\n_Total remaining: **${(casual.remaining||0)+(sick.remaining||0)+(earned.remaining||0)} days**_`,
          data: balance
        });
      }
      return res.json({ type: 'text', message: 'No leave balance found for this year. Contact HR if this seems incorrect.' });
    }

    // ═══ APPLY LEAVE ═══
    if (q.includes('apply') && q.includes('leave')) {
      return res.json({
        type: 'action_prompt',
        action: 'apply_leave',
        message: '📝 **Apply Leave**\n\nI can help you apply for leave! Please use the **Leaves** page to submit your application with:\n• Leave type (Casual / Sick / Earned)\n• Start & End dates\n• Reason\n\n👉 [Go to Leaves →](/dashboard/leaves)',
      });
    }

    // ═══ PAYSLIP ═══
    if (q.includes('payslip') || q.includes('salary') || (q.includes('pay') && q.includes('slip'))) {
      const latestPayroll = await prisma.payroll.findFirst({
        where: { userId }, orderBy: { createdAt: 'desc' }
      });
      if (latestPayroll) {
        return res.json({
          type: 'payslip',
          message: `💰 **Latest Payslip — ${latestPayroll.month} ${latestPayroll.year}**\n\n• Gross Salary: **₹${latestPayroll.grossSalary?.toLocaleString()}**\n• Total Deductions: **₹${latestPayroll.totalDeductions?.toLocaleString()}**\n• Net Salary: **₹${latestPayroll.netSalary?.toLocaleString()}**\n• Status: **${latestPayroll.status}**\n\n👉 [View Full Payslip →](/dashboard/payroll)`,
          data: latestPayroll
        });
      }
      return res.json({ type: 'text', message: 'No payslip records found. Please check with Payroll department.' });
    }

    // ═══ TEAM ON LEAVE (HR/Admin) ═══
    if ((q.includes('who') && q.includes('leave') && q.includes('today')) || (q.includes('team') && q.includes('absent'))) {
      if (!['HR', 'ADMIN'].includes(userRole)) {
        return res.json({ type: 'text', message: '🔒 This query requires HR or Admin access.' });
      }
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      const leaves = await prisma.leave.findMany({
        where: { status: 'APPROVED', startDate: { lte: tomorrow }, endDate: { gte: today } },
        include: { user: { select: { name: true, department: true } } }
      });
      if (leaves.length === 0) return res.json({ type: 'text', message: '✅ No one is on approved leave today. Full team available!' });
      const list = leaves.map(l => `• **${l.user.name}** (${l.user.department || 'N/A'}) — ${l.type}`).join('\n');
      return res.json({
        type: 'team_leave',
        message: `👥 **On Leave Today** (${leaves.length})\n\n${list}`,
        data: leaves
      });
    }

    // ═══ PENDING APPROVALS (HR/Admin) ═══
    if (q.includes('pending') && (q.includes('approval') || q.includes('leave'))) {
      if (!['HR', 'ADMIN'].includes(userRole)) {
        return res.json({ type: 'text', message: '🔒 This query requires HR or Admin access.' });
      }
      const pending = await prisma.leave.findMany({
        where: { status: 'PENDING' },
        include: { user: { select: { name: true, department: true } } },
        orderBy: { appliedOn: 'desc' }, take: 10
      });
      if (pending.length === 0) return res.json({ type: 'text', message: '✅ No pending leave requests!' });
      const list = pending.map(l => `• **${l.user.name}** — ${l.type} (${l.days} day${l.days > 1 ? 's' : ''}, ${new Date(l.startDate).toLocaleDateString()})`).join('\n');
      return res.json({
        type: 'pending_approvals',
        message: `⏳ **Pending Leave Approvals** (${pending.length})\n\n${list}\n\n👉 [Manage Leaves →](/dashboard/leaves)`,
        data: pending
      });
    }

    // ═══ TEAM ATTENDANCE (HR/Admin) ═══
    if (q.includes('team') && q.includes('attendance')) {
      if (!['HR', 'ADMIN'].includes(userRole)) {
        return res.json({ type: 'text', message: '🔒 This query requires HR or Admin access.' });
      }
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      const records = await prisma.attendance.findMany({
        where: { date: { gte: today, lt: tomorrow } },
        include: { user: { select: { name: true } } }
      });
      const present = records.filter(r => r.status === 'PRESENT').length;
      const wfh = records.filter(r => r.status === 'WFH').length;
      const late = records.filter(r => r.lateMinutes > 0).length;
      return res.json({
        type: 'team_attendance',
        message: `📊 **Team Attendance Today**\n\n• Clocked In: **${records.length}**\n• Present (Office): **${present}**\n• WFH: **${wfh}**\n• Late: **${late}**\n\n👉 [Full Attendance →](/dashboard/attendance)`,
        data: { total: records.length, present, wfh, late }
      });
    }

    // ═══ CAPABILITIES / HELP ═══
    if (q.includes('help') || q.includes('what can you') || q.includes('capabilities') || q.includes('who are you')) {
      return res.json({
        type: 'capabilities',
        message: `🤖 **PrimeAI — HRMS Assistant**\n\nI can help with:\n\n**📊 Attendance**\n• "What's my attendance this month?"\n• "Show team attendance today" _(HR)_\n\n**🏝️ Leave**\n• "How many leaves do I have left?"\n• "Who's on leave today?" _(HR)_\n• "Pending leave approvals" _(HR)_\n\n**💰 Payroll**\n• "Show my latest payslip"\n\n**📋 Navigation**\n• "Go to attendance"\n• "Open reports"\n\n_Just type your question naturally!_`
      });
    }

    // ═══ NAVIGATION ═══
    const navMap = {
      'attendance': '/dashboard/attendance', 'leaves': '/dashboard/leaves', 'leave': '/dashboard/leaves',
      'payroll': '/dashboard/payroll', 'projects': '/dashboard/projects', 'performance': '/dashboard/performance',
      'reports': '/dashboard/reports', 'analytics': '/dashboard/analytics', 'documents': '/dashboard/documents',
      'announcements': '/dashboard/announcements', 'chat': '/dashboard/chat', 'settings': '/dashboard/settings'
    };
    if (q.includes('go to') || q.includes('open') || q.includes('navigate')) {
      for (const [key, path] of Object.entries(navMap)) {
        if (q.includes(key)) {
          return res.json({ type: 'navigate', path, message: `🔗 Opening **${key.charAt(0).toUpperCase() + key.slice(1)}**...` });
        }
      }
    }

    // ═══ FALLBACK ═══
    return res.json({
      type: 'text',
      message: `I understand you're asking about "${query}". I can help with:\n\n• Attendance stats\n• Leave balance & applications\n• Payslip info\n• Team data (HR/Admin)\n\nTry asking something like _"How many leaves do I have left?"_`
    });

  } catch (error) {
    console.error('AI query error:', error);
    res.status(500).json({ type: 'error', message: 'Sorry, something went wrong processing your request.' });
  }
});

export default router;
