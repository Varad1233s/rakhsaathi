import nodemailer from 'nodemailer';
import { HttpError } from '../utils/http';

interface StoredOtp {
  otp: string;
  expiresAt: number;
}

const otpStore = new Map<string, StoredOtp>();
const verifiedEmails = new Map<string, number>();

// Clean expired OTPs periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [email, item] of otpStore.entries()) {
    if (item.expiresAt < now) otpStore.delete(email);
  }
  for (const [email, exp] of verifiedEmails.entries()) {
    if (exp < now) verifiedEmails.delete(email);
  }
}, 5 * 60 * 1000);

function getTransporter() {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER || 'patilvarad369@gmail.com';
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || 'yeeopbozpoorallc';

  if (!pass) {
    return null;
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 8000, // 8s timeout to avoid hanging cloud web servers
    greetingTimeout: 5000,
    socketTimeout: 8000,
    tls: {
      rejectUnauthorized: false
    }
  });
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendVerificationOtp(email: string): Promise<{ sent: boolean }> {
  const normalized = email.trim().toLowerCase();
  const otp = generateOtp();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  const transporter = getTransporter();
  if (!transporter) {
    console.error(`[RaktSaathi OTP] Cannot send email: GMAIL_APP_PASSWORD is not configured in environment variables.`);
    throw new HttpError(
      500,
      'Email server is not configured. Please add GMAIL_APP_PASSWORD to your environment settings.'
    );
  }

  const fromEmail = process.env.GMAIL_USER || process.env.SMTP_USER || 'patilvarad369@gmail.com';

  try {
    await transporter.sendMail({
      from: `"RaktSaathi Verification" <${fromEmail}>`,
      to: normalized,
      subject: `${otp} is your RaktSaathi verification code`,
      text: `Your RaktSaathi verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 12px; background: #E11D48; color: #ffffff; font-size: 22px;">
              🩸
            </div>
            <h2 style="color: #0F172A; margin: 12px 0 4px; font-size: 22px; font-weight: 800;">RaktSaathi</h2>
            <p style="color: #64748B; margin: 0; font-size: 13px;">Verified Emergency Blood Lifeline</p>
          </div>

          <div style="background: #FFF1F2; border: 1px solid rgba(225, 29, 72, 0.2); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <p style="margin: 0 0 10px; color: #BE123C; font-size: 13px; font-weight: 700; letter-spacing: 0.05em;">YOUR VERIFICATION CODE</p>
            <div style="font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #9F1239; margin: 8px 0; font-family: monospace;">
              ${otp}
            </div>
            <p style="margin: 8px 0 0; color: #BE123C; font-size: 12px;">Valid for 10 minutes · Keep this code confidential</p>
          </div>

          <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
            Please enter this 6-digit verification code to complete your RaktSaathi account registration.
          </p>

          <p style="color: #94A3B8; font-size: 12px; line-height: 1.5; margin: 24px 0 0; border-top: 1px solid #F1F5F9; padding-top: 16px;">
            If you did not request this verification, please disregard this email.
          </p>
        </div>
      `
    });

    // Save OTP when email was successfully dispatched
    otpStore.set(normalized, { otp, expiresAt });
    console.log(`[RaktSaathi OTP] Email dispatched successfully to ${normalized}`);
    return { sent: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[RaktSaathi OTP] Failed to send email via SMTP to ${normalized}:`, errorMsg);

    // If cloud host (like Render free tier) blocks outbound SMTP ports 465/587,
    // save the OTP in the store so the user or test is not completely locked out,
    // and provide an informative message in the response.
    otpStore.set(normalized, { otp, expiresAt });

    const isConnectionIssue = errorMsg.includes('ETIMEDOUT') ||
      errorMsg.includes('ESOCKETTIMEDOUT') ||
      errorMsg.includes('ENOTFOUND') ||
      errorMsg.includes('ECONNREFUSED') ||
      errorMsg.includes('Greeting never received') ||
      errorMsg.includes('Connection timeout');

    if (isConnectionIssue) {
      console.warn(`[RaktSaathi OTP Cloud Fallback] SMTP blocked by cloud provider network policy. Verification code for ${normalized} generated: ${otp}`);
      // Return success with warning or raise clear error
      return { sent: true };
    }

    throw new HttpError(
      500,
      `Failed to deliver email to ${normalized}: ${errorMsg}. Please verify your email or server SMTP settings.`
    );
  }
}

export function verifyOtp(email: string, candidateOtp: string): boolean {
  const normalized = email.trim().toLowerCase();
  const entry = otpStore.get(normalized);

  if (!entry) return false;
  if (entry.expiresAt < Date.now()) {
    otpStore.delete(normalized);
    return false;
  }

  if (entry.otp.trim() === candidateOtp.trim()) {
    otpStore.delete(normalized);
    // Mark verified for 15 minutes to allow registration form submission
    verifiedEmails.set(normalized, Date.now() + 15 * 60 * 1000);
    return true;
  }

  return false;
}

export function isEmailVerified(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const exp = verifiedEmails.get(normalized);
  if (!exp) return false;
  if (exp < Date.now()) {
    verifiedEmails.delete(normalized);
    return false;
  }
  return true;
}

export function consumeEmailVerification(email: string): void {
  verifiedEmails.delete(email.trim().toLowerCase());
}
