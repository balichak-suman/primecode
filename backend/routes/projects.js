import express from 'express';
import prisma from '../prismaClient.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all projects with tasks
router.get('/', authMiddleware, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        tasks: {
          orderBy: { position: 'asc' }
        },
        members: {
          select: { id: true, name: true }
        }
      }
    });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Update task status and position (Kanban move)
router.patch('/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, position } = req.body;
    
    const updatedTask = await prisma.task.update({
      where: { id: parseInt(id) },
      data: { status, position }
    });
    
    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Create new task
router.post('/tasks', authMiddleware, async (req, res) => {
  try {
    const { projectId, title, description, assignedTo, status } = req.body;
    
    // Get max position for this status to append at the end
    const lastTask = await prisma.task.findFirst({
      where: { projectId, status },
      orderBy: { position: 'desc' }
    });
    
    const position = lastTask ? lastTask.position + 1 : 0;

    const newTask = await prisma.task.create({
      data: {
        projectId,
        title,
        description,
        assignedTo,
        status,
        position
      }
    });
    
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

export default router;
