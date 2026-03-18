import express from 'express';
import prisma from '../prismaClient.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get chat history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const messages = await prisma.chatMessage.findMany({
      orderBy: { createdAt: 'asc' },
      take: 50,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

export default router;
