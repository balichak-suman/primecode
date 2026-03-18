import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'emp1@primecode.tech' } });
  if (!user) {
    console.log('Test user not found');
    return;
  }

  // 1. Create Salary Structure
  const structure = await prisma.salaryStructure.upsert({
    where: { id: 1 },
    update: {},
    create: {
      userId: user.id,
      ctc: 600000,
      grade: 'L1',
      effectiveFrom: new Date('2025-04-01'),
      basic: 25000,
      hra: 10000,
      transport: 1600,
      medical: 1250,
      special: 12150,
      pf: 3000,
      professionalTax: 200,
      tds: 2000
    }
  });

  // 2. Create some Payslips
  const months = ['January', 'February', 'March'];
  for (const month of months) {
    await prisma.payroll.create({
      data: {
        userId: user.id,
        month,
        year: 2026,
        baseSalary: 25000,
        earnings: { basic: 25000, hra: 10000, transport: 1600, medical: 1250, special: 12150 },
        deductions: { pf: 3000, professionalTax: 200, tds: 2000, esi:0, other:0 },
        grossSalary: 50000,
        totalDeductions: 5200,
        netSalary: 44800,
        paymentDate: new Date(),
        paymentMode: 'BANK_TRANSFER',
        status: 'PAID'
      }
    });
  }

  console.log('Payroll seeding complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
