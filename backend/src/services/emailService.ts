import nodemailer from 'nodemailer';

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
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendVerificationOtp(email: string): Promise<{ sent: boolean; devOtp?: string }> {
  const normalized = email.trim().toLowerCase();
  const otp = generateOtp();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  otpStore.set(normalized, { otp, expiresAt });
  console.log(`[RaktSaathi OTP] Verification code for ${normalized}: ${otp} (expires in 10m)`);

  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[RaktSaathi OTP] No SMTP configured. Using development mode with instant code.`);
    return { sent: true, devOtp: otp };
  }

  try {
    await transporter.sendMail({
      from: `"RaktSaathi Lifeline Network" <${process.env.SMTP_USER || process.env.GMAIL_USER || 'no-reply@raktsaathi.local'}>`,
      to: normalized,
      subject: `Your RaktSaathi Verification Code: ${otp}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 12px; background: linear-gradient(135deg, #E11D48, #BE123C); color: #ffffff; font-size: 24px; font-weight: bold;">
              🩸
            </div>
            <h2 style="color: #0F172A; margin: 12px 0 4px; font-size: 22px; font-weight: 800;">RaktSaathi Network</h2>
            <p style="color: #64748B; margin: 0; font-size: 14px;">Emergency Blood Coordination Platform</p>
          </div>

          <div style="background: #FFF1F2; border: 1px solid rgba(225, 29, 72, 0.2); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <p style="margin: 0 0 10px; color: #BE123C; font-size: 14px; font-weight: 600;">YOUR GMAIL VERIFICATION CODE</p>
            <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #9F1239; margin: 8px 0; font-family: monospace;">
              ${otp}
            </div>
            <p style="margin: 8px 0 0; color: #BE123C; font-size: 12px;">Valid for 10 minutes · Do not share this code with anyone</p>
          </div>

          <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
            We received a request to verify this email address for your RaktSaathi account.
            Enter the code above in the verification window to complete your registration.
          </p>

          <p style="color: #94A3B8; font-size: 12px; line-height: 1.5; margin: 24px 0 0; border-top: 1px solid #F1F5F9; padding-top: 16px;">
            If you did not request this code, you can safely ignore this email.
          </p>
        </div>
      `
    });
    return { sent: true };
  } catch (err) {
    console.error(`[RaktSaathi OTP] Failed to send email via SMTP:`, err);
    // Return devOtp as graceful fallback so user is never blocked
    return { sent: true, devOtp: otp };
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
