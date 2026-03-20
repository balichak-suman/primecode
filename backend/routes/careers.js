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
// POST /api/careers/send-offer — Send offer letter as PDF
// ─────────────────────────────────────────────
router.post(
  '/send-offer',
  authenticateToken,
  checkRole('ADMIN', 'HR'),
  async (req, res) => {
    try {
      const { applicationId, salary, startDate, reportTo, terms } = req.body;

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

      // Format dates
      const dateObj = new Date(startDate + 'T00:00:00');
      const formattedStartDate = dateObj.toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      const today = new Date().toLocaleDateString('en-IN', {
        year: 'numeric', month: 'long', day: 'numeric'
      });

      const termsText = terms || 'Offer acceptance deadline: 7 days from the date of this letter. The company reserves the right to conduct background checks and professional verification. Please review all terms and conditions before accepting. We look forward to welcoming you to the PrimeCode family.';

      // Read logo and signature as base64
      const logoPath = path.resolve('templates/logo.png');
      const signaturePath = path.resolve('templates/signature.png');
      const logoBase64 = fs.existsSync(logoPath) ? fs.readFileSync(logoPath).toString('base64') : '';
      const signatureBase64 = fs.existsSync(signaturePath) ? fs.readFileSync(signaturePath).toString('base64') : '';
      const logoDataUri = logoBase64 ? `data:image/png;base64,${logoBase64}` : 'https://primecode.in/logo.png';
      const signatureDataUri = signatureBase64 ? `data:image/png;base64,${signatureBase64}` : '';

      // ═══ PDF HTML TEMPLATE ═══
      const pdfHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; background: #fff; color: #1a1a2e; }
          .page { width: 210mm; min-height: 297mm; margin: 0 auto; position: relative; padding: 50px 50px 40px; overflow: hidden; }
          
          /* ═══ GEOMETRIC BORDER DECORATIONS ═══ */
          .geo-top-left { position: absolute; top: 0; left: 0; width: 160px; height: 140px; }
          .geo-top-right { position: absolute; top: 0; right: 0; width: 120px; height: 120px; }
          .geo-bottom-left { position: absolute; bottom: 0; left: 0; width: 140px; height: 100px; }
          .geo-bottom-right { position: absolute; bottom: 0; right: 0; width: 200px; height: 130px; }
          
          .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; position: relative; z-index: 2; }
          .header img { height: 42px; }
          .header-right { text-align: right; font-size: 10px; color: #666; }
          
          h1 { font-size: 28px; font-weight: 800; color: #1a1a2e; letter-spacing: 1px; margin: 20px 0 12px; border-bottom: 3px solid #0891b2; padding-bottom: 8px; display: inline-block; }
          .candidate-info { font-size: 13px; color: #444; margin-bottom: 6px; }
          .greeting { font-size: 14px; line-height: 1.7; color: #333; margin: 16px 0 20px; }
          .greeting strong { color: #0891b2; }
          
          .section-title { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
          .section-title span.icon { font-size: 20px; }
          .section-title span.label { font-size: 15px; font-weight: 700; color: #0891b2; text-transform: uppercase; letter-spacing: 1px; }
          
          .role-card { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px; }
          .role-row { display: flex; padding: 5px 0; font-size: 13px; border-bottom: 1px solid #e0f2fe; }
          .role-row:last-child { border-bottom: none; }
          .role-label { width: 35%; color: #666; font-weight: 600; }
          .role-value { color: #1a1a2e; font-weight: 600; }
          
          .comp-card { background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px; }
          .comp-card .salary { color: #0891b2; font-weight: 700; font-size: 16px; }
          
          .perks-grid { display: flex; gap: 12px; margin-bottom: 20px; }
          .perk-box { flex: 1; text-align: center; background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 10px; padding: 14px 8px; }
          .perk-box .perk-icon { font-size: 26px; margin-bottom: 6px; }
          .perk-box .perk-label { font-size: 10px; font-weight: 600; color: #444; line-height: 1.3; }
          
          .terms-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; font-size: 11px; line-height: 1.7; color: #555; margin-bottom: 24px; }
          
          .acceptance { display: flex; gap: 40px; margin-bottom: 20px; }
          .accept-col { flex: 1; }
          .accept-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #1a1a2e; margin-bottom: 8px; }
          .accept-line { border-bottom: 1px solid #cbd5e1; min-height: 40px; margin-bottom: 4px; display: flex; align-items: flex-end; }
          .accept-label { font-size: 10px; color: #888; }
          .signature-img { height: 40px; margin-bottom: 0; }
          
          .footer { display: flex; align-items: center; justify-content: space-between; padding-top: 16px; border-top: 2px solid #e2e8f0; position: relative; z-index: 2; }
          .footer img { height: 24px; opacity: 0.7; }
          .footer-left { font-size: 10px; color: #888; }
          .footer-right { font-size: 11px; color: #888; font-style: italic; }
        </style>
      </head>
      <body>
        <div class="page">
          <!-- ═══ GEOMETRIC DECORATIONS ═══ -->
          <svg class="geo-top-left" viewBox="0 0 160 140" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="50" height="50" fill="#0891b2" opacity="0.8"/>
            <rect x="55" y="0" width="35" height="35" fill="#f97316" opacity="0.7"/>
            <polygon points="0,55 50,55 0,105" fill="#0891b2" opacity="0.3"/>
            <rect x="55" y="40" width="25" height="25" fill="#0891b2" opacity="0.15"/>
            <polygon points="95,0 160,0 160,65" fill="#94a3b8" opacity="0.12"/>
            <circle cx="110" cy="45" r="18" fill="#f97316" opacity="0.15"/>
            <rect x="0" y="110" width="40" height="30" fill="#0891b2" opacity="0.12"/>
          </svg>
          
          <svg class="geo-top-right" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
            <polygon points="40,0 120,0 120,80" fill="#94a3b8" opacity="0.15"/>
            <circle cx="90" cy="30" r="25" fill="#0891b2" opacity="0.12"/>
            <rect x="70" y="60" width="50" height="30" fill="#f97316" opacity="0.2"/>
            <polygon points="0,0 40,0 40,40" fill="#0891b2" opacity="0.1"/>
          </svg>
          
          <svg class="geo-bottom-left" viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="60" width="60" height="40" fill="#0891b2" opacity="0.8"/>
            <polygon points="65,100 65,50 115,100" fill="#f97316" opacity="0.6"/>
            <polygon points="0,40 40,40 0,80" fill="#94a3b8" opacity="0.2"/>
            <rect x="120" y="70" width="20" height="30" fill="#0891b2" opacity="0.15"/>
          </svg>
          
          <svg class="geo-bottom-right" viewBox="0 0 200 130" xmlns="http://www.w3.org/2000/svg">
            <polygon points="100,130 200,130 200,30" fill="#0891b2" opacity="0.15"/>
            <polygon points="130,130 180,130 180,80" fill="#f97316" opacity="0.5"/>
            <rect x="60" y="90" width="40" height="40" fill="#0891b2" opacity="0.7"/>
            <polygon points="50,130 100,130 100,80" fill="#94a3b8" opacity="0.2"/>
            <rect x="160" y="50" width="30" height="30" fill="#0891b2" opacity="0.2"/>
          </svg>
          
          <!-- ═══ HEADER ═══ -->
          <div class="header">
            <img src="${logoDataUri}" alt="PrimeCode" />
            <div class="header-right">
              www.primecode.in<br/>
              <span style="color:#999;">Welcome to the future of tech.</span>
            </div>
          </div>
          
          <!-- ═══ TITLE ═══ -->
          <h1>OFFER OF EMPLOYMENT</h1>
          <div class="candidate-info">[${application.fullName}]</div>
          <div class="candidate-info" style="color:#888;">[Date: ${today}]</div>
          
          <!-- ═══ GREETING ═══ -->
          <div class="greeting">
            Dear <strong>${application.fullName}</strong>,<br/><br/>
            Congratulations! We are thrilled to formally offer you the position of <strong>${application.jobTitle || 'the open position'}</strong> at 
            <strong style="color:#1a1a2e;">PrimeCode Solutions</strong>. We are impressed by your skills and potential, and we are confident you will be a vital asset to our team.
          </div>
          
          <!-- ═══ ROLE OVERVIEW ═══ -->
          <div class="section-title">
            <span class="icon">📋</span>
            <span class="label">Role Overview:</span>
          </div>
          <div class="role-card">
            <div class="role-row"><span class="role-label">Department:</span><span class="role-value">${application.department || 'Engineering'}</span></div>
            <div class="role-row"><span class="role-label">Report To:</span><span class="role-value">${reportTo || 'Team Lead'}</span></div>
            <div class="role-row"><span class="role-label">Start Date:</span><span class="role-value">${formattedStartDate}</span></div>
          </div>
          
          <!-- ═══ COMPENSATION ═══ -->
          <div class="section-title">
            <span class="icon">💰</span>
            <span class="label">Compensation & Benefits:</span>
          </div>
          <div class="comp-card">
            <strong>Base Salary:</strong> <span class="salary">${salary}</span> per year, paid monthly. Eligible for annual performance bonus of up to 15% of CTC.
          </div>
          
          <!-- ═══ KEY PERKS ═══ -->
          <div class="section-title">
            <span class="icon">🎁</span>
            <span class="label">Key Perks:</span>
          </div>
          <div class="perks-grid">
            <div class="perk-box"><div class="perk-icon">🏠</div><div class="perk-label">Fully Remote/Hybrid<br/>Flexibility</div></div>
            <div class="perk-box"><div class="perk-icon">🏥</div><div class="perk-label">Comprehensive<br/>Health & Wellness</div></div>
            <div class="perk-box"><div class="perk-icon">📚</div><div class="perk-label">Continuous<br/>Learning Fund</div></div>
            <div class="perk-box"><div class="perk-icon">🚀</div><div class="perk-label">Career Growth<br/>Opportunities</div></div>
          </div>
          
          <!-- ═══ TERMS ═══ -->
          <div class="section-title">
            <span class="icon">📝</span>
            <span class="label">Terms:</span>
          </div>
          <div class="terms-box">${termsText}</div>
          
          <!-- ═══ ACCEPTANCE ═══ -->
          <div class="acceptance">
            <div class="accept-col">
              <div class="accept-title">Acceptance:</div>
              <div class="accept-line"></div>
              <div class="accept-label">Candidate Signature</div>
              <div class="accept-label">Date, Print Name</div>
            </div>
            <div class="accept-col">
              <div class="accept-title">PrimeCode Solutions:</div>
              <div class="accept-line">
                ${signatureDataUri ? `<img src="${signatureDataUri}" class="signature-img" alt="Signature" />` : ''}
              </div>
              <div class="accept-label"><strong style="color:#1a1a2e;">Balichak Suman</strong></div>
              <div class="accept-label">Founder & CEO</div>
            </div>
          </div>
          
          <!-- ═══ FOOTER ═══ -->
          <div class="footer">
            <div>
              <img src="${logoDataUri}" alt="PrimeCode" />
              <div class="footer-left">www.primecode.in</div>
            </div>
            <div class="footer-right">Welcome to the future of tech.</div>
          </div>
        </div>
      </body>
      </html>
      `;

      // ═══ GENERATE PDF WITH PUPPETEER ═══
      const puppeteer = (await import('puppeteer')).default;
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(pdfHtml, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', bottom: '0', left: '0', right: '0' }
      });
      await browser.close();

      // Convert PDF to base64 for Brevo attachment
      const pdfBase64 = pdfBuffer.toString('base64');

      // ═══ SEND EMAIL WITH PDF ATTACHMENT VIA BREVO ═══
      const emailSubject = `Offer of Employment – ${application.jobTitle || 'Open Position'} at PrimeCode Solutions`;
      const emailBody = `
        <div style="font-family:'Segoe UI',sans-serif; padding:20px; color:#333;">
          <p>Dear <strong>${application.fullName}</strong>,</p>
          <p>Please find attached your official <strong>Offer of Employment</strong> from PrimeCode Solutions for the position of <strong>${application.jobTitle || 'the open position'}</strong>.</p>
          <p>We are excited to welcome you to our team! Please review the attached offer letter carefully and reach out if you have any questions.</p>
          <br/>
          <p>Best regards,<br/><strong>Balichak Suman</strong><br/>Founder & CEO, PrimeCode Solutions<br/>www.primecode.in</p>
        </div>
      `;

      // Brevo API with attachment
      await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: { name: 'PrimeCode Careers', email: SENDER_EMAIL },
          to: [{ email: application.email, name: application.fullName }],
          subject: emailSubject,
          htmlContent: emailBody,
          attachment: [{
            content: pdfBase64,
            name: `PrimeCode_Offer_Letter_${application.fullName.replace(/\s+/g, '_')}.pdf`
          }]
        },
        {
          headers: {
            'api-key': BREVO_API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`[CAREERS] Offer letter PDF sent for application #${applicationId} → ${application.email} by ${req.user.name}`);
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
