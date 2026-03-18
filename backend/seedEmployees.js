import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const departments = ['Engineering', 'Product', 'Design', 'HR', 'Marketing'];
  const designations = ['SDE-1', 'Product Manager', 'UX Lead', 'HR Business Partner', 'Growth Lead'];
  
  for (let i = 2; i <= 6; i++) {
    const email = `emp${i}@primecode.tech`;
    
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        designation: designations[i-2],
        department: departments[i-2],
        employeeId: `PC00${i}`,
        status: 'active'
      },
      create: {
        email,
        password: '$2a$10$7zB1qA1H.K9iQ0bFkGz7.eQ/hY.u/o.O.k/B.C.D.E.F.G.H.I.J.K', // Demo hash
        name: `Employee Node ${i}`,
        role: 'EMPLOYEE',
        designation: designations[i-2],
        department: departments[i-2],
        status: 'active',
        employeeId: `PC00${i}`
      }
    });

    await prisma.employeeProfile.upsert({
      where: { userId: user.id },
      update: {
        grade: 'L1',
        workLocation: i % 2 === 0 ? 'OFFICE' : 'REMOTE',
        dob: new Date('1995-05-15'),
        gender: i % 2 === 0 ? 'Male' : 'Female',
        bloodGroup: 'O+'
      },
      create: {
        userId: user.id,
        grade: 'L1',
        joiningDate: new Date('2025-01-01'),
        workLocation: i % 2 === 0 ? 'OFFICE' : 'REMOTE',
        dob: new Date('1995-05-15'),
        gender: i % 2 === 0 ? 'Male' : 'Female',
        bloodGroup: 'O+',
        bankDetails: { accountNo: '123456789', ifsc: 'PRIME001', bankName: 'Cyber Bank' }
      }
    });
  }

  console.log('Advanced employee seeding complete (Fixed)!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
