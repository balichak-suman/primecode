// src/config/permissions.js

export const PERMISSIONS = {
  EMPLOYEE: [
    'view:own_profile', 'edit:own_profile',
    'view:own_attendance', 'apply:leave',
    'view:own_leaves', 'view:own_payslip',
    'view:own_projects', 'use:chat', 'use:ai_assistant'
  ],
  HR: [
    'view:own_profile', 'edit:own_profile',
    'view:own_attendance', 'apply:leave',
    'view:own_leaves', 'view:own_payslip',
    'view:own_projects', 'use:chat', 'use:ai_assistant',
    'view:all_employees', 'create:employee', 'edit:employee',
    'view:all_attendance', 'approve:leave', 'manage:leave_balance',
    'process:payroll', 'view:all_payslips',
    'manage:announcements', 'view:reports'
  ],
  ADMIN: [
    'view:own_profile', 'edit:own_profile',
    'view:own_attendance', 'apply:leave',
    'view:own_leaves', 'view:own_payslip',
    'view:own_projects', 'use:chat', 'use:ai_assistant',
    'view:all_employees', 'create:employee', 'edit:employee',
    'view:all_attendance', 'approve:leave', 'manage:leave_balance',
    'process:payroll', 'view:all_payslips',
    'manage:announcements', 'view:reports',
    'delete:employee', 'manage:roles', 'view:audit_logs',
    'view:analytics', 'manage:system_settings',
    'export:all_data', 'manage:salary_structures'
  ]
};

export const hasPermission = (userRole, permission) => {
  if (!userRole) return false;
  const roleKey = userRole.toUpperCase();
  const allowedPermissions = PERMISSIONS[roleKey] || [];
  return allowedPermissions.includes(permission);
};

export const hasRole = (userRole, roles = []) => {
  if (!userRole) return false;
  const roleKey = userRole.toUpperCase();
  return roles.map(r => r.toUpperCase()).includes(roleKey);
};
