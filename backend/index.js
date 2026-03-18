import './loadEnv.js';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import prisma from './prismaClient.js';

// Routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import attendanceRoutes from './routes/attendance.js';
import leaveRoutes from './routes/leaves.js';
import chatRoutes from './routes/chat.js';
import projectRoutes from './routes/projects.js';
import analyticsRoutes from './routes/analytics.js';
import payrollRoutes from './routes/payroll.js';
import settingsRoutes from './routes/settings.js';
import performanceRoutes from './routes/performance.js';
import announcementRoutes from './routes/announcements.js';
import notificationRoutes from './routes/notifications.js';
import documentRoutes from './routes/documents.js';
import reportRoutes from './routes/reports.js';
import aiRoutes from './routes/ai.js';
import './automation.js'; // Initialize cron jobs
import careersRoutes from './routes/careers.js';



const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // In production, replace with your frontend URL
    methods: ['GET', 'POST']
  }
});


const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/admin/settings', settingsRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/careers', careersRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Socket.io logic
app.set('io', io); // Expose io to route handlers via req.app.get('io')
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Join user-specific notification room
  socket.on('join_notifications', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined notification room`);
  });

  socket.on('join_chat', () => {
    socket.join('company_chat');
    console.log(`User ${socket.id} joined company_chat`);
  });

  // Join role-based room for career notifications
  socket.on('join_role', (role) => {
    if (role === 'HR' || role === 'ADMIN') {
      socket.join('hr_admin_room');
      console.log(`${socket.id} joined hr_admin_room (${role})`);
    }
  });

  socket.on('send_message', async (data) => {
    try {
      const { text, senderId } = data;
      const newMessage = await prisma.chatMessage.create({
        data: { text, senderId },
        include: { sender: { select: { name: true } } }
      });
      io.to('company_chat').emit('receive_message', newMessage);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Export io for use in routes
export { io };

// POST /api/contact — save a contact form submission
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    const contact = await prisma.contact.create({
      data: { name, email, message },
    });
    res.status(201).json({ success: true, data: contact });
  } catch (error) {
    console.error('Error saving contact:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});
