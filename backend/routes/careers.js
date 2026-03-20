import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { body, query, validationResult } from 'express-validator';
import nodemailer from 'nodemailer';
import prisma from '../prismaClient.js';
import { authenticateToken, checkRole, activityLogger } from '../middleware/authMiddleware.js';

const router = express.Router();

// ─────────────────────────────────────────────
// MULTER SETUP — Resume upload
// ─────────────────────────────────────────────
// Ensure upload directory exists before starting multer
const uploadDir = 'uploads/resumes';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

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
// BREVO EMAIL SETUP
// ─────────────────────────────────────────────
import axios from 'axios';
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'prime.code@yahoo.com';
const HR_EMAILS = [
  'prime.code@yahoo.com',
  'balichaksumann@gmail.com'
];

const sendBrevoEmail = async (to, subject, htmlContent) => {
  try {
    const toArray = Array.isArray(to) ? to.map(e => ({ email: e })) : [{ email: to }];
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: 'PrimeCode Careers', email: SENDER_EMAIL },
        to: toArray,
        subject,
        htmlContent,
      },
      {
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    console.error('[CAREERS] Brevo Email Error:', err.response?.data || err.message);
  }
};

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
        currentRole, currentCompany, experience, linkedIn, portfolio, coverLetter,
        college, graduationYear, academicBranch
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
          college: college || null,
          graduationYear: graduationYear || null,
          academicBranch: academicBranch || null,
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
          }).catch(() => { });
        }
      } catch (socketErr) {
        console.error('[CAREERS] Socket notification error:', socketErr.message);
      }

      // Send confirmation email to applicant (non-blocking)
      await sendBrevoEmail(
        email,
        `Application Received — ${job.title} at PrimeCode`,
        `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:2rem;border-radius:12px;border:1px solid rgba(0,210,255,0.2)">
            <h2 style="color:#00D2FF;margin-top:0">Application Received ✓</h2>
            <p>Hi <strong>${fullName}</strong>,</p>
            <p>Thank you for applying for <strong style="color:#00D2FF">${job.title}</strong> at PrimeCode.</p>
            <p>We have received your application and our team will review it within <strong>5–7 business days</strong>. If your profile matches our requirements, we'll reach out for next steps.</p>
            <div style="padding:1rem;background:rgba(0,210,255,0.05);border:1px solid rgba(0,210,255,0.1);border-radius:8px;margin:1rem 0">
              <p style="margin:0;font-size:0.9rem"><strong>Position:</strong> ${job.title}</p>
              <p style="margin:4px 0 0;font-size:0.9rem"><strong>Department:</strong> ${job.department}</p>
              <p style="margin:4px 0 0;font-size:0.9rem"><strong>Application ID:</strong> #${application.id}</p>
            </div>
            <p style="opacity:0.6;font-size:0.85rem">Best regards,<br>PrimeCode Hiring Team</p>
          </div>
        `
      );

      // Send notification to HR team
      await sendBrevoEmail(
        HR_EMAILS,
        `New Application: ${fullName} for ${job.title}`,
        `
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
      );

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
        servicePeriod, closingDate
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
          servicePeriod: servicePeriod || null,
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
      servicePeriod, status, closingDate
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
    if (servicePeriod !== undefined) data.servicePeriod = servicePeriod;
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

// DELETE /api/careers/admin/jobs/:id/hard — Hard delete (remove job and applications)
router.delete('/admin/jobs/:id/hard', adminAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.jobPosting.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Job not found' });

    // Delete associated applications first due to foreign key constraints
    await prisma.jobApplication.deleteMany({
      where: { jobId: id }
    });

    // Delete the job posting
    await prisma.jobPosting.delete({
      where: { id }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        method: 'DELETE',
        url: `/api/careers/admin/jobs/${id}/hard`,
        ip: req.ip || 'unknown',
        details: { action: 'hard_delete', jobTitle: existing.title }
      }
    });

    console.log(`[CAREERS] Job #${id} and applications HARD DELETED by ${req.user.name}`);
    res.json({ success: true, message: 'Job posting deleted permanently' });
  } catch (error) {
    console.error('DELETE /careers/admin/jobs/:id/hard error:', error);
    res.status(500).json({ error: 'Failed to delete job posting' });
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

// ─────────────────────────────────────────────
// POST /api/careers/schedule-interview — Send interview invite email
// ─────────────────────────────────────────────
router.post(
  '/schedule-interview',
  authenticateToken,
  checkRole('ADMIN', 'HR'),
  async (req, res) => {
    try {
      const { applicationId, interviewDate, interviewTime, interviewLink } = req.body;

      if (!applicationId || !interviewDate || !interviewTime || !interviewLink) {
        return res.status(400).json({ error: 'All fields are required: applicationId, interviewDate, interviewTime, interviewLink' });
      }

      // Fetch the application
      const application = await prisma.jobApplication.findUnique({
        where: { id: parseInt(applicationId) }
      });

      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      // Update the application with interview details
      const updated = await prisma.jobApplication.update({
        where: { id: parseInt(applicationId) },
        data: {
          interviewDate,
          interviewTime,
          interviewLink,
          interviewStatus: 'SCHEDULED',
          status: 'INTERVIEW'
        }
      });

      // Format the date nicely
      const dateObj = new Date(interviewDate + 'T00:00:00');
      const formattedDate = dateObj.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Send professional interview email to candidate
      const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0; padding:0; background:#0a0a0a; font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a; padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background:#111; border-radius:16px; border:1px solid rgba(0,210,255,0.15); overflow:hidden;">
                
                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(135deg, rgba(0,210,255,0.1), rgba(121,40,202,0.1)); padding:32px 40px; text-align:center; border-bottom:1px solid rgba(0,210,255,0.1);">
                    <h1 style="margin:0; font-size:24px; font-weight:800; color:#00D2FF; letter-spacing:2px;">PRIMECODE</h1>
                    <p style="margin:8px 0 0; color:rgba(255,255,255,0.5); font-size:13px; letter-spacing:1px;">INTERVIEW INVITATION</p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:40px;">
                    <p style="color:rgba(255,255,255,0.85); font-size:16px; line-height:1.6; margin:0 0 24px;">
                      Hi <strong style="color:#fff;">${application.fullName}</strong>,
                    </p>
                    <p style="color:rgba(255,255,255,0.7); font-size:15px; line-height:1.7; margin:0 0 32px;">
                      We're excited to move forward with your application for <strong style="color:#00D2FF;">${application.jobTitle || 'the open position'}</strong>! We'd like to invite you for an interview.
                    </p>

                    <!-- Interview Details Card -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(0,210,255,0.04); border:1px solid rgba(0,210,255,0.12); border-radius:12px; margin-bottom:32px;">
                      <tr>
                        <td style="padding:24px 28px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding:8px 0;">
                                <span style="color:rgba(255,255,255,0.4); font-size:12px; text-transform:uppercase; letter-spacing:1px;">📅 Date</span><br/>
                                <span style="color:#fff; font-size:16px; font-weight:600;">${formattedDate}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:8px 0; border-top:1px solid rgba(255,255,255,0.06);">
                                <span style="color:rgba(255,255,255,0.4); font-size:12px; text-transform:uppercase; letter-spacing:1px;">🕐 Time</span><br/>
                                <span style="color:#fff; font-size:16px; font-weight:600;">${interviewTime} IST</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:8px 0; border-top:1px solid rgba(255,255,255,0.06);">
                                <span style="color:rgba(255,255,255,0.4); font-size:12px; text-transform:uppercase; letter-spacing:1px;">💼 Position</span><br/>
                                <span style="color:#fff; font-size:16px; font-weight:600;">${application.jobTitle || 'Open Position'}${application.department ? ' — ' + application.department : ''}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Join Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding:0 0 32px;">
                          <a href="${interviewLink}" target="_blank" style="display:inline-block; background:linear-gradient(135deg, #00D2FF, #7928CA); color:#fff; font-size:16px; font-weight:700; text-decoration:none; padding:14px 40px; border-radius:10px; letter-spacing:0.5px;">
                            🔗 Join Interview
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="color:rgba(255,255,255,0.5); font-size:13px; line-height:1.6; margin:0;">
                      Please ensure you join the meeting a few minutes early. If you have any questions or need to reschedule, please reply to this email.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:20px 40px; border-top:1px solid rgba(255,255,255,0.06); text-align:center;">
                    <p style="margin:0; color:rgba(255,255,255,0.3); font-size:12px;">
                      Best regards,<br/><strong style="color:rgba(255,255,255,0.5);">PrimeCode HR Team</strong>
                    </p>
                    <p style="margin:12px 0 0; color:rgba(255,255,255,0.2); font-size:11px;">
                      © ${new Date().getFullYear()} PrimeCode Solutions. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
      `;

      await sendBrevoEmail(
        application.email,
        `Interview Scheduled – ${application.jobTitle || 'Open Position'} at PrimeCode`,
        emailHtml
      );

      console.log(`[CAREERS] Interview scheduled for application #${applicationId} → ${application.email} by ${req.user.name}`);
      res.json({ success: true, application: updated });
    } catch (error) {
      console.error('POST /careers/schedule-interview error:', error);
      res.status(500).json({ error: 'Failed to schedule interview' });
    }
  }
);

// ─────────────────────────────────────────────
// POST /api/careers/send-offer — Send offer letter email
// ─────────────────────────────────────────────
router.post(
  '/send-offer',
  authenticateToken,
  checkRole('ADMIN', 'HR'),
  async (req, res) => {
    try {
      const { applicationId, salary, startDate, reportTo, perks, terms } = req.body;

      if (!applicationId || !salary || !startDate) {
        return res.status(400).json({ error: 'applicationId, salary, and startDate are required' });
      }

      const application = await prisma.jobApplication.findUnique({
        where: { id: parseInt(applicationId) }
      });

      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      // Update application status to OFFERED
      const updated = await prisma.jobApplication.update({
        where: { id: parseInt(applicationId) },
        data: { status: 'OFFERED' }
      });

      // Format date
      const dateObj = new Date(startDate + 'T00:00:00');
      const formattedStartDate = dateObj.toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      const today = new Date().toLocaleDateString('en-IN', {
        year: 'numeric', month: 'long', day: 'numeric'
      });

      // Default perks
      const defaultPerks = [
        { icon: '🏠', label: 'Flexible / Hybrid Work' },
        { icon: '🏥', label: 'Health & Wellness' },
        { icon: '📚', label: 'Continuous Learning Fund' },
        { icon: '🏖️', label: '25 Days Paid PTO' }
      ];
      const perksList = perks && perks.length > 0 ? perks : defaultPerks;

      const perksHtml = perksList.map(p => `
        <td style="text-align:center; padding:12px 8px; width:25%;">
          <div style="font-size:24px; margin-bottom:6px;">${p.icon}</div>
          <div style="color:rgba(255,255,255,0.7); font-size:11px; font-weight:600; line-height:1.3;">${p.label}</div>
        </td>
      `).join('');

      const termsText = terms || `Offer acceptance deadline: 7 days from the date of this letter. The company requires completion of background check and professional verification. Please review all terms and conditions before accepting. We look forward to welcoming you to the PrimeCode family.`;

      const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0; padding:0; background:#0a0a0a; font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a; padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="650" cellpadding="0" cellspacing="0" style="background:#111; border-radius:0; overflow:hidden; border:1px solid rgba(0,210,255,0.12);">

                <!-- ═══ HEADER BAR ═══ -->
                <tr>
                  <td style="padding:28px 40px; background:linear-gradient(135deg, #0a0a0a, #111); border-bottom:2px solid #00D2FF;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <img src="https://primecode.in/logo.png" alt="PrimeCode" style="height:36px;" />
                        </td>
                        <td align="right" style="color:rgba(255,255,255,0.4); font-size:11px; letter-spacing:1px;">
                          www.primecode.in<br/>
                          <span style="color:rgba(255,255,255,0.25);">Welcome to the future of tech.</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- ═══ DECORATIVE GEOMETRIC ACCENT ═══ -->
                <tr>
                  <td style="height:6px; background: linear-gradient(90deg, #00D2FF 0%, #7928CA 50%, #00D2FF 100%);"></td>
                </tr>

                <!-- ═══ TITLE ═══ -->
                <tr>
                  <td style="padding:40px 40px 24px;">
                    <h1 style="margin:0 0 8px; font-size:28px; font-weight:800; color:#fff; letter-spacing:1px;">OFFER OF EMPLOYMENT</h1>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:rgba(0,210,255,0.1); border:1px solid rgba(0,210,255,0.2); border-radius:6px; padding:6px 14px;">
                          <span style="color:#00D2FF; font-size:12px; font-weight:600;">${application.fullName}</span>
                        </td>
                        <td style="padding-left:12px;">
                          <span style="color:rgba(255,255,255,0.4); font-size:12px;">Date: ${today}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- ═══ GREETING ═══ -->
                <tr>
                  <td style="padding:0 40px 24px;">
                    <p style="color:rgba(255,255,255,0.85); font-size:15px; line-height:1.7; margin:0;">
                      Dear <strong style="color:#fff;">${application.fullName}</strong>,
                    </p>
                    <p style="color:rgba(255,255,255,0.7); font-size:14px; line-height:1.7; margin:12px 0 0;">
                      Congratulations! We are thrilled to formally offer you the position of <strong style="color:#00D2FF;">${application.jobTitle || 'the open position'}</strong> at 
                      <strong style="color:#fff;">PrimeCode Solutions</strong>. We are impressed by your skills and potential, and we are confident you will be a vital asset to our team.
                    </p>
                  </td>
                </tr>

                <!-- ═══ ROLE OVERVIEW ═══ -->
                <tr>
                  <td style="padding:0 40px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(0,210,255,0.04); border:1px solid rgba(0,210,255,0.1); border-radius:12px;">
                      <tr>
                        <td style="padding:20px 24px;">
                          <div style="display:flex; align-items:center; margin-bottom:14px;">
                            <span style="font-size:18px; margin-right:8px;">📋</span>
                            <span style="color:#00D2FF; font-size:14px; font-weight:700; text-transform:uppercase; letter-spacing:1px;">Role Overview</span>
                          </div>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding:6px 0; color:rgba(255,255,255,0.5); font-size:12px; width:40%;">Department</td>
                              <td style="padding:6px 0; color:#fff; font-size:13px; font-weight:600;">${application.department || 'Engineering'}</td>
                            </tr>
                            <tr>
                              <td style="padding:6px 0; color:rgba(255,255,255,0.5); font-size:12px; border-top:1px solid rgba(255,255,255,0.04);">Report To</td>
                              <td style="padding:6px 0; color:#fff; font-size:13px; font-weight:600; border-top:1px solid rgba(255,255,255,0.04);">${reportTo || 'Team Lead'}</td>
                            </tr>
                            <tr>
                              <td style="padding:6px 0; color:rgba(255,255,255,0.5); font-size:12px; border-top:1px solid rgba(255,255,255,0.04);">Start Date</td>
                              <td style="padding:6px 0; color:#fff; font-size:13px; font-weight:600; border-top:1px solid rgba(255,255,255,0.04);">${formattedStartDate}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- ═══ COMPENSATION ═══ -->
                <tr>
                  <td style="padding:0 40px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(121,40,202,0.06); border:1px solid rgba(121,40,202,0.15); border-radius:12px;">
                      <tr>
                        <td style="padding:20px 24px;">
                          <div style="display:flex; align-items:center; margin-bottom:14px;">
                            <span style="font-size:18px; margin-right:8px;">💰</span>
                            <span style="color:#B06FFF; font-size:14px; font-weight:700; text-transform:uppercase; letter-spacing:1px;">Compensation & Benefits</span>
                          </div>
                          <p style="color:rgba(255,255,255,0.75); font-size:13px; line-height:1.6; margin:0;">
                            <strong style="color:#fff;">Base Salary:</strong> <span style="color:#00D2FF; font-weight:700; font-size:15px;">${salary}</span> per annum, 
                            eligible for annual performance bonus of up to 15% of CTC.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- ═══ KEY PERKS ═══ -->
                <tr>
                  <td style="padding:0 40px 24px;">
                    <div style="margin-bottom:12px;">
                      <span style="font-size:16px; margin-right:6px;">🎁</span>
                      <span style="color:#FFD700; font-size:14px; font-weight:700; text-transform:uppercase; letter-spacing:1px;">Key Perks</span>
                    </div>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,215,0,0.04); border:1px solid rgba(255,215,0,0.1); border-radius:12px;">
                      <tr>
                        ${perksHtml}
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- ═══ TERMS ═══ -->
                <tr>
                  <td style="padding:0 40px 24px;">
                    <div style="margin-bottom:10px;">
                      <span style="font-size:16px; margin-right:6px;">📝</span>
                      <span style="color:rgba(255,255,255,0.6); font-size:14px; font-weight:700; text-transform:uppercase; letter-spacing:1px;">Terms</span>
                    </div>
                    <p style="color:rgba(255,255,255,0.5); font-size:12px; line-height:1.7; margin:0; padding:16px; background:rgba(255,255,255,0.02); border-radius:8px; border:1px solid rgba(255,255,255,0.04);">
                      ${termsText}
                    </p>
                  </td>
                </tr>

                <!-- ═══ ACCEPTANCE ═══ -->
                <tr>
                  <td style="padding:0 40px 32px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:50%; padding-right:12px;">
                          <div style="color:rgba(255,255,255,0.4); font-size:11px; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Acceptance</div>
                          <div style="border-bottom:1px solid rgba(255,255,255,0.15); padding-bottom:8px; margin-bottom:6px; min-height:24px;"></div>
                          <div style="color:rgba(255,255,255,0.5); font-size:11px;">Candidate Signature</div>
                          <div style="color:rgba(255,255,255,0.3); font-size:10px;">Date, Print Name</div>
                        </td>
                        <td style="width:50%; padding-left:12px;">
                          <div style="color:rgba(255,255,255,0.4); font-size:11px; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">PrimeCode Solutions</div>
                          <div style="border-bottom:1px solid rgba(255,255,255,0.15); padding-bottom:8px; margin-bottom:6px; min-height:24px;"></div>
                          <div style="color:rgba(255,255,255,0.5); font-size:11px;">Hiring Manager Signature</div>
                          <div style="color:rgba(255,255,255,0.3); font-size:10px;">Date, Title</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- ═══ FOOTER ═══ -->
                <tr>
                  <td style="background:linear-gradient(135deg, rgba(0,210,255,0.08), rgba(121,40,202,0.08)); padding:20px 40px; border-top:1px solid rgba(0,210,255,0.1);">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <img src="https://primecode.in/logo.png" alt="PrimeCode" style="height:24px; opacity:0.6;" />
                          <div style="color:rgba(255,255,255,0.3); font-size:10px; margin-top:4px;">www.primecode.in</div>
                        </td>
                        <td align="right" style="color:rgba(255,255,255,0.3); font-size:11px; font-style:italic;">
                          Welcome to the future of tech.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
      `;

      await sendBrevoEmail(
        application.email,
        `Offer of Employment – ${application.jobTitle || 'Open Position'} at PrimeCode Solutions`,
        emailHtml
      );

      console.log(`[CAREERS] Offer letter sent for application #${applicationId} → ${application.email} by ${req.user.name}`);
      res.json({ success: true, application: updated });
    } catch (error) {
      console.error('POST /careers/send-offer error:', error);
      res.status(500).json({ error: 'Failed to send offer letter' });
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
