import express from 'express';
const router = express.Router();
import prisma from '../prismaClient.js';
import { authMiddleware, authorize } from '../middleware/authMiddleware.js';

// 1. Get all announcements (filtered for user's role)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: [{ pinned: 'desc' }, { postedAt: 'desc' }],
      include: { postedBy: { select: { name: true, role: true } } }
    });

    // Filter: show only those targeting user's role or 'All'
    const userRole = req.user.role;
    const filtered = announcements.filter(a => {
      if (!a.targetRoles || a.targetRoles.length === 0) return true;
      return a.targetRoles.includes(userRole) || a.targetRoles.includes('ALL');
    });

    // Filter expired
    const now = new Date();
    const active = filtered.filter(a => !a.expiresAt || new Date(a.expiresAt) > now);
    // Filter scheduled (only show if scheduledAt is past)
    const visible = active.filter(a => !a.scheduledAt || new Date(a.scheduledAt) <= now);

    res.json(visible);
  } catch (error) {
    console.error('Fetch announcements error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// 2. Create announcement (HR/Admin)
router.post('/', authMiddleware, authorize(['HR', 'ADMIN']), async (req, res) => {
  try {
    const { title, content, type, category, targetRoles, targetDept, expiresAt, scheduledAt, pinned } = req.body;
    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        type: type || 'GENERAL',
        category: category || 'General',
        postedById: req.user.id,
        targetRoles: targetRoles || ['ALL'],
        targetDept: targetDept || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        pinned: pinned || false,
        readBy: []
      },
      include: { postedBy: { select: { name: true } } }
    });

    // Create notification for targeted users
    const whereClause = {};
    if (targetRoles && !targetRoles.includes('ALL')) {
      whereClause.role = { in: targetRoles };
    }
    if (targetDept) {
      whereClause.department = targetDept;
    }
    const targetUsers = await prisma.user.findMany({ where: whereClause, select: { id: true } });
    
    if (targetUsers.length > 0) {
      await prisma.notification.createMany({
        data: targetUsers.map(u => ({
          userId: u.id,
          type: 'announcement',
          title: `New Announcement: ${title}`,
          message: type === 'URGENT' ? `🚨 URGENT: ${title}` : title,
          link: '/dashboard/announcements',
          metadata: { announcementId: announcement.id }
        }))
      });
    }

    res.status(201).json(announcement);
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// 3. Mark as read
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const ann = await prisma.announcement.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!ann) return res.status(404).json({ error: 'Not found' });

    const readBy = Array.isArray(ann.readBy) ? ann.readBy : [];
    if (!readBy.includes(req.user.id)) {
      readBy.push(req.user.id);
      await prisma.announcement.update({
        where: { id: ann.id },
        data: { readBy }
      });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// 4. Delete announcement (HR/Admin)
router.delete('/:id', authMiddleware, authorize(['HR', 'ADMIN']), async (req, res) => {
  try {
    await prisma.announcement.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

// 5. Toggle pin
router.patch('/:id/pin', authMiddleware, authorize(['HR', 'ADMIN']), async (req, res) => {
  try {
    const ann = await prisma.announcement.findUnique({ where: { id: parseInt(req.params.id) } });
    await prisma.announcement.update({
      where: { id: ann.id },
      data: { pinned: !ann.pinned }
    });
    res.json({ success: true, pinned: !ann.pinned });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle pin' });
  }
});

export default router;
