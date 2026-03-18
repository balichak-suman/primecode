import express from 'express';
import prisma from '../prismaClient.js';
import { authMiddleware, authorize } from '../middleware/authMiddleware.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// 1. Get all employees with Advanced Filtering & Search
router.get('/', authMiddleware, authorize(['ADMIN', 'HR']), async (req, res) => {
  try {
    const { search, department, designation, employmentType, workLocation, status, grade } = req.query;

    const where = {
      role: 'EMPLOYEE',
      ...(status && { status }),
      ...(department && { department }),
      ...(designation && { designation }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { employeeId: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...( (employmentType || workLocation || grade) && {
        employeeProfile: {
          ...(employmentType && { employmentType }),
          ...(workLocation && { workLocation }),
          ...(grade && { grade })
        }
      })
    };

    const users = await prisma.user.findMany({
      where,
      include: {
        employeeProfile: true
      },
      orderBy: { name: 'asc' }
    });

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// 2. Get Single Employee Context (Deep Profile)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const targetId = parseInt(id);

    // Permission check
    if (req.user.role === 'EMPLOYEE' && req.user.id !== targetId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await prisma.user.findUnique({
      where: { id: targetId },
      include: {
        employeeProfile: true,
        leaves: { take: 10, orderBy: { appliedOn: 'desc' } },
        attendance: { take: 10, orderBy: { date: 'desc' } },
        payroll: { take: 12, orderBy: { createdAt: 'desc' } }
      }
    });

    if (!user) return res.status(404).json({ error: 'Employee not found' });
    
    // Remote sensitive fields
    delete user.password;
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// 3. Create Multi-Tab Employee (HR/Admin)
router.post('/', authMiddleware, authorize(['ADMIN', 'HR']), async (req, res) => {
  try {
    const { 
      email, password, name, role, designation, department, grade,
      employmentType, workLocation, joiningDate, employeeId,
      personalEmail, dob, gender, bloodGroup, panNumber, bankDetails
    } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password || 'PrimeCode@123', 10);

    // Auto-gen employeeId if not provided
    let finalEmpId = employeeId;
    if (!finalEmpId) {
      const lastEmp = await prisma.employeeProfile.findFirst({ orderBy: { id: 'desc' } });
      const nextNum = lastEmp ? parseInt(lastEmp.employeeId.replace('PC', '')) + 1 : 1;
      finalEmpId = `PC${nextNum.toString().padStart(3, '0')}`;
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: role || 'EMPLOYEE',
          designation,
          department,
          employeeId: finalEmpId,
          status: 'active'
        }
      });

      const profile = await tx.employeeProfile.create({
        data: {
          userId: user.id,
          grade,
          employmentType: employmentType || 'FULL_TIME',
          workLocation: workLocation || 'OFFICE',
          joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
          personalEmail,
          dob: dob ? new Date(dob) : null,
          gender,
          bloodGroup,
          panNumber,
          bankDetails: bankDetails || {}
        }
      });

      return { user, profile };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// 4. Update Profile (Partial/Full)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { profileData, userData } = req.body;
    const targetId = parseInt(id);

    if (req.user.role === 'EMPLOYEE' && req.user.id !== targetId) {
       return res.status(403).json({ error: 'Access denied' });
    }

    const updateResult = await prisma.$transaction(async (tx) => {
      if (userData) {
        await tx.user.update({
          where: { id: targetId },
          data: userData
        });
      }

      if (profileData) {
        // Clean dates
        if (profileData.dob) profileData.dob = new Date(profileData.dob);
        if (profileData.joiningDate) profileData.joiningDate = new Date(profileData.joiningDate);
        
        await tx.employeeProfile.update({
          where: { userId: targetId },
          data: profileData
        });
      }
      
      return tx.user.findUnique({ where: { id: targetId }, include: { employeeProfile: true } });
    });

    res.json(updateResult);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// 5. Bulk CSV Upload (Admin)
router.post('/bulk-import', authMiddleware, authorize(['ADMIN', 'HR']), async (req, res) => {
  try {
    const { employees } = req.body; // Array of employee objects {name, email, department, designation...}
    if (!Array.isArray(employees)) return res.status(400).json({ error: 'Data must be an array' });

    const results = [];
    const defaultPassword = 'PrimeCode@123';
    const hashedDefault = await bcrypt.hash(defaultPassword, 10);

    // Get last employee ID to start incrementing
    const lastEmp = await prisma.employeeProfile.findFirst({ orderBy: { id: 'desc' } });
    let nextNum = lastEmp ? parseInt(lastEmp.employeeId.replace('PC', '')) + 1 : 1;

    for (const emp of employees) {
      try {
        const finalEmpId = `PC${nextNum.toString().padStart(3, '0')}`;
        
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email: emp.email,
              password: hashedDefault,
              name: emp.name,
              role: 'EMPLOYEE',
              designation: emp.designation || 'Engineer',
              department: emp.department || 'Engineering',
              employeeId: finalEmpId,
              status: 'active'
            }
          });

          await tx.employeeProfile.create({
            data: {
              userId: user.id,
              grade: emp.grade || 'L1',
              employmentType: emp.employmentType || 'FULL_TIME',
              workLocation: emp.workLocation || 'OFFICE',
              joiningDate: new Date()
            }
          });
        });

        results.push({ email: emp.email, status: 'Success', employeeId: finalEmpId });
        nextNum++;
      } catch (err) {
        results.push({ email: emp.email, status: 'Failed', error: err.message });
      }
    }

    res.json({ message: 'Bulk Import Complete', results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Bulk import failed' });
  }
});

// 6. Document Upload Simulation
router.post('/:id/documents', authMiddleware, authorize(['ADMIN', 'HR']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, url, type } = req.body;
    const targetId = parseInt(id);

    const profile = await prisma.employeeProfile.findUnique({ where: { userId: targetId } });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const existingDocs = profile.documents || [];
    const newDoc = {
      name: name || 'Uploaded Document',
      url: url || 'https://via.placeholder.com/300', // Simulated URL
      type: type || 'PDF',
      uploadedAt: new Date().toISOString()
    };

    const updatedProfile = await prisma.employeeProfile.update({
      where: { userId: targetId },
      data: {
        documents: [...existingDocs, newDoc]
      }
    });

    res.json({ message: 'Document added to profile', document: newDoc });
  } catch (error) {
    res.status(500).json({ error: 'Document upload simulation failed' });
  }
});

export default router;
