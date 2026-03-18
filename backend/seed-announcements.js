import dotenv from 'dotenv';
dotenv.config();
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  
  console.log(`Admin: ${admin.name} (id: ${admin.id})`);
  console.log(`Total users: ${users.length}`);

  // Seed announcements
  const announcements = [
    { title: 'Company Town Hall — Q1 2026 Review', content: 'Dear Team,\n\nWe are excited to announce our quarterly Town Hall meeting scheduled for March 25th, 2026 at 3:00 PM IST.\n\nAgenda:\n• Q1 Financial Performance\n• Product Roadmap Updates\n• Team Recognitions & Awards\n• Open Q&A Session\n\nPlease block your calendars. Virtual link will be shared 30 minutes before the meeting.\n\nSee you there!\n— Leadership Team', type: 'GENERAL', category: 'General', pinned: true },
    { title: '🚨 Critical Security Update — Password Reset Required', content: 'IMMEDIATE ACTION REQUIRED\n\nAs part of our ongoing security enhancement initiative, all employees are required to reset their passwords by March 20th, 2026.\n\nNew password requirements:\n• Minimum 12 characters\n• Must include uppercase, lowercase, numbers, and special characters\n• Cannot reuse last 5 passwords\n\nFailure to comply will result in temporary account lockout.\n\nContact IT Support at ext. 4455 for assistance.', type: 'URGENT', category: 'Policy', pinned: true },
    { title: '🎉 Holi Holiday — Office Closed March 14th', content: 'Happy Holi everyone!\n\nThe office will remain closed on Friday, March 14th, 2026 on account of Holi.\n\nRegular operations resume on Monday, March 17th.\n\nWishing you a colorful and joyful celebration!\n\n— HR Team', type: 'HOLIDAY', category: 'Holiday' },
    { title: 'Updated Leave Policy — FY 2026-27', content: 'Please note the following updates to our leave policy effective April 1st, 2026:\n\n1. Casual Leave increased from 12 to 14 days\n2. Sick Leave now includes mental health days (up to 3/year)\n3. Earned Leave carry-forward cap raised to 30 days\n4. New: Period Leave — 1 day/month (no questions asked)\n5. Paternity Leave extended to 15 days\n\nDetailed policy document available on the HR portal.\n\n— HR Department', type: 'POLICY', category: 'Policy' },
    { title: 'Welcome New Joiners — March 2026 Batch', content: 'We are thrilled to welcome the following new team members:\n\n• Sarah Chen — Senior Frontend Developer (Engineering)\n• Ravi Kumar — Data Analyst (Product)\n• Priya Singh — UI/UX Designer (Design)\n• James Wilson — Sales Executive (Sales)\n\nPlease give them a warm welcome and help them settle in!\n\nBuddy assignments have been shared via email.\n\n— People Operations', type: 'GENERAL', category: 'General' },
  ];

  for (const a of announcements) {
    await prisma.announcement.create({
      data: { ...a, postedById: admin.id, targetRoles: ['ALL'], readBy: [] }
    });
  }
  console.log(`Seeded ${announcements.length} announcements`);

  // Seed notifications for all users
  const notifTemplates = [
    { type: 'announcement', title: 'New Broadcast: Company Town Hall', message: 'Q1 2026 Town Hall on March 25th at 3:00 PM', link: '/dashboard/announcements' },
    { type: 'leave_approved', title: 'Leave Approved', message: 'Your casual leave for Mar 14 has been approved by HR', link: '/dashboard/leaves' },
    { type: 'payslip', title: 'Payslip Generated', message: 'Your February 2026 payslip is ready for download', link: '/dashboard/payroll' },
    { type: 'birthday', title: '🎂 Happy Birthday!', message: 'Wishing you a wonderful birthday! — PrimeCode Family', link: null },
    { type: 'low_balance', title: 'Leave Balance Alert', message: 'Your sick leave balance is below 2 days (1.5 remaining)', link: '/dashboard/leaves' },
    { type: 'announcement', title: '🚨 Security Update Required', message: 'Password reset required by March 20th — check announcements', link: '/dashboard/announcements' },
    { type: 'regularization', title: 'Attendance Regularized', message: 'Your attendance for Mar 10 has been approved', link: '/dashboard/attendance' },
    { type: 'anniversary', title: '🎉 Work Anniversary!', message: 'Congratulations on completing 2 years at PrimeCode!', link: null },
  ];

  let totalNotifs = 0;
  for (const user of users) {
    // 4-6 random notifications per user
    const count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const t = notifTemplates[i % notifTemplates.length];
      const hoursAgo = Math.floor(Math.random() * 72);
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: t.type,
          title: t.title,
          message: t.message,
          link: t.link,
          isRead: Math.random() > 0.6,
          createdAt: new Date(Date.now() - hoursAgo * 3600000)
        }
      });
      totalNotifs++;
    }
  }
  console.log(`Seeded ${totalNotifs} notifications across ${users.length} users`);

  const counts = await Promise.all([
    prisma.announcement.count(),
    prisma.notification.count()
  ]);
  console.log(`\nTotals: ${counts[0]} announcements, ${counts[1]} notifications`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
