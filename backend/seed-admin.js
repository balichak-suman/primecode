import dotenv from 'dotenv';
dotenv.config();
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@primecode.com' },
    update: {},
    create: {
      email: 'admin@primecode.com',
      password: hashedPassword,
      name: 'Global Admin',
      role: 'ADMIN',
      designation: 'System Administrator',
      baseSalary: 100000
    }
  });
  console.log('Admin user created/verified:', user.email);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
