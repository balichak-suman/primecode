import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('PrimeCode@123', 10);

  const testUsers = [
    // 2 Admins
    {
      email: 'admin1@primecode.tech', name: 'Super Admin', role: 'ADMIN',
      employeeId: 'EMP-A001', department: 'Management', designation: 'CEO'
    },
    {
      email: 'admin2@primecode.tech', name: 'Tech Admin', role: 'ADMIN',
      employeeId: 'EMP-A002', department: 'IT', designation: 'CTO'
    },
    // 2 HRs
    {
      email: 'hr1@primecode.tech', name: 'HR Manager', role: 'HR',
      employeeId: 'EMP-H001', department: 'Human Resources', designation: 'HR Head'
    },
    {
      email: 'hr2@primecode.tech', name: 'Jane HR', role: 'HR',
      employeeId: 'EMP-H002', department: 'Human Resources', designation: 'Talent Acquisition'
    },
    // 6 Employees
    {
      email: 'emp1@primecode.tech', name: 'Alice Smith', role: 'EMPLOYEE',
      employeeId: 'EMP-E001', department: 'Engineering', designation: 'Frontend Developer'
    },
    {
      email: 'emp2@primecode.tech', name: 'Bob Johnson', role: 'EMPLOYEE',
      employeeId: 'EMP-E002', department: 'Engineering', designation: 'Backend Developer'
    },
    {
      email: 'emp3@primecode.tech', name: 'Charlie Lee', role: 'EMPLOYEE',
      employeeId: 'EMP-E003', department: 'Design', designation: 'UI/UX Designer'
    },
    {
      email: 'emp4@primecode.tech', name: 'Diana Prince', role: 'EMPLOYEE',
      employeeId: 'EMP-E004', department: 'Marketing', designation: 'Marketing Manager'
    },
    {
      email: 'emp5@primecode.tech', name: 'Evan Davis', role: 'EMPLOYEE',
      employeeId: 'EMP-E005', department: 'Sales', designation: 'Sales Executive'
    },
    {
      email: 'emp6@primecode.tech', name: 'Fiona Garcia', role: 'EMPLOYEE',
      employeeId: 'EMP-E006', department: 'Quality Assurance', designation: 'QA Engineer'
    }
  ];

  console.log('Seeding Database...');
  
  for (const u of testUsers) {
    try {
      const user = await prisma.user.upsert({
        where: { email: u.email },
        update: { password: hashedPassword, ...u },
        create: { password: hashedPassword, ...u }
      });
      console.log(`✓ Created/Updated ${user.email}`);
    } catch (e) {
      console.error(`✗ Failed to create ${u.email}`, e);
    }
  }
  
  console.log('Done database seeding!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
