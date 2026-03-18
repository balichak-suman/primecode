import express from 'express';
import multer from 'multer';
import path from 'path';
import { body, query, validationResult } from 'express-validator';
import nodemailer from 'nodemailer';
import prisma from '../prismaClient.js';
import { authenticateToken, checkRole, activityLogger } from '../middleware/authMiddleware.js';

const router = express.Router();

// ─────────────────────────────────────────────
// MULTER SETUP — Resume upload
// ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/resumes/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname);
    cb(null, `resume-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ─────────────────────────────────────────────
// NODEMAILER TRANSPORTER
// ─────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const HR_EMAIL = process.env.HR_EMAIL || 'hr@primecode.tech';

// ─────────────────────────────────────────────
// HELPER: validation error response
// ─────────────────────────────────────────────
const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return null;
};

// ═══════════════════════════════════════════════
//  PUBLIC ROUTES (no auth required)
// ═══════════════════════════════════════════════

// GET /api/careers/jobs — Public: list active jobs
router.get('/jobs', async (req, res) => {
  try {
    const { department, type, search } = req.query;

    const where = { status: 'ACTIVE' };
    if (department && department !== 'All') where.department = department;
    if (type && type !== 'All') where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [jobs, total] = await Promise.all([
      prisma.jobPosting.findMany({
        where,
        orderBy: { postedAt: 'desc' },
        select: {
          id: true, title: true, department: true, type: true,
          location: true, experience: true, salary: true, description: true,
          responsibilities: true, requirements: true, niceToHave: true, perks: true,
          status: true, postedAt: true, closingDate: true, applicationCount: true,
        }
      }),
      prisma.jobPosting.count({ where })
    ]);

    res.json({ jobs, total });
  } catch (error) {
    console.error('GET /careers/jobs error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET /api/careers/departments — unique departments from active jobs
router.get('/departments', async (req, res) => {
  try {
    const jobs = await prisma.jobPosting.findMany({
      where: { status: 'ACTIVE' },
      select: { department: true },
      distinct: ['department']
    });
    res.json(jobs.map(j => j.department));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// POST /api/careers/apply — Public: submit job application
router.post('/apply',
  upload.single('resume'),
  [
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').matches(/^\d{10}$/).withMessage('Valid 10-digit phone number is required'),
    body('experience').trim().notEmpty().withMessage('Experience is required'),
    body('jobId').isInt({ min: 1 }).withMessage('Valid job ID is required'),
  ],
  async (req, res) => {
    try {
      const valErr = validate(req, res);
      if (valErr) return;

      const {
        fullName, email, phone, jobId, jobTitle, department,
        currentRole, currentCompany, experience, linkedIn, portfolio, coverLetter
      } = req.body;

      const parsedJobId = parseInt(jobId);

      // Verify job exists and is active
      const job = await prisma.jobPosting.findFirst({
        where: { id: parsedJobId, status: 'ACTIVE' }
      });
      if (!job) {
        return res.status(404).json({ error: 'Job posting not found or no longer active' });
      }

      // Build resume info
      const resumeUrl = req.file ? `/uploads/resumes/${req.file.filename}` : null;
      const resumeOriginalName = req.file ? req.file.originalname : null;

      // Save application
      const application = await prisma.jobApplication.create({
        data: {
          jobId: parsedJobId,
          jobTitle: jobTitle || job.title,
          department: department || job.department,
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone,
          currentRole: currentRole || null,
          currentCompany: currentCompany || null,
          experience,
          linkedIn: linkedIn || null,
          portfolio: portfolio || null,
          coverLetter: coverLetter || null,
          resumeUrl,
          resumeOriginalName,
        }
      });

      // Increment application count on job posting
      await prisma.jobPosting.update({
        where: { id: parsedJobId },
        data: { applicationCount: { increment: 1 } }
      });

      console.log(`[CAREERS] New application #${application.id}: ${fullName} for ${job.title} (${email})`);

      // Socket.io real-time notification to HR/Admin
      try {
        const io = req.app.get('io');
        if (io) {
          io.to('hr_admin_room').emit('new_notification', {
            type: 'new_application',
            message: `${fullName.trim()} applied for ${job.title}`,
            link: '/dashboard/jobs',
            applicationId: application.id,
            timestamp: new Date().toISOString()
          });
        }
        // Persist notification for HR/Admin users
        const hrAdmins = await prisma.user.findMany({
          where: { role: { in: ['HR', 'ADMIN'] } },
          select: { id: true }
        });
        for (const u of hrAdmins) {
          await prisma.notification.create({
            data: {
              userId: u.id,
              title: 'New Job Application',
              message: `${fullName.trim()} applied for ${job.title}`,
              type: 'CAREER',
              link: '/dashboard/jobs'
            }
          }).catch(() => {});
        }
      } catch (socketErr) {
        console.error('[CAREERS] Socket notification error:', socketErr.message);
      }

      // Send confirmation email to applicant (non-blocking)
      if (process.env.SMTP_USER) {
        transporter.sendMail({
          from: `"PrimeCode Careers" <${process.env.SMTP_USER}>`,
          to: email,
          subject: `Application Received — ${job.title} at PrimeCode`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:2rem;border-radius:12px;border:1px solid rgba(0,210,255,0.2)">
              <h2 style="color:#00D2FF;margin-top:0">Application Received ✓</h2>
              <p>Hi <strong>${fullName}</strong>,</p>
              <p>Thank you for applying for <strong style="color:#00D2FF">${job.title}</strong> at PrimeCode Solutions.</p>
              <p>We have received your application and our team will review it within <strong>5–7 business days</strong>. If your profile matches our requirements, we'll reach out for next steps.</p>
              <div style="padding:1rem;background:rgba(0,210,255,0.05);border:1px solid rgba(0,210,255,0.1);border-radius:8px;margin:1rem 0">
                <p style="margin:0;font-size:0.9rem"><strong>Position:</strong> ${job.title}</p>
                <p style="margin:4px 0 0;font-size:0.9rem"><strong>Department:</strong> ${job.department}</p>
                <p style="margin:4px 0 0;font-size:0.9rem"><strong>Application ID:</strong> #${application.id}</p>
              </div>
              <p style="opacity:0.6;font-size:0.85rem">Best regards,<br>PrimeCode Hiring Team</p>
            </div>
          `
        }).catch(err => console.error('[CAREERS] Applicant email error:', err.message));

        // Send notification to HR team
        transporter.sendMail({
          from: `"PrimeCode Careers" <${process.env.SMTP_USER}>`,
          to: HR_EMAIL,
          subject: `New Application: ${fullName} for ${job.title}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:1.5rem">
              <h2>📋 New Job Application</h2>
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:6px 12px;font-weight:bold;width:140px">Name</td><td>${fullName}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold">Email</td><td>${email}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold">Phone</td><td>${phone}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold">Position</td><td>${job.title}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold">Department</td><td>${job.department}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold">Experience</td><td>${experience}</td></tr>
                ${currentRole ? `<tr><td style="padding:6px 12px;font-weight:bold">Current Role</td><td>${currentRole}</td></tr>` : ''}
                ${currentCompany ? `<tr><td style="padding:6px 12px;font-weight:bold">Company</td><td>${currentCompany}</td></tr>` : ''}
                ${linkedIn ? `<tr><td style="padding:6px 12px;font-weight:bold">LinkedIn</td><td><a href="${linkedIn}">${linkedIn}</a></td></tr>` : ''}
              </table>
              <p style="margin-top:1rem;font-size:0.85rem;opacity:0.6">Application #${application.id} · ${new Date().toLocaleDateString()}</p>
            </div>
          `
        }).catch(err => console.error('[CAREERS] HR notification email error:', err.message));
      } else {
        console.warn('[CAREERS] SMTP not configured — skipping emails');
      }

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully',
        applicationId: application.id
      });
    } catch (error) {
      console.error('POST /careers/apply error:', error);
      if (error.message?.includes('Only PDF')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to submit application' });
    }
  }
);

// ═══════════════════════════════════════════════
//  PROTECTED ADMIN ROUTES (HR/Admin only)
// ═══════════════════════════════════════════════
const adminAuth = [authenticateToken, checkRole(['ADMIN', 'HR']), activityLogger];

// GET /api/careers/admin/jobs — All jobs (all statuses)
router.get('/admin/jobs', adminAuth, async (req, res) => {
  try {
    const { status, department } = req.query;
    const where = {};
    if (status) where.status = status.toUpperCase();
    if (department) where.department = department;

    const jobs = await prisma.jobPosting.findMany({
      where,
      orderBy: { postedAt: 'desc' },
      include: {
        poster: { select: { id: true, name: true, email: true } },
        _count: { select: { applications: true } }
      }
    });

    res.json({
      jobs: jobs.map(j => ({
        ...j,
        applicationCount: j._count.applications,
        _count: undefined
      })),
      total: jobs.length
    });
  } catch (error) {
    console.error('GET /careers/admin/jobs error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// POST /api/careers/admin/jobs — Create new job posting
router.post('/admin/jobs', adminAuth,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('department').trim().notEmpty().withMessage('Department is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('type').isIn(['Full-time', 'Part-time', 'Contract', 'Remote', 'Internship']).withMessage('Invalid job type'),
  ],
  async (req, res) => {
    try {
      const valErr = validate(req, res);
      if (valErr) return;

      const {
        title, department, type, location, experience, salary,
        description, responsibilities, requirements, niceToHave, perks,
        closingDate
      } = req.body;

      const job = await prisma.jobPosting.create({
        data: {
          title, department, type,
          location: location || null,
          experience: experience || null,
          salary: salary || null,
          description,
          responsibilities: responsibilities || [],
          requirements: requirements || [],
          niceToHave: niceToHave || [],
          perks: perks || [],
          postedBy: req.user.id,
          closingDate: closingDate ? new Date(closingDate) : null,
        }
      });

      console.log(`[CAREERS] Job created: "${title}" by ${req.user.name}`);
      res.status(201).json(job);
    } catch (error) {
      console.error('POST /careers/admin/jobs error:', error);
      res.status(500).json({ error: 'Failed to create job posting' });
    }
  }
);

// PUT /api/careers/admin/jobs/:id — Update job posting
router.put('/admin/jobs/:id', adminAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.jobPosting.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Job not found' });

    const {
      title, department, type, location, experience, salary,
      description, responsibilities, requirements, niceToHave, perks,
      status, closingDate
    } = req.body;

    const data = {};
    if (title !== undefined) data.title = title;
    if (department !== undefined) data.department = department;
    if (type !== undefined) data.type = type;
    if (location !== undefined) data.location = location;
    if (experience !== undefined) data.experience = experience;
    if (salary !== undefined) data.salary = salary;
    if (description !== undefined) data.description = description;
    if (responsibilities !== undefined) data.responsibilities = responsibilities;
    if (requirements !== undefined) data.requirements = requirements;
    if (niceToHave !== undefined) data.niceToHave = niceToHave;
    if (perks !== undefined) data.perks = perks;
    if (status !== undefined) data.status = status.toUpperCase();
    if (closingDate !== undefined) data.closingDate = closingDate ? new Date(closingDate) : null;

    const updated = await prisma.jobPosting.update({ where: { id }, data });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        method: 'PUT',
        url: `/api/careers/admin/jobs/${id}`,
        ip: req.ip || 'unknown'
      }
    });

    console.log(`[CAREERS] Job #${id} updated by ${req.user.name}`);
    res.json(updated);
  } catch (error) {
    console.error('PUT /careers/admin/jobs error:', error);
    res.status(500).json({ error: 'Failed to update job posting' });
  }
});

// DELETE /api/careers/admin/jobs/:id — Soft delete (set status to CLOSED)
router.delete('/admin/jobs/:id', adminAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.jobPosting.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Job not found' });

    await prisma.jobPosting.update({
      where: { id },
      data: { status: 'CLOSED' }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        method: 'DELETE',
        url: `/api/careers/admin/jobs/${id}`,
        ip: req.ip || 'unknown'
      }
    });

    console.log(`[CAREERS] Job #${id} closed by ${req.user.name}`);
    res.json({ success: true, message: 'Job posting closed' });
  } catch (error) {
    console.error('DELETE /careers/admin/jobs error:', error);
    res.status(500).json({ error: 'Failed to close job posting' });
  }
});

// GET /api/careers/admin/applications — All applications with filters
router.get('/admin/applications', adminAuth, async (req, res) => {
  try {
    const { jobId, status, department } = req.query;
    const where = {};
    if (jobId) where.jobId = parseInt(jobId);
    if (status) where.status = status.toUpperCase();
    if (department) where.department = department;

    const applications = await prisma.jobApplication.findMany({
      where,
      orderBy: { appliedAt: 'desc' },
      include: {
        job: { select: { id: true, title: true, department: true, type: true } },
        reviewer: { select: { id: true, name: true } }
      }
    });

    res.json({ applications, total: applications.length });
  } catch (error) {
    console.error('GET /careers/admin/applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// GET /api/careers/admin/applications/:id — Single application details
router.get('/admin/applications/:id', adminAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const application = await prisma.jobApplication.findUnique({
      where: { id },
      include: {
        job: { select: { id: true, title: true, department: true, type: true, location: true } },
        reviewer: { select: { id: true, name: true, email: true } }
      }
    });

    if (!application) return res.status(404).json({ error: 'Application not found' });

    // Include full resume download URL
    const result = {
      ...application,
      resumeDownloadUrl: application.resumeUrl
        ? `${req.protocol}://${req.get('host')}${application.resumeUrl}`
        : null
    };

    res.json(result);
  } catch (error) {
    console.error('GET /careers/admin/applications/:id error:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// PATCH /api/careers/admin/applications/:id/status — Update application status
router.patch('/admin/applications/:id/status', adminAuth,
  [
    body('status').isIn(['NEW', 'REVIEWED', 'SHORTLISTED', 'INTERVIEWED', 'OFFERED', 'REJECTED', 'WITHDRAWN'])
      .withMessage('Invalid application status'),
  ],
  async (req, res) => {
    try {
      const valErr = validate(req, res);
      if (valErr) return;

      const id = parseInt(req.params.id);
      const { status, reviewNotes, rating } = req.body;

      const existing = await prisma.jobApplication.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: 'Application not found' });

      const data = {
        status: status.toUpperCase(),
        reviewedBy: req.user.id,
      };
      if (reviewNotes !== undefined) data.reviewNotes = reviewNotes;
      if (rating !== undefined && rating >= 1 && rating <= 5) data.rating = parseInt(rating);

      const updated = await prisma.jobApplication.update({ where: { id }, data });

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          method: 'PATCH',
          url: `/api/careers/admin/applications/${id}/status`,
          ip: req.ip || 'unknown'
        }
      });

      console.log(`[CAREERS] Application #${id} → ${status} by ${req.user.name}`);
      res.json(updated);
    } catch (error) {
      console.error('PATCH /careers/admin/applications/:id/status error:', error);
      res.status(500).json({ error: 'Failed to update application status' });
    }
  }
);

// Multer error handler
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 5MB limit' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

export default router;
