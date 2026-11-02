import nodemailer from 'nodemailer';
import { ENV } from '../config/env';

const transporter = nodemailer.createTransport({
  host: ENV.SMTP_HOST,
  port: ENV.SMTP_PORT,
  secure: false, // true for 465, false for 587
  auth: {
    user: ENV.SMTP_USER,
    pass: ENV.SMTP_PASS
  }
});

export const sendOtpEmail = async (
  toEmail: string,
  otpCode: string,
  purpose: 'email_verification' | 'password_reset' = 'email_verification'
): Promise<boolean> => {
  try {
    const isRegister = purpose === 'email_verification';
    const title = isRegister ? 'Verify Your PeerBridge Account' : 'Reset Your Password';
    const subtitle = isRegister
      ? 'Thank you for registering on PeerBridge. Use this One-Time Password (OTP) to verify your email address:'
      : 'We received a request to reset your PeerBridge account password. Use this OTP to authorize the reset:';

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background-color: #00C48C; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">PeerBridge</h1>
          <p style="color: #e6faf4; margin: 4px 0 0 0; font-size: 13px;">Student-to-Student Learning & Collaboration Platform</p>
        </div>
        <div style="padding: 28px 24px;">
          <h2 style="color: #0f172a; font-size: 18px; font-weight: 700; margin-top: 0;">${title}</h2>
          <p style="color: #475569; font-size: 14px; line-height: 22px;">
            ${subtitle}
          </p>
          <div style="background-color: #f0fdf4; border: 2px dashed #00C48C; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: 800; color: #00A374; letter-spacing: 6px; font-family: monospace;">${otpCode}</span>
          </div>
          <p style="color: #e11d48; font-size: 12px; font-weight: 600; margin-bottom: 6px;">
             This code is valid for exactly 5 minutes.
          </p>
          <p style="color: #64748b; font-size: 12px; line-height: 18px; margin: 0;">
            Never share this OTP with anyone, including PeerBridge staff. If you did not initiate this request, you can safely disregard this email.
          </p>
        </div>
        <div style="background-color: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">© 2026 PeerBridge • Kaizen Infinities</p>
        </div>
      </div>
    `;

    const subject = isRegister
      ? ` Verify Your Account - OTP: ${otpCode}`
      : `Password Reset OTP: ${otpCode}`;

    const info = await transporter.sendMail({
      from: `"${ENV.FROM_NAME}" <${ENV.SMTP_FROM}>`,
      to: toEmail,
      subject,
      html: htmlContent
    });

    console.log(`[Email Service] OTP email sent successfully to ${toEmail}. MessageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[Email Service] Failed to send OTP email to ${toEmail}:`, error);
    return false;
  }
};

export const sendPasswordChangedNotification = async (toEmail: string, name: string): Promise<boolean> => {
  try {
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background-color: #00C48C; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">PeerBridge</h1>
        </div>
        <div style="padding: 28px 24px;">
          <h2 style="color: #0f172a; font-size: 18px; font-weight: 700; margin-top: 0;">Security Alert: Password Updated</h2>
          <p style="color: #475569; font-size: 14px; line-height: 22px;">
            Hello ${name},<br/><br/>
            The password for your PeerBridge account (<strong>${toEmail}</strong>) was successfully changed. All previous active sessions have been signed out.
          </p>
          <p style="color: #64748b; font-size: 12px; line-height: 18px;">
            If you did not perform this change, please contact PeerBridge support immediately to secure your account.
          </p>
        </div>
        <div style="background-color: #f8fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">© 2026 PeerBridge • Kaizen Infinities</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"${ENV.FROM_NAME}" <${ENV.SMTP_FROM}>`,
      to: toEmail,
      subject: `🛡️ Security Notice: Your PeerBridge Password Was Changed`,
      html: htmlContent
    });
    return true;
  } catch (error) {
    console.error(`[Email Service] Failed to send password changed notification:`, error);
    return false;
  }
};
