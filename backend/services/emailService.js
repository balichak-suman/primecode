import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"PrimeCode HRMS" <noreply@primecode.tech>',
      to,
      subject,
      html,
    });
    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

export const emailTemplates = {
  welcome: (name, email, password) => ({
    subject: 'Welcome to PrimeCode HRMS',
    html: `
      <h1>Welcome, ${name}!</h1>
      <p>Your account has been created on the PrimeCode HRMS portal.</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Temporary Password:</strong> ${password}</p>
      <p>Please log in and change your password immediately.</p>
    `,
  }),
  leaveStatus: (name, type, status) => ({
    subject: `Leave Application ${status}`,
    html: `
      <p>Hello ${name},</p>
      <p>Your ${type} leave application has been <strong>${status}</strong>.</p>
    `,
  }),
};
