import express from 'express';
import prisma from '../prismaClient.js';
import { authMiddleware, authorize } from '../middleware/authMiddleware.js';
import { getAutomationConfig, getAlertRules, updateAutomationConfig, updateAlertRules, runJobManually } from '../automation.js';

const router = express.Router();

// ═══ SYSTEM SETTINGS ═══
router.get('/', authMiddleware, async (req, res) => {
  try {
    let settings = await prisma.systemSettings.findFirst();
    if (!settings) {
      settings = { officeStartTime: '09:00', officeEndTime: '18:00', gracePeriodMinutes: 15, maxWfhDays: 4 };
    }
    res.json(settings);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch settings' }); }
});

router.put('/', authMiddleware, authorize('ADMIN'), async (req, res) => {
  try {
    const { officeStartTime, officeEndTime, gracePeriodMinutes, maxWfhDays } = req.body;
    let settings = await prisma.systemSettings.findFirst();
    const data = {
      officeStartTime, officeEndTime,
      gracePeriodMinutes: parseInt(gracePeriodMinutes),
      maxWfhDays: parseInt(maxWfhDays),
      updatedById: req.user.id
    };
    settings = settings
      ? await prisma.systemSettings.update({ where: { id: settings.id }, data })
      : await prisma.systemSettings.create({ data });

    // Audit log
    await prisma.auditLog.create({
      data: { userId: req.user.id, method: 'PUT', url: '/admin/settings', module: 'Settings', details: { action: 'update_system_settings', changes: req.body } }
    });
    res.json(settings);
  } catch (error) { res.status(500).json({ error: 'Failed to update settings' }); }
});

// ═══ AUTOMATION CONFIG ═══
router.get('/automation', authMiddleware, authorize('ADMIN'), (req, res) => {
  res.json(getAutomationConfig());
});

router.put('/automation', authMiddleware, authorize('ADMIN'), async (req, res) => {
  updateAutomationConfig(req.body);
  await prisma.auditLog.create({
    data: { userId: req.user.id, method: 'PUT', url: '/admin/settings/automation', module: 'Automation', details: { action: 'update_automation', changes: req.body } }
  });
  res.json(getAutomationConfig());
});

// ═══ ALERT RULES ═══
router.get('/alerts', authMiddleware, authorize('ADMIN'), (req, res) => {
  res.json(getAlertRules());
});

router.put('/alerts', authMiddleware, authorize('ADMIN'), async (req, res) => {
  updateAlertRules(req.body);
  await prisma.auditLog.create({
    data: { userId: req.user.id, method: 'PUT', url: '/admin/settings/alerts', module: 'Alerts', details: { action: 'update_alert_rules', changes: req.body } }
  });
  res.json(getAlertRules());
});

// ═══ MANUAL JOB TRIGGER ═══
router.post('/automation/run/:jobName', authMiddleware, authorize('ADMIN'), async (req, res) => {
  try {
    const result = await runJobManually(req.params.jobName);
    await prisma.auditLog.create({
      data: { userId: req.user.id, method: 'POST', url: `/admin/settings/automation/run/${req.params.jobName}`, module: 'Automation', details: { action: 'manual_trigger', job: req.params.jobName } }
    });
    res.json(result);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ═══ HOLIDAYS ═══
router.get('/holidays', authMiddleware, async (req, res) => {
  try {
    const holidays = await prisma.holiday.findMany({ orderBy: { date: 'asc' } });
    res.json(holidays);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch holidays' }); }
});

router.post('/holidays', authMiddleware, authorize('ADMIN'), async (req, res) => {
  try {
    const { date, name, type, description } = req.body;
    const holiday = await prisma.holiday.create({ data: { date: new Date(date), name, type: type || 'PUBLIC', description } });
    await prisma.auditLog.create({
      data: { userId: req.user.id, method: 'POST', url: '/admin/settings/holidays', module: 'Holidays', details: { action: 'add_holiday', holiday: { name, date } } }
    });
    res.status(201).json(holiday);
  } catch (error) { res.status(500).json({ error: 'Failed to add holiday' }); }
});

router.delete('/holidays/:id', authMiddleware, authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.holiday.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Failed to delete holiday' }); }
});

// ═══ LEAVE POLICIES ═══
router.get('/leave-policies', authMiddleware, async (req, res) => {
  try {
    const policies = await prisma.leavePolicy.findMany({ orderBy: [{ grade: 'asc' }, { leaveType: 'asc' }] });
    res.json(policies);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch policies' }); }
});

router.post('/leave-policies', authMiddleware, authorize('ADMIN'), async (req, res) => {
  try {
    const { grade, leaveType, annualQuota, maxCarryForward, isEncashable } = req.body;
    const policy = await prisma.leavePolicy.create({
      data: { grade, leaveType, annualQuota: parseFloat(annualQuota), maxCarryForward: parseFloat(maxCarryForward || 0), isEncashable: isEncashable || false }
    });
    res.status(201).json(policy);
  } catch (error) { res.status(500).json({ error: 'Failed to create policy' }); }
});

router.delete('/leave-policies/:id', authMiddleware, authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.leavePolicy.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Failed to delete policy' }); }
});

// ═══ COMPANY PROFILE ═══
router.get('/company', authMiddleware, (req, res) => {
  // In production this would be in DB. Using static for now.
  res.json({
    name: 'PrimeCode Solutions Pvt. Ltd.',
    logo: '/logo.png',
    address: '12th Floor, Cyber Hub, Gurugram, Haryana 122002',
    registrationNo: 'CIN: U72900HR2020PTC085291',
    gstin: '06AABCP1234A1Z5',
    email: 'hr@primecode.tech',
    phone: '+91-124-XXXX-XXX',
    website: 'https://primecode.tech'
  });
});

export default router;
