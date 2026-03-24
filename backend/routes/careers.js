import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { body, query, validationResult } from 'express-validator';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
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

const sendBrevoEmail = async (to, subject, htmlContent, skipBranding = false) => {
  try {
    const toArray = Array.isArray(to) ? to.map(e => ({ email: e })) : [{ email: to }];
    // Auto-wrap with branded logo header and footer (unless skipBranding)
    const finalHtml = skipBranding ? htmlContent : `
      <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; max-width:650px; margin:0 auto; background:#0a0a0a; border-radius:12px; overflow:hidden; border:1px solid rgba(0,210,255,0.15);">
        <div style="padding:20px 30px; border-bottom:1px solid rgba(0,210,255,0.1); text-align:center; background:linear-gradient(135deg, rgba(0,210,255,0.06), rgba(121,40,202,0.06));">
          <img src="https://primecode.in/logo.png" alt="PrimeCode" style="height:36px;" />
        </div>
        ${htmlContent}
        <div style="padding:16px 30px; border-top:1px solid rgba(255,255,255,0.06); text-align:center; background:rgba(0,0,0,0.3);">
          <img src="https://primecode.in/logo.png" alt="PrimeCode" style="height:20px; opacity:0.5; margin-bottom:6px;" />
          <p style="margin:0; color:rgba(255,255,255,0.25); font-size:11px;">www.primecode.in · Welcome to the future of tech.</p>
          <p style="margin:4px 0 0; color:rgba(255,255,255,0.15); font-size:10px;">© ${new Date().getFullYear()} PrimeCode Solutions. All rights reserved.</p>
        </div>
      </div>
    `;
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: 'PrimeCode Careers', email: SENDER_EMAIL },
        to: toArray,
        subject,
        htmlContent: finalHtml,
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

      // Check for duplicate application (prevent spam)
      const existingApplication = await prisma.jobApplication.findFirst({
        where: {
          jobId: parsedJobId,
          OR: [
            { email: email.trim().toLowerCase() },
            { phone: phone.trim() }
          ]
        }
      });

      if (existingApplication) {
        return res.status(400).json({ error: 'You have already applied for this position with this email or phone number.' });
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
                    <img src="https://primecode.in/logo.png" alt="PrimeCode" style="height:36px; margin-bottom:8px;" />
                    <p style="margin:0; color:rgba(255,255,255,0.5); font-size:13px; letter-spacing:1px;">INTERVIEW INVITATION</p>
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
        emailHtml,
        true // skipBranding — this email has its own full template with logo
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

      // Read logo and signature as buffers for pdfkit
      const logoPath = path.resolve('templates/logo.png');
      const signaturePath = path.resolve('templates/signature.png');
      const logoBuffer = fs.existsSync(logoPath) ? fs.readFileSync(logoPath) : null;
      const signatureBuffer = fs.existsSync(signaturePath) ? fs.readFileSync(signaturePath) : null;

      // ═══ GENERATE PDF WITH PDFKIT ═══
      const PDFDocument = (await import('pdfkit')).default;

      const pdfBase64 = await new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
        doc.on('error', reject);

        const W = doc.page.width;
        const H = doc.page.height;
        const M = 40; // reduced margin from 50 to 40 to save space
        const CW = W - M * 2; // content width

        // Explicit white background
        doc.rect(0, 0, W, H).fill('white');

        // ═══ GEOMETRIC BORDER DECORATIONS ═══
        // Top-left
        doc.rect(0, 0, 50, 50).fill('#0891b2');
        doc.rect(55, 0, 35, 35).fill('#f97316');
        doc.save().opacity(0.3);
        doc.polygon([0, 55], [50, 55], [0, 105]).fill('#0891b2');
        doc.restore();
        doc.save().opacity(0.15);
        doc.rect(55, 40, 25, 25).fill('#0891b2');
        doc.circle(110, 45, 18).fill('#f97316');
        doc.restore();
        doc.save().opacity(0.12);
        doc.polygon([95, 0], [160, 0], [160, 65]).fill('#94a3b8');
        doc.rect(0, 110, 40, 30).fill('#0891b2');
        doc.restore();

        // Top-right
        doc.save().opacity(0.15);
        doc.polygon([W - 80, 0], [W, 0], [W, 80]).fill('#94a3b8');
        doc.circle(W - 30, 30, 25).fill('#0891b2');
        doc.restore();
        doc.save().opacity(0.2);
        doc.rect(W - 50, 60, 50, 30).fill('#f97316');
        doc.restore();

        // Bottom-left
        doc.rect(0, H - 40, 60, 40).fill('#0891b2');
        doc.save().opacity(0.6);
        doc.polygon([65, H], [65, H - 50], [115, H]).fill('#f97316');
        doc.restore();
        doc.save().opacity(0.2);
        doc.polygon([0, H - 60], [40, H - 60], [0, H - 20]).fill('#94a3b8');
        doc.restore();

        // Bottom-right
        doc.save().opacity(0.15);
        doc.polygon([W - 100, H], [W, H], [W, H - 100]).fill('#0891b2');
        doc.restore();
        doc.save().opacity(0.5);
        doc.polygon([W - 70, H], [W - 20, H], [W - 20, H - 50]).fill('#f97316');
        doc.restore();
        doc.rect(W - 140, H - 40, 40, 40).fill('#0891b2');

        let y = 70; // Start even lower but save space

        // ═══ HEADER ═══
        if (logoBuffer) {
          doc.image(logoBuffer, M, y, { height: 28 });
        }
        doc.fontSize(10).fillColor('#666').text('www.primecode.in', M, y + 2, { width: CW, align: 'right' });
        doc.fontSize(8).fillColor('#aaa').text('Welcome to the future of tech.', M, y + 14, { width: CW, align: 'right' });
        y += 40;

        // ═══ TITLE ═══
        doc.fontSize(22).fillColor('#1a1a2e').font('Helvetica-Bold').text('OFFER OF EMPLOYMENT', M, y, { width: CW, align: 'center' });
        y += 24;
        // Centered Underline
        const underlineW = 220;
        doc.moveTo(M + (CW - underlineW) / 2, y).lineTo(M + (CW + underlineW) / 2, y).lineWidth(3).strokeColor('#0891b2').stroke();
        y += 35; // increased gap

        // Candidate info
        doc.fontSize(11).fillColor('#444').font('Helvetica').text(`[${application.fullName}]`, M, y);
        y += 16;
        doc.fontSize(10).fillColor('#888').text(`[Date: ${today}]`, M, y);
        y += 35; // increased gap

        // ═══ GREETING ═══
        doc.fontSize(11).fillColor('#333').font('Helvetica');
        doc.text('Dear ', M, y, { continued: true });
        doc.font('Helvetica-Bold').fillColor('#0891b2').text(application.fullName, { continued: true });
        doc.font('Helvetica').fillColor('#333').text(',');
        y += 20;
        doc.fontSize(10).fillColor('#444').text(
          'Congratulations! We are thrilled to formally offer you the position of ' +
          (application.jobTitle || 'the open position') +
          ' at PrimeCode Solutions. We are impressed by your skills and potential, and we are confident you will be a vital asset to our team.',
          M, y, { width: CW, lineGap: 3 }
        );
        y = doc.y + 30; // increased gap

        // ═══ ROLE OVERVIEW ═══
        doc.fontSize(11).fillColor('#0891b2').font('Helvetica-Bold').text('ROLE OVERVIEW:', M, y);
        y += 16;
        // Card background
        doc.roundedRect(M, y, CW, 50, 8).fillAndStroke('#f0f9ff', '#bae6fd');
        const roleY = y + 10;
        doc.fontSize(9).fillColor('#666').font('Helvetica-Bold');
        doc.text('Department:', M + 16, roleY);
        doc.fillColor('#1a1a2e').text(application.department || 'Engineering', M + 100, roleY);
        doc.fillColor('#666').text('Report To:', M + 16, roleY + 16);
        doc.fillColor('#1a1a2e').text(reportTo || 'Team Lead', M + 100, roleY + 16);
        doc.fillColor('#666').text('Start Date:', CW / 2 + 20, roleY);
        doc.fillColor('#1a1a2e').text(formattedStartDate, CW / 2 + 80, roleY);
        y += 75; // increased gap

        // ═══ COMPENSATION ═══
        doc.fontSize(11).fillColor('#7c3aed').font('Helvetica-Bold').text('COMPENSATION & BENEFITS:', M, y);
        y += 16;
        doc.roundedRect(M, y, CW, 38, 8).fillAndStroke('#faf5ff', '#e9d5ff');
        doc.fontSize(9).fillColor('#333').font('Helvetica');
        doc.text('Base Salary: ', M + 16, y + 10, { continued: true });
        doc.font('Helvetica-Bold').fillColor('#0891b2').text(salary, { continued: true });
        doc.font('Helvetica').fillColor('#333').text(' per year, paid monthly.');
        doc.fontSize(8).fillColor('#666').text('Eligible for annual performance bonus of up to 15% of CTC.', M + 16, y + 24);
        y += 60; // increased gap

        // ═══ KEY PERKS ═══
        doc.fontSize(11).fillColor('#b45309').font('Helvetica-Bold').text('KEY PERKS:', M, y);
        y += 16;
        const perks = [
          { icon: '·', label: 'Flexible / Hybrid\\nWork' },
          { icon: '·', label: 'Health &\\nWellness' },
          { icon: '·', label: 'Continuous\\nLearning Fund' },
          { icon: '·', label: 'Career Growth\\nOpportunities' }
        ];
        const perkW = (CW - 24) / 4;
        perks.forEach((p, i) => {
          const px = M + i * (perkW + 8);
          doc.roundedRect(px, y, perkW, 35, 6).fillAndStroke('#f0fdfa', '#ccfbf1');
          doc.fontSize(14).fillColor('#0891b2').text(p.icon, px, y + 4, { width: perkW, align: 'center' });
          doc.fontSize(7).fillColor('#444').font('Helvetica-Bold').text(
            p.label.replace('\\n', ' '), px + 2, y + 16, { width: perkW - 4, align: 'center', lineGap: 1 }
          );
        });
        y += 60; // increased gap

        // ═══ TERMS ═══
        doc.fontSize(11).fillColor('#1a1a2e').font('Helvetica-Bold').text('TERMS:', M, y);
        y += 16;
        doc.roundedRect(M, y, CW, 35, 6).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.fontSize(8).fillColor('#555').font('Helvetica').text(termsText, M + 14, y + 8, { width: CW - 28, lineGap: 1 });
        y = Math.max(doc.y + 20, y + 54); // increased gap

        // ═══ ACCEPTANCE ═══
        doc.fontSize(9).fillColor('#1a1a2e').font('Helvetica-Bold');
        doc.text('ACCEPTANCE:', M, y);
        y += 20; // drop signature line lower
        
        const rightAlign = W - M - 140; // Pin to the far right

        // Signature lines
        doc.moveTo(M, y + 36).lineTo(M + 140, y + 36).lineWidth(0.5).strokeColor('#cbd5e1').stroke();
        doc.moveTo(rightAlign, y + 36).lineTo(W - M, y + 36).lineWidth(0.5).stroke();
        
        // Owner signature image
        if (signatureBuffer) {
          doc.image(signatureBuffer, rightAlign + 10, y - 8, { height: 42 });
        }
        y += 44;
        doc.fontSize(8).fillColor('#888').font('Helvetica');
        doc.text('Candidate Signature', M, y);
        doc.font('Helvetica-Bold').fillColor('#1a1a2e').text('Balichak Suman', rightAlign, y, { width: 140, align: 'center' });
        y += 12;
        doc.font('Helvetica').fillColor('#888');
        doc.text('Date, Print Name', M, y);
        doc.text('Founder & CEO', rightAlign, y, { width: 140, align: 'center' });

        // ═══ FOOTER ═══
        const footerY = H - 80; // Absolute pin to the bottom edge of A4
        doc.moveTo(M, footerY).lineTo(W - M, footerY).lineWidth(1).strokeColor('#e2e8f0').stroke();
        if (logoBuffer) {
          doc.image(logoBuffer, M, footerY + 14, { height: 22 });
        }
        doc.fontSize(9).fillColor('#888').font('Helvetica-Oblique').text('Welcome to the future of tech.', M, footerY + 28, { width: CW, align: 'right' });
        doc.font('Helvetica').text('www.primecode.in', M, footerY + 28, { width: CW, align: 'center' });

        doc.end();
      });

      // GENERATE SECURE ACCEPTANCE TOKEN
      const tokenPayload = {
        applicationId: application.id,
        salary,
        startDate,
        reportTo,
        terms
      };
      
      // Use FRONTEND_URL or fallback to production URL for the email link
      const frontendUrl = process.env.FRONTEND_URL || 'https://primecode.in';
      const acceptToken = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'primecode_secret_key_fallback', { expiresIn: '7d' });
      const acceptLink = `${frontendUrl}/careers/accept-offer?token=${acceptToken}`;

      // ═══ SEND EMAIL WITH PDF ATTACHMENT VIA BREVO ═══
      const emailSubject = `Offer of Employment – ${application.jobTitle || 'Open Position'} at PrimeCode Solutions`;
      const emailBody = `
        <div style="font-family:'Segoe UI',sans-serif; max-width:650px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0;">
          <div style="padding:20px 30px; border-bottom:1px solid #e2e8f0; text-align:center; background:#f8fafc;">
            <img src="https://primecode.in/logo.png" alt="PrimeCode" style="height:36px;" />
          </div>
          <div style="padding:24px 30px; color:#333;">
            <p>Dear <strong>${application.fullName}</strong>,</p>
            <p>Please find attached your official <strong>Offer of Employment</strong> from PrimeCode Solutions for the position of <strong>${application.jobTitle || 'the open position'}</strong>.</p>
            <p>We are excited to welcome you to our team! Please review the attached offer letter carefully and reach out if you have any questions.</p>
            <div style="text-align:center; padding: 35px 0 25px 0;">
              <a href="${acceptLink}" style="background:linear-gradient(135deg, #0891b2, #7c3aed); color:#fff; text-decoration:none; padding:16px 32px; border-radius:8px; font-weight:bold; font-size:16px; display:inline-block; box-shadow:0 4px 15px rgba(124, 58, 237, 0.3);">
                Sign & Accept Offer
              </a>
              <p style="font-size:12px; color:#888; margin-top:12px;">This secure link expires in 7 days.</p>
            </div>
            <br/>
            <p>Best regards,<br/><strong>Balichak Suman</strong><br/>Founder & CEO, PrimeCode Solutions<br/>www.primecode.in</p>
          </div>
          <div style="padding:14px 30px; border-top:1px solid #e2e8f0; text-align:center; background:#f8fafc;">
            <img src="https://primecode.in/logo.png" alt="PrimeCode" style="height:18px; opacity:0.5; margin-bottom:4px;" />
            <p style="margin:0; color:#999; font-size:10px;">© ${new Date().getFullYear()} PrimeCode Solutions. All rights reserved.</p>
          </div>
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
      res.status(500).json({ error: 'Failed to send offer letter: ' + error.message, stack: error.stack });
    }
  }
);

// ─────────────────────────────────────────────
// POST /api/careers/confirm-offer — Accept the offer and countersign PDF
// ─────────────────────────────────────────────
router.post('/confirm-offer', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Acceptance token is required.' });

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'primecode_secret_key_fallback');
    } catch (err) {
      return res.status(401).json({ error: 'This offer link is invalid or has expired.' });
    }

    const { applicationId, salary, startDate, reportTo, terms } = decoded;

    // Fetch Application
    const application = await prisma.jobApplication.findUnique({
      where: { id: applicationId }
    });

    if (!application) return res.status(404).json({ error: 'Application not found.' });
    if (application.status === 'ACCEPTED') return res.status(400).json({ error: 'This offer has already been accepted.' });
    // Note: status might be INTERVIEW if the HR just didn't update it to OFFERED, or whatever. 
    // We'll trust the token existence as proof it was offered.

    // ═══ GENERATE COUNTERSIGNED PDF ═══
    const PDFDocument = (await import('pdfkit')).default;
    const logoPath = path.resolve('templates/logo.png');
    const signaturePath = path.resolve('templates/signature.png');
    const logoBuffer = fs.existsSync(logoPath) ? fs.readFileSync(logoPath) : null;
    const signatureBuffer = fs.existsSync(signaturePath) ? fs.readFileSync(signaturePath) : null;

    const pdfBuffer = await new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        const W = doc.page.width;
        const H = doc.page.height;
        const M = 40;
        const CW = W - M * 2;
        const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        doc.rect(0, 0, W, H).fill('white');

        // Geometric borders
        doc.rect(0, 0, 50, 50).fill('#0891b2');
        doc.rect(55, 0, 35, 35).fill('#f97316');
        doc.save().opacity(0.3);
        doc.polygon([0, 55], [50, 55], [0, 105]).fill('#0891b2');
        doc.restore();
        doc.save().opacity(0.15);
        doc.rect(55, 40, 25, 25).fill('#0891b2');
        doc.circle(110, 45, 18).fill('#f97316');
        doc.restore();
        doc.save().opacity(0.12);
        doc.polygon([95, 0], [160, 0], [160, 65]).fill('#94a3b8');
        doc.rect(0, 110, 40, 30).fill('#0891b2');
        doc.restore();

        doc.save().opacity(0.15);
        doc.polygon([W - 80, 0], [W, 0], [W, 80]).fill('#94a3b8');
        doc.circle(W - 30, 30, 25).fill('#0891b2');
        doc.restore();
        doc.save().opacity(0.2);
        doc.rect(W - 50, 60, 50, 30).fill('#f97316');
        doc.restore();

        doc.rect(0, H - 40, 60, 40).fill('#0891b2');
        doc.save().opacity(0.6);
        doc.polygon([65, H], [65, H - 50], [115, H]).fill('#f97316');
        doc.restore();
        doc.save().opacity(0.2);
        doc.polygon([0, H - 60], [40, H - 60], [0, H - 20]).fill('#94a3b8');
        doc.restore();

        doc.save().opacity(0.15);
        doc.polygon([W - 100, H], [W, H], [W, H - 100]).fill('#0891b2');
        doc.restore();
        doc.save().opacity(0.5);
        doc.polygon([W - 70, H], [W - 20, H], [W - 20, H - 50]).fill('#f97316');
        doc.restore();
        doc.rect(W - 140, H - 40, 40, 40).fill('#0891b2');

        let y = 70;

        if (logoBuffer) {
          doc.image(logoBuffer, M, y, { height: 28 });
        }
        doc.fontSize(10).fillColor('#666').text('www.primecode.in', M, y + 2, { width: CW, align: 'right' });
        doc.fontSize(8).fillColor('#aaa').text('Welcome to the future of tech.', M, y + 14, { width: CW, align: 'right' });
        y += 40;

        doc.fontSize(22).fillColor('#1a1a2e').font('Helvetica-Bold').text('OFFER OF EMPLOYMENT', M, y, { width: CW, align: 'center' });
        y += 24;
        const underlineW = 220;
        doc.moveTo(M + (CW - underlineW) / 2, y).lineTo(M + (CW + underlineW) / 2, y).lineWidth(3).strokeColor('#0891b2').stroke();
        y += 35;

        doc.fontSize(11).fillColor('#444').font('Helvetica').text(`[${application.fullName}]`, M, y);
        y += 16;
        doc.fontSize(10).fillColor('#888').text(`[Date: ${today}]`, M, y);
        y += 35;

        doc.fontSize(11).fillColor('#333').font('Helvetica');
        doc.text('Dear ', M, y, { continued: true });
        doc.font('Helvetica-Bold').fillColor('#0891b2').text(application.fullName, { continued: true });
        doc.font('Helvetica').fillColor('#333').text(',');
        y += 20;
        doc.fontSize(10).fillColor('#444').text(
          'Congratulations! We are thrilled to formally offer you the position of ' +
          (application.jobTitle || 'the open position') +
          ' at PrimeCode Solutions. We are impressed by your skills and potential, and we are confident you will be a vital asset to our team.',
          M, y, { width: CW, lineGap: 3 }
        );
        y = doc.y + 30;

        doc.fontSize(11).fillColor('#0891b2').font('Helvetica-Bold').text('ROLE OVERVIEW:', M, y);
        y += 16;
        doc.roundedRect(M, y, CW, 50, 8).fillAndStroke('#f0f9ff', '#bae6fd');
        const roleY = y + 10;
        doc.fontSize(9).fillColor('#666').font('Helvetica-Bold');
        doc.text('Department:', M + 16, roleY);
        doc.fillColor('#1a1a2e').text(application.department || 'Engineering', M + 100, roleY);
        doc.fillColor('#666').text('Report To:', M + 16, roleY + 16);
        doc.fillColor('#1a1a2e').text(reportTo || 'Team Lead', M + 100, roleY + 16);
        doc.fillColor('#666').text('Start Date:', CW / 2 + 20, roleY);
        
        let formattedStartDate = startDate;
        try {
          if (!isNaN(new Date(startDate).getTime())) {
            formattedStartDate = new Date(startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          }
        } catch(e) {}
        doc.fillColor('#1a1a2e').text(formattedStartDate, CW / 2 + 80, roleY);
        y += 75;

        doc.fontSize(11).fillColor('#7c3aed').font('Helvetica-Bold').text('COMPENSATION & BENEFITS:', M, y);
        y += 16;
        doc.roundedRect(M, y, CW, 38, 8).fillAndStroke('#faf5ff', '#e9d5ff');
        doc.fontSize(9).fillColor('#333').font('Helvetica');
        doc.text('Base Salary: ', M + 16, y + 10, { continued: true });
        doc.font('Helvetica-Bold').fillColor('#0891b2').text(salary, { continued: true });
        doc.font('Helvetica').fillColor('#333').text(' per year, paid monthly.');
        doc.fontSize(8).fillColor('#666').text('Eligible for annual performance bonus of up to 15% of CTC.', M + 16, y + 24);
        y += 60;

        doc.fontSize(11).fillColor('#b45309').font('Helvetica-Bold').text('KEY PERKS:', M, y);
        y += 16;
        const perks = [
          { icon: '·', label: 'Flexible / Hybrid\\nWork' },
          { icon: '·', label: 'Health &\\nWellness' },
          { icon: '·', label: 'Continuous\\nLearning Fund' },
          { icon: '·', label: 'Career Growth\\nOpportunities' }
        ];
        const perkW = (CW - 24) / 4;
        perks.forEach((p, i) => {
          const px = M + i * (perkW + 8);
          doc.roundedRect(px, y, perkW, 35, 6).fillAndStroke('#f0fdfa', '#ccfbf1');
          doc.fontSize(14).fillColor('#0891b2').text(p.icon, px, y + 4, { width: perkW, align: 'center' });
          doc.fontSize(7).fillColor('#444').font('Helvetica-Bold').text(
            p.label.replace('\\n', ' '), px + 2, y + 16, { width: perkW - 4, align: 'center', lineGap: 1 }
          );
        });
        y += 60;

        doc.fontSize(11).fillColor('#1a1a2e').font('Helvetica-Bold').text('TERMS:', M, y);
        y += 16;
        doc.roundedRect(M, y, CW, 35, 6).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.fontSize(8).fillColor('#555').font('Helvetica').text(terms || 'The company reserves the right to conduct background checks.', M + 14, y + 8, { width: CW - 28, lineGap: 1 });
        y = Math.max(doc.y + 20, y + 54);

        doc.fontSize(9).fillColor('#1a1a2e').font('Helvetica-Bold');
        doc.text('ACCEPTANCE:', M, y);
        y += 20;

        const rightAlign = W - M - 140;

        // Candidate Signature (Digitally Signed)
        doc.fontSize(12).fillColor('#2563eb').font('Helvetica-Oblique').text(application.fullName, M, y + 8); // Inject user typed name as signature
        doc.fontSize(8).fillColor('#aaa').text('Electronically Signed: ' + today, M, y + 20); // Timestamp of e-signature
        
        doc.moveTo(M, y + 36).lineTo(M + 140, y + 36).lineWidth(0.5).strokeColor('#cbd5e1').stroke();
        doc.moveTo(rightAlign, y + 36).lineTo(W - M, y + 36).lineWidth(0.5).stroke();
        
        if (signatureBuffer) {
          doc.image(signatureBuffer, rightAlign + 10, y - 8, { height: 42 });
        }
        y += 44;
        doc.fontSize(8).fillColor('#888').font('Helvetica');
        doc.text('Candidate Signature', M, y);
        doc.font('Helvetica-Bold').fillColor('#1a1a2e').text('Balichak Suman', rightAlign, y, { width: 140, align: 'center' });
        y += 12;
        doc.font('Helvetica').fillColor('#888');
        doc.text(application.fullName, M, y);
        doc.text('Founder & CEO', rightAlign, y, { width: 140, align: 'center' });

        const footerY = H - 80;
        doc.moveTo(M, footerY).lineTo(W - M, footerY).lineWidth(1).strokeColor('#e2e8f0').stroke();
        if (logoBuffer) {
          doc.image(logoBuffer, M, footerY + 14, { height: 22 });
        }
        doc.fontSize(9).fillColor('#888').font('Helvetica-Oblique').text('Welcome to the future of tech.', M, footerY + 28, { width: CW, align: 'right' });
        doc.font('Helvetica').text('www.primecode.in', M, footerY + 28, { width: CW, align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });

    const pdfBase64 = pdfBuffer.toString('base64');

    // ═══ SEND COMPLETION EMAIL TO ALL PARTIES ═══
    const emailSubject = `Countersigned Offer Letter – ${application.fullName}`;
    const emailBody = `
      <div style="font-family:'Segoe UI',sans-serif; max-width:650px; margin:0 auto; background:#fff; border-radius:12px; border:1px solid #e2e8f0;">
        <div style="padding:20px 30px; text-align:center; background:#f8fafc; border-bottom:1px solid #e2e8f0;">
          <h2 style="color:#0891b2; margin:0;">Offer Accepted! 🎉</h2>
        </div>
        <div style="padding:24px 30px; color:#333;">
          <p>Dear <strong>${application.fullName}</strong>,</p>
          <p>Thank you for officially accepting the offer for the <strong>${application.jobTitle || 'Open Position'}</strong> role at PrimeCode Solutions!</p>
          <p>Your electronically signed Offer Letter has been successfully recorded. A fully finalized and countersigned PDF is attached to this email for your permanent records.</p>
          <p>Our HR team is CC'd here and will be in touch shortly regarding your onboarding process and schedule.</p>
          <br/>
          <p>Welcome aboard!<br/><strong>PrimeCode HR Team</strong></p>
        </div>
      </div>
    `;

    // To Candidate (cc HR Official, bcc Founder)
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: 'PrimeCode Onboarding', email: process.env.SENDER_EMAIL || 'careers@primecode.in' },
        to: [{ email: application.email, name: application.fullName }],
        cc: [{ email: 'prime.code@yahoo.com' }],
        bcc: [{ email: 'balichaksumann@gmail.com' }],
        subject: emailSubject,
        htmlContent: emailBody,
        attachment: [{
          content: pdfBase64,
          name: `PrimeCode_Accepted_Offer_${application.fullName.replace(/\s+/g, '_')}.pdf`
        }]
      },
      { headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' } }
    );

    // ═══ UPDATE DATABASE ═══
    const updated = await prisma.jobApplication.update({
      where: { id: application.id },
      data: { status: 'ACCEPTED' }
    });

    console.log(`[CAREERS] Offer successfully ACCEPTED for ${application.fullName}`);
    res.json({ success: true, application: updated });
  } catch (error) {
    console.error('POST /careers/confirm-offer error:', error);
    res.status(500).json({ error: 'Failed to confirm offer: ' + error.message });
  }
});

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
