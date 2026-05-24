import nodemailer from 'nodemailer';

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!user || !pass) {
    throw new Error('SMTP_USER and SMTP_PASS must be set in environment variables');
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST?.trim() || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });

  return transporter;
};

const getFromAddress = () => {
  const user = process.env.SMTP_USER?.trim();
  const name = process.env.SMTP_FROM_NAME?.trim() || 'KGF Gold TradeX';
  return `"${name}" <${user}>`;
};

/**
 * Send a 6-digit email verification code.
 */
export const sendVerificationEmail = async ({ to, name, code }) => {
  const transport = getTransporter();
  const expiryMinutes = parseInt(process.env.EMAIL_VERIFICATION_EXPIRY_MINUTES || '15', 10);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Verify your email</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#E6C200 0%,#B8A000 100%);padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:#1a1a1a;font-size:22px;font-weight:700;">KGF Gold TradeX</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#1a1a1a;font-size:16px;line-height:1.5;">Hello ${name || 'there'},</p>
              <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">
                Use this verification code to complete your account setup. The code expires in <strong>${expiryMinutes} minutes</strong>.
              </p>
              <p style="margin:0 0 8px;color:#71717a;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">Your verification code</p>
              <p style="margin:0 0 24px;font-size:36px;font-weight:700;letter-spacing:0.35em;color:#1a1a1a;text-align:center;font-family:ui-monospace,monospace;">${code}</p>
              <p style="margin:0;color:#a1a1aa;font-size:13px;line-height:1.5;">
                If you did not create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `KGF Gold TradeX — Your verification code is ${code}. It expires in ${expiryMinutes} minutes. If you did not sign up, ignore this email.`;

  await transport.sendMail({
    from: getFromAddress(),
    to,
    subject: `${code} is your KGF Gold TradeX verification code`,
    text,
    html,
  });
};

export const isEmailConfigured = () =>
  Boolean(process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());
