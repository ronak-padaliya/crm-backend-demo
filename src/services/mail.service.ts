import { transporter } from '../helper/mail.js';

export class MailService {
  static async sendPasswordMail(email: string, password: string, role: string) {
    try {
      const result = await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: 'Your CRM Account Credentials',
        html: `
          <h1>Welcome to CRM System</h1>
          <p>You have been added as a ${role}.</p>
          <p>Your login credentials:</p>
          <p>Email: ${email}</p>
          <p>Password: ${password}</p>
          <p>Please change your password after first login.</p>
        `,
      });
      console.log('Email sent successfully:', result);
      return result;
    } catch (error) {
      console.error('Detailed email sending error:', error);
      throw new Error('Failed to send email');
    }
  }

  static async sendPasswordResetMail(email: string, otp: string) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: 'Password Reset OTP',
        html: `
          <h1>Password Reset Request</h1>
          <p>Your OTP for password reset is: ${otp}</p>
          <p>This OTP will expire in 15 minutes.</p>
        `,
      });
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error('Failed to send email');
    }
  }
}
