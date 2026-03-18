import dotenv from 'dotenv';
dotenv.config();
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

async function main() {
  // Get all users
  const users = await prisma.user.findMany({ select: { id: true, name: true, role: true } });
  console.log(`Found ${users.length} users`);

  const goalTemplates = [
    { title: 'Infrastructure Optimization', description: 'Reduce backend API latency by 30% through caching and query optimization.', target: 100, current: 65, status: 'IN_PROGRESS', dueDate: new Date('2026-06-30') },
    { title: 'Security Hardening', description: 'Implement MFA across all admin portals and resolve OWASP Top 10 audit findings.', target: 100, current: 40, status: 'AT_RISK', dueDate: new Date('2026-04-15') },
    { title: 'Cyber UI Components', description: 'Rebuild the internal design system with glassmorphism components and dark mode support.', target: 100, current: 90, status: 'COMPLETED', dueDate: new Date('2026-03-31') },
    { title: 'Client Onboarding Automation', description: 'Automate client onboarding workflow reducing manual steps by 60%.', target: 100, current: 25, status: 'IN_PROGRESS', dueDate: new Date('2026-07-31') },
    { title: 'Team Knowledge Base', description: 'Create and maintain internal documentation for all core modules.', target: 100, current: 50, status: 'IN_PROGRESS', dueDate: new Date('2026-05-15') },
  ];

  for (const user of users) {
    // Check existing goals
    const existing = await prisma.goal.count({ where: { userId: user.id } });
    if (existing > 0) {
      console.log(`User ${user.name} (${user.id}) already has ${existing} goals, skipping.`);
      continue;
    }

    // Assign 3-5 goals per user
    const numGoals = Math.min(3 + Math.floor(Math.random() * 3), goalTemplates.length);
    for (let i = 0; i < numGoals; i++) {
      const t = goalTemplates[i];
      await prisma.goal.create({
        data: {
          userId: user.id,
          title: t.title,
          description: t.description,
          target: t.target,
          current: t.current + Math.floor(Math.random() * 10 - 5),
          status: t.status,
          dueDate: t.dueDate,
          visibility: 'PUBLIC'
        }
      });
    }
    console.log(`Seeded ${numGoals} goals for ${user.name} (${user.role})`);
  }

  // Verify
  const totalGoals = await prisma.goal.count();
  console.log(`\nTotal goals in database: ${totalGoals}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
