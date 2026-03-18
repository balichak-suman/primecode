import express from 'express';
const router = express.Router();
import prisma from '../prismaClient.js';
import { authMiddleware, authorize } from '../middleware/authMiddleware.js';

// ═══ EMPLOYEE DOCUMENTS ═══

// 1. Get my documents
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const profile = await prisma.employeeProfile.findUnique({ where: { userId: req.user.id } });
    const docs = Array.isArray(profile?.documents) ? profile.documents : [];
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// 2. Upload document (simulated — stores metadata in JSON)
router.post('/upload', authMiddleware, async (req, res) => {
  try {
    const { fileName, category, size, type } = req.body;
    const profile = await prisma.employeeProfile.findUnique({ where: { userId: req.user.id } });
    const docs = Array.isArray(profile?.documents) ? profile.documents : [];

    const newDoc = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: fileName,
      category: category || autoCategory(fileName),
      size: size || '1.2 MB',
      type: type || detectType(fileName),
      uploadedAt: new Date().toISOString(),
      uploadedBy: req.user.id,
      url: `/documents/${fileName}`,
      status: 'active'
    };
    docs.push(newDoc);

    await prisma.employeeProfile.update({
      where: { userId: req.user.id },
      data: { documents: docs }
    });
    res.status(201).json(newDoc);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// 3. Delete document
router.delete('/:docId', authMiddleware, async (req, res) => {
  try {
    const profile = await prisma.employeeProfile.findUnique({ where: { userId: req.user.id } });
    let docs = Array.isArray(profile?.documents) ? profile.documents : [];
    docs = docs.filter(d => d.id !== req.params.docId);
    await prisma.employeeProfile.update({
      where: { userId: req.user.id },
      data: { documents: docs }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// ═══ HR/ADMIN VIEW ═══

// 4. Get all employees' documents
router.get('/all', authMiddleware, authorize(['HR', 'ADMIN']), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'EMPLOYEE' },
      select: {
        id: true, name: true, employeeId: true, department: true,
        employeeProfile: { select: { documents: true } }
      }
    });
    const result = users.map(u => ({
      ...u,
      documents: Array.isArray(u.employeeProfile?.documents) ? u.employeeProfile.documents : []
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch all documents' });
  }
});

// 5. Send document request (creates notification)
router.post('/request', authMiddleware, authorize(['HR', 'ADMIN']), async (req, res) => {
  try {
    const { userId, documentName, message } = req.body;
    await prisma.notification.create({
      data: {
        userId: parseInt(userId),
        type: 'document_request',
        title: `Document Required: ${documentName}`,
        message: message || `HR has requested you to upload: ${documentName}`,
        link: '/dashboard/documents'
      }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send request' });
  }
});

// ═══ COMPANY POLICIES ═══

// 6. Get company policies (stored as system-level docs)
router.get('/policies', authMiddleware, async (req, res) => {
  try {
    const policies = [
      { id: 'p1', name: 'Employee Handbook 2026', category: 'company', type: 'pdf', size: '2.4 MB', uploadedAt: '2026-01-01', status: 'active' },
      { id: 'p2', name: 'Code of Conduct', category: 'company', type: 'pdf', size: '890 KB', uploadedAt: '2025-12-15', status: 'active' },
      { id: 'p3', name: 'Work From Home Policy', category: 'company', type: 'pdf', size: '450 KB', uploadedAt: '2026-02-01', status: 'active' },
      { id: 'p4', name: 'IT Security Guidelines', category: 'company', type: 'pdf', size: '1.1 MB', uploadedAt: '2026-01-20', status: 'active' },
      { id: 'p5', name: 'Anti-Harassment Policy', category: 'company', type: 'pdf', size: '680 KB', uploadedAt: '2025-11-01', status: 'active' },
      { id: 'p6', name: 'Travel & Expense Policy', category: 'company', type: 'pdf', size: '520 KB', uploadedAt: '2026-01-10', status: 'active' },
    ];
    res.json(policies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

// ═══ GENERATE SHARE LINK ═══
router.post('/:docId/share', authMiddleware, async (req, res) => {
  try {
    const token = `share_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    res.json({ shareLink: `/documents/shared/${token}`, expiresAt });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate share link' });
  }
});

// Helper functions
function autoCategory(filename) {
  const f = filename.toLowerCase();
  if (f.includes('offer') || f.includes('appointment') || f.includes('confirmation') || f.includes('increment')) return 'company';
  if (f.includes('aadhar') || f.includes('pan') || f.includes('passport') || f.includes('id proof') || f.includes('license')) return 'personal';
  if (f.includes('form 16') || f.includes('tax') || f.includes('investment')) return 'tax';
  if (f.includes('payslip') || f.includes('salary')) return 'payslips';
  if (f.includes('degree') || f.includes('certificate') || f.includes('marksheet')) return 'personal';
  return 'company';
}

function detectType(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['pdf'].includes(ext)) return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  if (['doc', 'docx'].includes(ext)) return 'doc';
  if (['xls', 'xlsx'].includes(ext)) return 'excel';
  return 'pdf';
}

export default router;
