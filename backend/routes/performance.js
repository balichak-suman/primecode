import express from 'express';
const router = express.Router();
import prisma from '../prismaClient.js';
import { authMiddleware, authorize } from '../middleware/authMiddleware.js';

// 1. Fetch user's goals
router.get('/goals', authMiddleware, async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(goals);
  } catch (error) {
    console.error('Fetch goals error:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// 2. Create a new goal
router.post('/goals', authMiddleware, async (req, res) => {
  try {
    const { title, description, target, dueDate, visibility, alignment } = req.body;
    const goal = await prisma.goal.create({
      data: {
        userId: req.user.id,
        title,
        description,
        target: parseFloat(target) || 100,
        current: 0,
        dueDate: dueDate ? new Date(dueDate) : null,
        visibility: visibility || 'PUBLIC',
        alignment
      }
    });
    res.status(201).json(goal);
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// 3. Update goal progress
router.patch('/goals/:id', authMiddleware, async (req, res) => {
  try {
    const { current, status } = req.body;
    const goal = await prisma.goal.update({
      where: { id: parseInt(req.params.id), userId: req.user.id },
      data: { 
        current: parseFloat(current),
        ...(status && { status })
      }
    });
    res.json(goal);
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// 4. Fetch active/pending review
router.get('/reviews/active', authMiddleware, async (req, res) => {
  try {
    const review = await prisma.performanceReview.findFirst({
      where: { 
        userId: req.user.id,
        status: { in: ['DRAFT', 'SUBMITTED'] }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(review);
  } catch (error) {
    console.error('Fetch active review error:', error);
    res.status(500).json({ error: 'Failed to fetch review' });
  }
});

// 5. Submit self-appraisal
router.post('/reviews/submit-self', authMiddleware, async (req, res) => {
  try {
    const { reviewId, selfAssessment } = req.body;
    const review = await prisma.performanceReview.update({
      where: { id: reviewId, userId: req.user.id },
      data: {
        selfAssessment,
        status: 'SUBMITTED',
        lastUpdated: new Date()
      }
    });
    res.json(review);
  } catch (error) {
    console.error('Submit self appraisal error:', error);
    res.status(500).json({ error: 'Failed to submit appraisal' });
  }
});

// 6. (Manager) Get team reviews
router.get('/reviews/team', authMiddleware, authorize(['ADMIN', 'HR']), async (req, res) => {
  try {
    const reviews = await prisma.performanceReview.findMany({
      where: { status: 'SUBMITTED' },
      include: {
        user: { select: { name: true, employeeId: true, department: true, designation: true } }
      }
    });
    res.json(reviews);
  } catch (error) {
    console.error('Fetch team reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch team reviews' });
  }
});

// 7. (Manager) Submit manager review
router.post('/reviews/submit-manager', authMiddleware, authorize(['ADMIN', 'HR']), async (req, res) => {
  try {
    const { reviewId, managerAssessment, overallRating } = req.body;
    const review = await prisma.performanceReview.update({
      where: { id: reviewId },
      data: {
        managerAssessment,
        overallRating: parseFloat(overallRating),
        reviewedById: req.user.id,
        status: 'FINAL',
        lastUpdated: new Date()
      }
    });
    res.json(review);
  } catch (error) {
    console.error('Submit manager review error:', error);
    res.status(500).json({ error: 'Failed to submit manager review' });
  }
});

// 8. Analytics distribution
router.get('/analytics/distribution', authMiddleware, authorize(['ADMIN']), async (req, res) => {
  try {
    const reviews = await prisma.performanceReview.findMany({
      where: { status: 'FINAL' },
      select: { overallRating: true, user: { select: { department: true } } }
    });
    res.json(reviews);
  } catch (error) {
    console.error('Distribution analytics error:', error);
    res.status(500).json({ error: 'Failed to calculate analytics' });
  }
});

export default router;
