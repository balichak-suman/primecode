import express from 'express';
import prisma from '../prismaClient.js';
import { authMiddleware, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// ==========================================
// UTILS / LOGIC
// ==========================================

const calculateSalaryBreakdown = (ctc) => {
  // Simple Indian Salary Split Logic
  const monthlyCTC = ctc / 12;
  const basic = monthlyCTC * 0.50; // 50% of CTC
  const hra = basic * 0.40;       // 40% of Basic
  const transport = 1600;         // Standard
  const medical = 1250;           // Standard
  const special = monthlyCTC - (basic + hra + transport + medical);

  // Deductions
  const pf = basic * 0.12;        // 12% of Basic
  const professionalTax = 200;    // Standard
  
  // Basic TDS Logic (Rough estimate for demo)
  let tds = 0;
  if (ctc > 1000000) tds = (monthlyCTC * 0.20);
  else if (ctc > 500000) tds = (monthlyCTC * 0.10);

  return {
    earnings: { basic, hra, transport, medical, special },
    deductions: { pf, professionalTax, tds, esi: 0, other: 0 }
  };
};

// ==========================================
// EMPLOYEE ROUTES
// ==========================================

// 1. Get My Payslips
router.get('/my-payslips', authMiddleware, async (req, res) => {
  try {
    const payslips = await prisma.payroll.findMany({
      where: { userId: req.user.id },
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });
    res.json(payslips);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payslips' });
  }
});

// 2. Get My Salary Structure
router.get('/my-structure', authMiddleware, async (req, res) => {
  try {
    const structure = await prisma.salaryStructure.findFirst({
      where: { userId: req.user.id },
      orderBy: { effectiveFrom: 'desc' }
    });
    res.json(structure);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch salary structure' });
  }
});

// 3. Submit Reimbursement
router.post('/reimbursements', authMiddleware, async (req, res) => {
  try {
    const { title, amount, category, date, description, receiptUrl } = req.body;
    const claim = await prisma.reimbursement.create({
      data: {
        userId: req.user.id,
        title,
        amount: parseFloat(amount),
        category,
        date: new Date(date),
        description,
        receiptUrl,
        status: 'PENDING'
      }
    });
    res.status(201).json(claim);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit reimbursement' });
  }
});

// 4. Get My Reimbursements
router.get('/my-reimbursements', authMiddleware, async (req, res) => {
  try {
    const claims = await prisma.reimbursement.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(claims);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch claims' });
  }
});

// ==========================================
// HR / ADMIN ROUTES
// ==========================================

// 5. Process Monthly Payroll (Bulk)
router.post('/process-monthly', authMiddleware, authorize(['HR', 'ADMIN']), async (req, res) => {
  try {
    const { month, year } = req.body; // e.g. "March", 2026

    // Check if payroll already exists for this month
    const existing = await prisma.payroll.findFirst({ where: { month, year } });
    // if (existing) return res.status(400).json({ error: 'Payroll already processed for this month.' });

    const employees = await prisma.user.findMany({
      where: { role: 'EMPLOYEE', status: 'active' },
      include: { salaryStructures: { orderBy: { effectiveFrom: 'desc' }, take: 1 } }
    });

    const payrolls = [];
    for (const emp of employees) {
      const structure = emp.salaryStructures[0];
      if (!structure) continue;

      const breakdown = calculateSalaryBreakdown(structure.ctc);
      
      const grossSalary = Object.values(breakdown.earnings).reduce((a, b) => a + b, 0);
      const totalDeductions = Object.values(breakdown.deductions).reduce((a, b) => a + b, 0);
      const netSalary = grossSalary - totalDeductions;

      payrolls.push({
        userId: emp.id,
        month,
        year: parseInt(year),
        earnings: breakdown.earnings,
        deductions: breakdown.deductions,
        baseSalary: breakdown.earnings.basic, // legacy
        grossSalary,
        totalDeductions,
        netSalary,
        status: 'PROCESSED'
      });
    }

    // Use transaction for bulk create
    await prisma.payroll.createMany({ data: payrolls });

    res.json({ message: `Successfully processed payroll for ${payrolls.length} employees.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Payroll processing failed' });
  }
});

// 6. Get All Payroll Records
router.get('/all', authMiddleware, authorize(['HR', 'ADMIN']), async (req, res) => {
  try {
    const { month, year } = req.query;
    const records = await prisma.payroll.findMany({
      where: { 
        ...(month && { month }), 
        ...(year && { year: parseInt(year) }) 
      },
      include: { user: { select: { name: true, employeeId: true, department: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payroll records' });
  }
});

// 7. Update Salary Structure (Admin Only)
router.post('/structure', authMiddleware, authorize(['ADMIN']), async (req, res) => {
  try {
    const { userId, ctc, grade, effectiveFrom } = req.body;
    const breakdown = calculateSalaryBreakdown(parseFloat(ctc));
    
    const structure = await prisma.salaryStructure.create({
      data: {
        userId: parseInt(userId),
        ctc: parseFloat(ctc),
        grade,
        effectiveFrom: new Date(effectiveFrom),
        ...breakdown.earnings,
        ...breakdown.deductions
      }
    });
    res.status(201).json(structure);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create salary structure' });
  }
});

// 8. Bulk Mark as PAID
router.put('/mark-paid', authMiddleware, authorize(['HR', 'ADMIN']), async (req, res) => {
  try {
    const { payrollIds, paymentDate, paymentMode } = req.body;
    await prisma.payroll.updateMany({
      where: { id: { in: payrollIds.map(id => parseInt(id)) } },
      data: { 
        status: 'PAID', 
        paymentDate: new Date(paymentDate),
        paymentMode 
      }
    });
    res.json({ message: 'Payroll marked as paid successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update payment status' });
  }
});

export default router;
