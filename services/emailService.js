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

const CREDENTIAL_PURPOSE_COPY = {
  change_email: {
    title: 'Confirm your new email',
    intro: 'Use this verification code to confirm your new email address for KGF Gold TradeX.',
    ignore: 'If you did not request an email change, you can safely ignore this email.',
  },
  change_password: {
    title: 'Confirm your password change',
    intro: 'Use this verification code to confirm your password change for KGF Gold TradeX.',
    ignore: 'If you did not request a password change, please secure your account immediately.',
  },
  login: {
    title: 'Sign-in verification',
    intro: 'Use this verification code to complete your sign-in to KGF Gold TradeX.',
    ignore: 'If you did not try to sign in, please secure your account immediately.',
  },
  forgot_password: {
    title: 'Reset your password',
    intro: 'Use this verification code to reset your KGF Gold TradeX account password.',
    ignore: 'If you did not request a password reset, you can safely ignore this email.',
  },
};

/**
 * Send a 6-digit OTP for email or password credential changes.
 */
export const sendCredentialChangeEmail = async ({ to, name, code, purpose }) => {
  const transport = getTransporter();
  const expiryMinutes = parseInt(process.env.EMAIL_VERIFICATION_EXPIRY_MINUTES || '15', 10);
  const copy = CREDENTIAL_PURPOSE_COPY[purpose] || CREDENTIAL_PURPOSE_COPY.change_email;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${copy.title}</title>
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
                ${copy.intro} The code expires in <strong>${expiryMinutes} minutes</strong>.
              </p>
              <p style="margin:0 0 8px;color:#71717a;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">Your verification code</p>
              <p style="margin:0 0 24px;font-size:36px;font-weight:700;letter-spacing:0.35em;color:#1a1a1a;text-align:center;font-family:ui-monospace,monospace;">${code}</p>
              <p style="margin:0;color:#a1a1aa;font-size:13px;line-height:1.5;">
                ${copy.ignore}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `KGF Gold TradeX — ${copy.intro} Your verification code is ${code}. It expires in ${expiryMinutes} minutes.`;

  await transport.sendMail({
    from: getFromAddress(),
    to,
    subject: `${code} is your KGF Gold TradeX security code`,
    text,
    html,
  });
};

export const sendLoginOtpEmail = async ({ to, name, code }) =>
  sendCredentialChangeEmail({ to, name, code, purpose: 'login' });

export const sendPasswordResetEmail = async ({ to, name, code }) =>
  sendCredentialChangeEmail({ to, name, code, purpose: 'forgot_password' });

export const isEmailConfigured = () =>
  Boolean(process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());

function formatLkr(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return 'LKR 0';
  return `LKR ${value.toLocaleString('en-LK')}`;
}

function getMerchantPortalUrl() {
  return (
    process.env.ADMIN_PORTAL_URL?.trim() ||
    process.env.MERCHANT_PORTAL_URL?.trim() ||
    'http://localhost:4001'
  ).replace(/\/$/, '');
}

function auctionEmailShell({ title, bodyHtml }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#E6C200 0%,#B8A000 100%);padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:#1a1a1a;font-size:22px;font-weight:700;">KGF Gold TradeX</h1>
              <p style="margin:8px 0 0;color:#1a1a1a;font-size:14px;opacity:0.85;">Merchant auction update</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Notify merchant by email when their auction ends with a winning bidder.
 */
export const sendAuctionWinnerEmailToMerchant = async ({
  to,
  merchantName,
  auctionTitle,
  winningBid,
  winnerName,
  winnerEmail,
  winnerPhone,
  portalUrl,
}) => {
  const transport = getTransporter();
  const loginUrl = `${portalUrl || getMerchantPortalUrl()}/login`;
  const chatUrl = `${portalUrl || getMerchantPortalUrl()}/merchant`;

  const winnerRows = [
    `<tr><td style="padding:8px 0;color:#71717a;font-size:14px;width:140px;">Winner</td><td style="padding:8px 0;color:#1a1a1a;font-size:15px;font-weight:600;">${winnerName || 'Winning bidder'}</td></tr>`,
    winnerEmail
      ? `<tr><td style="padding:8px 0;color:#71717a;font-size:14px;">Winner email</td><td style="padding:8px 0;color:#1a1a1a;font-size:15px;"><a href="mailto:${winnerEmail}" style="color:#B8860B;">${winnerEmail}</a></td></tr>`
      : '',
    winnerPhone
      ? `<tr><td style="padding:8px 0;color:#71717a;font-size:14px;">Winner phone</td><td style="padding:8px 0;color:#1a1a1a;font-size:15px;">${winnerPhone}</td></tr>`
      : '',
    `<tr><td style="padding:8px 0;color:#71717a;font-size:14px;">Winning bid</td><td style="padding:8px 0;color:#1a1a1a;font-size:15px;font-weight:700;">${formatLkr(winningBid)}</td></tr>`,
  ].join('');

  const html = auctionEmailShell({
    title: 'Your auction has a winner',
    bodyHtml: `
      <p style="margin:0 0 16px;color:#1a1a1a;font-size:16px;line-height:1.5;">Hello ${merchantName || 'Merchant'},</p>
      <p style="margin:0 0 20px;color:#52525b;font-size:15px;line-height:1.6;">
        Your auction <strong>${auctionTitle}</strong> has ended. Below are the winner details so you can arrange payment and delivery.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;background:#fafafa;border-radius:8px;padding:16px 20px;">
        ${winnerRows}
      </table>
      <p style="margin:0 0 16px;color:#52525b;font-size:15px;line-height:1.6;">
        A winner chat is available in the merchant portal. Sign in to message the buyer directly.
      </p>
      <p style="margin:0 0 24px;text-align:center;">
        <a href="${chatUrl}" style="display:inline-block;background:linear-gradient(135deg,#E6C200,#B8A000);color:#1a1a1a;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:8px;">Open merchant portal</a>
      </p>
      <p style="margin:0;color:#a1a1aa;font-size:13px;line-height:1.5;">
        Sign in at <a href="${loginUrl}" style="color:#B8860B;">${loginUrl}</a> if you are not already logged in.
      </p>
    `,
  });

  const text = [
    `Hello ${merchantName || 'Merchant'},`,
    ``,
    `Your auction "${auctionTitle}" has ended.`,
    `Winner: ${winnerName || 'Winning bidder'}`,
    winnerEmail ? `Winner email: ${winnerEmail}` : null,
    winnerPhone ? `Winner phone: ${winnerPhone}` : null,
    `Winning bid: ${formatLkr(winningBid)}`,
    ``,
    `Open the merchant portal to chat with the winner: ${chatUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  await transport.sendMail({
    from: getFromAddress(),
    to,
    subject: `Auction ended — winner for "${auctionTitle}"`,
    text,
    html,
  });
};

/**
 * Notify merchant by email when their auction ends without any bids.
 */
export const sendAuctionEndedNoBidsEmailToMerchant = async ({
  to,
  merchantName,
  auctionTitle,
  portalUrl,
}) => {
  const transport = getTransporter();
  const managementUrl = `${portalUrl || getMerchantPortalUrl()}/merchant/auctions/management`;

  const html = auctionEmailShell({
    title: 'Your auction has ended',
    bodyHtml: `
      <p style="margin:0 0 16px;color:#1a1a1a;font-size:16px;line-height:1.5;">Hello ${merchantName || 'Merchant'},</p>
      <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">
        Your auction <strong>${auctionTitle}</strong> has ended. There were no bids on this listing.
        You can review it or create a new auction from your dashboard.
      </p>
      <p style="margin:0;text-align:center;">
        <a href="${managementUrl}" style="display:inline-block;background:linear-gradient(135deg,#E6C200,#B8A000);color:#1a1a1a;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:8px;">View auction management</a>
      </p>
    `,
  });

  const text = `Hello ${merchantName || 'Merchant'},\n\nYour auction "${auctionTitle}" has ended with no bids.\n\nView auctions: ${managementUrl}`;

  await transport.sendMail({
    from: getFromAddress(),
    to,
    subject: `Auction ended — no bids on "${auctionTitle}"`,
    text,
    html,
  });
};
