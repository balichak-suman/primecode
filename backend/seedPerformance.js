import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { role: 'EMPLOYEE' },
    take: 3
  });

  if (users.length === 0) {
    console.log('No employees found to seed performance data.');
    return;
  }

  for (const user of users) {
    // 1. Create Goals
    await prisma.goal.createMany({
      data: [
        {
          userId: user.id,
          title: 'Infrastructure Optimization',
          description: 'Reduce backend latency by 30% through query optimization and caching.',
          target: 100,
          current: 65,
          dueDate: new Date('2026-06-30'),
          status: 'IN_PROGRESS',
          alignment: 'Operational Excellence'
        },
        {
          userId: user.id,
          title: 'Security Hardening',
          description: 'Implement MFA and solve all high-severity audit findings.',
          target: 100,
          current: 90,
          dueDate: new Date('2026-03-31'),
          status: 'AT_RISK',
          alignment: 'Risk Management'
        },
        {
          userId: user.id,
          title: 'Cyber UI Components',
          description: 'Rebuild internal design system with glassmorphism and neon accents.',
          target: 50,
          current: 50,
          dueDate: new Date('2026-02-15'),
          status: 'COMPLETED',
          alignment: 'Brand Identity'
        }
      ]
    });

    // 2. Create Appraisal Review
    await prisma.performanceReview.create({
      data: {
        userId: user.id,
        reviewPeriod: 'Q1 2026',
        status: 'DRAFT',
        selfAssessment: {
          goals: [
            { title: 'Infrastructure Optimization', score: 4 },
            { title: 'Cyber UI Components', score: 5 }
          ],
          competencies: [
            { name: 'Technical Excellence', rating: 5 },
            { name: 'Collaboration', rating: 4 }
          ],
          achievements: 'Launched the new cyber design system ahead of schedule.',
          improvements: 'Need to focus more on documentation.',
          training: 'Advanced React patterns and distributed systems.',
          aspirations: 'Lead Architect by 2027.'
        }
      }
    });
  }

  console.log('Performance seeding complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
