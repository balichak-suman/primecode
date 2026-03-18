// Seed script: creates 3 sample job postings
// Run: node backend/seeds/jobsSeed.js

import '../loadEnv.js';
import prisma from '../prismaClient.js';

const jobs = [
  {
    title: 'Senior React Developer',
    department: 'Engineering',
    type: 'Full-time',
    location: 'Remote / Gurugram',
    experience: '4-7 years',
    salary: '₹20-35 LPA',
    description: 'Join our frontend team to build and scale complex React applications for our enterprise HRMS platform. You will drive architecture decisions and mentor junior developers.',
    responsibilities: [
      'Lead frontend architecture and component design',
      'Build reusable component libraries and design systems',
      'Optimize rendering performance and bundle sizes',
      'Implement complex state management patterns',
      'Mentor and review code for junior developers',
    ],
    requirements: [
      '4+ years of professional React experience',
      'Deep knowledge of hooks, context, and performance optimization',
      'Experience with TypeScript and modern build tools (Vite)',
      'Strong understanding of CSS-in-JS, animations, and responsive design',
      'Experience with testing frameworks (Jest, React Testing Library)',
    ],
    niceToHave: ['Experience with Recharts or D3', 'Socket.io for real-time features', 'Dark theme enterprise UIs'],
    perks: ['100% Remote option', 'Stock options', 'Health insurance', 'Learning budget ₹50K/yr', 'Flexible hours', 'Home office setup'],
    status: 'ACTIVE',
  },
  {
    title: 'Node.js Backend Engineer',
    department: 'Engineering',
    type: 'Full-time',
    location: 'Remote / Gurugram',
    experience: '3-6 years',
    salary: '₹18-30 LPA',
    description: 'Build and maintain our backend services powering the PrimeCode HRMS platform. You will design APIs, database schemas, and real-time systems handling thousands of concurrent users.',
    responsibilities: [
      'Design and implement RESTful and WebSocket APIs',
      'Build and optimize PostgreSQL database schemas with Prisma ORM',
      'Implement authentication, authorization, and security best practices',
      'Build real-time features using Socket.io',
      'Write comprehensive tests and documentation',
    ],
    requirements: [
      '3+ years of Node.js/Express development',
      'Strong SQL/PostgreSQL skills and ORM experience',
      'Experience with authentication systems (JWT, OAuth)',
      'Understanding of microservices architecture',
      'Proficiency with Git and CI/CD workflows',
    ],
    niceToHave: ['Prisma ORM experience', 'Redis caching', 'AWS/Docker deployment'],
    perks: ['Remote-first', 'Competitive salary', 'Health & dental insurance', 'Flexible PTO', 'Equipment allowance'],
    status: 'ACTIVE',
  },
  {
    title: 'UI/UX Designer',
    department: 'Design',
    type: 'Remote',
    location: 'Fully Remote',
    experience: '2-5 years',
    salary: '₹14-22 LPA',
    description: 'Craft stunning, intuitive interfaces for our enterprise HRMS platform. You will own the design process from user research through high-fidelity prototypes and work closely with our engineering team.',
    responsibilities: [
      'Create wireframes, prototypes, and high-fidelity mockups in Figma',
      'Conduct user research, interviews, and usability testing',
      'Build and evolve our dark-themed design system',
      'Collaborate with frontend engineers on implementation',
      'Present design decisions and rationale to stakeholders',
    ],
    requirements: [
      '2+ years of product/UI design experience',
      'Expert proficiency in Figma',
      'Strong portfolio demonstrating web app design skills',
      'Understanding of accessibility standards (WCAG)',
      'Excellent communication and presentation skills',
    ],
    niceToHave: ['Dark theme enterprise UI experience', 'Motion/interaction design', 'Basic HTML/CSS/JS knowledge'],
    perks: ['Work from anywhere', 'Latest design tools', 'Conference budget', 'Health insurance', 'Team retreats'],
    status: 'ACTIVE',
  },
];

async function seed() {
  try {
    // Check if jobs already exist to avoid duplicates
    const existingCount = await prisma.jobPosting.count();
    if (existingCount > 0) {
      console.log(`[SEED] ${existingCount} job(s) already exist. Skipping seed to avoid duplicates.`);
      console.log('[SEED] To re-seed, clear the JobPosting table first.');
      process.exit(0);
    }

    const result = await prisma.jobPosting.createMany({ data: jobs });
    console.log(`[SEED] ✅ Created ${result.count} job postings:`);
    jobs.forEach((j, i) => console.log(`  ${i + 1}. ${j.title} (${j.department}, ${j.type})`));
    process.exit(0);
  } catch (error) {
    console.error('[SEED] ❌ Error:', error.message);
    process.exit(1);
  }
}

seed();
