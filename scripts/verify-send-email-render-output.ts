import { buildEmailHtml, EMAIL_TEMPLATE_VERSION } from '../supabase/functions/send-email/index.ts';

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const resetUrl = 'https://example.supabase.co/auth/v1/verify?token=REDACTED&type=recovery&redirect_to=http%3A%2F%2Flocalhost%3A5173';

const html = buildEmailHtml({
  locale: 'en',
  intent: 'reset_password',
  url: resetUrl,
  recipientEmail: 'user@example.com',
});

const requiredMarkers = [
  EMAIL_TEMPLATE_VERSION,
  'Password Recovery',
  'Use the secure link below',
  'logo_email_header.png',
  'background-color: #0e0e0e',
  'background-color: #131313',
  'max-width: 480px',
  'height="34"',
  'padding: 48px 40px',
  'border-radius: 99px',
];

for (const marker of requiredMarkers) {
  assert(html.includes(marker), `rendered reset email missing marker: ${marker}`);
}

const forbiddenMarkers = [
  'Verification code',
  'code below',
  'Sign in to Supericons',
  'magiclink',
  '83066174',
  '64815327',
  'Curly Mole Labs sends this email',
  '&copy; 2026 Curly Mole Labs',
];

for (const marker of forbiddenMarkers) {
  assert(!html.includes(marker), `rendered reset email contains forbidden marker: ${marker}`);
}

const zhMessage = buildEmailHtml({
  locale: 'zh-Hans',
  intent: 'reset_password',
  url: resetUrl,
  recipientEmail: 'user@example.com',
});

const zhRequiredMarkers = [
  'lang="zh-Hans"',
  '重置密码',
  '密码找回',
  '请使用下方安全链接设置新密码',
  'http%3A%2F%2Flocalhost%3A5173',
];

for (const marker of zhRequiredMarkers) {
  assert(zhMessage.includes(marker), `rendered Simplified Chinese reset email missing marker: ${marker}`);
}

const zhForbiddenMarkers = [
  'Password Recovery',
  'Reset your password',
  'Use the secure link below',
  'https%3A%2F%2Fsupericons.dev',
  '\uFFFD',
];

for (const marker of zhForbiddenMarkers) {
  assert(!zhMessage.includes(marker), `rendered Simplified Chinese reset email contains forbidden marker: ${marker}`);
}

console.log(`verify-send-email-render-output: ok (${EMAIL_TEMPLATE_VERSION})`);
