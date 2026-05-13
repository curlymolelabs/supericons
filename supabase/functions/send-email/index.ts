// Supericons: localized Supabase Auth email hook
// Deploy with: supabase functions deploy send-email --no-verify-jwt

import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

const RESEND_EMAILS_URL = 'https://api.resend.com/emails';
export const EMAIL_TEMPLATE_VERSION = 'supericons-auth-email-v2-link-only-2026-05-12';
const DEFAULT_FROM_EMAIL = 'Supericons <no-reply@auth.supericons.dev>';
const FROM_EMAIL = Deno.env.get('AUTH_EMAIL_FROM') || DEFAULT_FROM_EMAIL;
const APP_NAME = 'Supericons';
const APP_URL = 'https://supericons.dev';
const LOGO_URL = `${APP_URL}/logo_email_header.png`;
const SUPPORT_EMAIL = 'hello@supericons.dev';

const localeAliases: Record<string, string> = {
  zh: 'zh-Hans',
  'zh-CN': 'zh-Hans',
  'zh-SG': 'zh-Hans',
  'zh-TW': 'zh-Hant',
  'zh-HK': 'zh-Hant',
  'zh-MO': 'zh-Hant',
};

const supportedLocales = new Set([
  'ar',
  'de',
  'en',
  'es',
  'hi',
  'ja',
  'ko',
  'pt',
  'th',
  'vi',
  'zh-Hans',
  'zh-Hant',
]);

type EmailIntent = 'confirm_signup' | 'reset_password' | 'password_changed';

type LocalizedEmailCopy = {
  subject: string;
  eyebrow: string;
  title: string;
  body: string;
  cta?: string;
  fallback?: string;
  note: string;
  support?: string;
};

type LocaleEmailCopy = Record<EmailIntent, LocalizedEmailCopy>;

const emailCopy: Record<string, LocaleEmailCopy> = {
  en: {
    confirm_signup: {
      subject: 'Confirm your Supericons account',
      eyebrow: 'Account Activation',
      title: 'Confirm your email',
      body: 'Welcome to Supericons. Confirm your email address to activate your account.',
      cta: 'Confirm Account',
      fallback: 'If the button does not work, copy and paste this link into your browser:',
      note: 'If you did not create a Supericons account, you can safely ignore this email.',
    },
    reset_password: {
      subject: 'Reset your Supericons password',
      eyebrow: 'Password Recovery',
      title: 'Reset your password',
      body: 'We received a request to reset the password for your Supericons account. Use the secure link below to choose a new password.',
      cta: 'Reset Password',
      fallback: 'If the button does not work, copy and paste this link into your browser:',
      note: 'If you did not request this change, you can ignore this email and your password will stay the same.',
    },
    password_changed: {
      subject: 'Your Supericons password was changed',
      eyebrow: 'Security Notice',
      title: 'Your password was changed',
      body: 'This confirms that the password for your Supericons account {email} was just updated.',
      note: 'If you made this change, no further action is needed.',
      support: `If you did not change your password, contact support immediately at ${SUPPORT_EMAIL}.`,
    },
  },
  ar: {
    confirm_signup: {
      subject: 'أكّد حسابك في Supericons',
      eyebrow: 'تفعيل الحساب',
      title: 'أكّد بريدك الإلكتروني',
      body: 'مرحباً بك في Supericons. أكّد بريدك الإلكتروني لتفعيل حسابك.',
      cta: 'تأكيد الحساب',
      fallback: 'إذا لم يعمل الزر، انسخ هذا الرابط والصقه في المتصفح:',
      note: 'إذا لم تنشئ حساباً في Supericons، يمكنك تجاهل هذا البريد بأمان.',
    },
    reset_password: {
      subject: 'إعادة تعيين كلمة مرور Supericons',
      eyebrow: 'استرداد كلمة المرور',
      title: 'إعادة تعيين كلمة المرور',
      body: 'تلقّينا طلباً لإعادة تعيين كلمة مرور حسابك في Supericons. استخدم الرابط الآمن أدناه لاختيار كلمة مرور جديدة.',
      cta: 'إعادة تعيين كلمة المرور',
      fallback: 'إذا لم يعمل الزر، انسخ هذا الرابط والصقه في المتصفح:',
      note: 'إذا لم تطلب هذا التغيير، يمكنك تجاهل هذا البريد وستبقى كلمة مرورك كما هي.',
    },
    password_changed: {
      subject: 'تم تغيير كلمة مرور Supericons',
      eyebrow: 'تنبيه أمني',
      title: 'تم تغيير كلمة المرور',
      body: 'هذا تأكيد بأن كلمة مرور حسابك في Supericons {email} قد تم تحديثها للتو.',
      note: 'إذا أجريت هذا التغيير بنفسك، فلا حاجة لأي إجراء إضافي.',
      support: `إذا لم تغيّر كلمة المرور، تواصل فوراً مع الدعم عبر ${SUPPORT_EMAIL}.`,
    },
  },
  de: {
    confirm_signup: {
      subject: 'Bestätige dein Supericons-Konto',
      eyebrow: 'Konto aktivieren',
      title: 'Bestätige deine E-Mail-Adresse',
      body: 'Willkommen bei Supericons. Bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren.',
      cta: 'Konto bestätigen',
      fallback: 'Wenn der Button nicht funktioniert, kopiere diesen Link in deinen Browser:',
      note: 'Wenn du kein Supericons-Konto erstellt hast, kannst du diese E-Mail ignorieren.',
    },
    reset_password: {
      subject: 'Supericons-Passwort zurücksetzen',
      eyebrow: 'Passwort wiederherstellen',
      title: 'Passwort zurücksetzen',
      body: 'Wir haben eine Anfrage erhalten, das Passwort für dein Supericons-Konto zurückzusetzen. Nutze den sicheren Link unten, um ein neues Passwort zu wählen.',
      cta: 'Passwort zurücksetzen',
      fallback: 'Wenn der Button nicht funktioniert, kopiere diesen Link in deinen Browser:',
      note: 'Wenn du diese Änderung nicht angefordert hast, kannst du diese E-Mail ignorieren. Dein Passwort bleibt unverändert.',
    },
    password_changed: {
      subject: 'Dein Supericons-Passwort wurde geändert',
      eyebrow: 'Sicherheitshinweis',
      title: 'Dein Passwort wurde geändert',
      body: 'Dies bestätigt, dass das Passwort für dein Supericons-Konto {email} gerade aktualisiert wurde.',
      note: 'Wenn du diese Änderung vorgenommen hast, musst du nichts weiter tun.',
      support: `Wenn du dein Passwort nicht geändert hast, kontaktiere sofort den Support unter ${SUPPORT_EMAIL}.`,
    },
  },
  es: {
    confirm_signup: {
      subject: 'Confirma tu cuenta de Supericons',
      eyebrow: 'Activación de cuenta',
      title: 'Confirma tu correo',
      body: 'Te damos la bienvenida a Supericons. Confirma tu correo para activar tu cuenta.',
      cta: 'Confirmar cuenta',
      fallback: 'Si el botón no funciona, copia y pega este enlace en tu navegador:',
      note: 'Si no creaste una cuenta de Supericons, puedes ignorar este correo con seguridad.',
    },
    reset_password: {
      subject: 'Restablece tu contraseña de Supericons',
      eyebrow: 'Recuperación de contraseña',
      title: 'Restablece tu contraseña',
      body: 'Recibimos una solicitud para restablecer la contraseña de tu cuenta de Supericons. Usa el enlace seguro de abajo para elegir una contraseña nueva.',
      cta: 'Restablecer contraseña',
      fallback: 'Si el botón no funciona, copia y pega este enlace en tu navegador:',
      note: 'Si no solicitaste este cambio, puedes ignorar este correo y tu contraseña seguirá igual.',
    },
    password_changed: {
      subject: 'Tu contraseña de Supericons cambió',
      eyebrow: 'Aviso de seguridad',
      title: 'Tu contraseña cambió',
      body: 'Esto confirma que la contraseña de tu cuenta de Supericons ({email}) se actualizó recientemente.',
      note: 'Si hiciste este cambio, no necesitas hacer nada más.',
      support: `Si no cambiaste tu contraseña, contacta al soporte de inmediato en ${SUPPORT_EMAIL}.`,
    },
  },
  hi: {
    confirm_signup: {
      subject: 'अपने Supericons खाते की पुष्टि करें',
      eyebrow: 'खाता सक्रिय करें',
      title: 'अपने ईमेल पते की पुष्टि करें',
      body: 'Supericons में आपका स्वागत है। अपना खाता सक्रिय करने के लिए अपने ईमेल पते की पुष्टि करें।',
      cta: 'खाते की पुष्टि करें',
      fallback: 'अगर बटन काम नहीं करता, तो इस लिंक को कॉपी करके अपने ब्राउज़र में पेस्ट करें:',
      note: 'अगर आपने Supericons खाता नहीं बनाया है, तो आप इस ईमेल को सुरक्षित रूप से अनदेखा कर सकते हैं।',
    },
    reset_password: {
      subject: 'अपना Supericons पासवर्ड रीसेट करें',
      eyebrow: 'पासवर्ड पुनर्प्राप्ति',
      title: 'अपना पासवर्ड रीसेट करें',
      body: 'हमें आपके Supericons खाते का पासवर्ड रीसेट करने का अनुरोध मिला है। नया पासवर्ड चुनने के लिए नीचे दिए गए सुरक्षित लिंक का उपयोग करें।',
      cta: 'पासवर्ड रीसेट करें',
      fallback: 'अगर बटन काम नहीं करता, तो इस लिंक को कॉपी करके अपने ब्राउज़र में पेस्ट करें:',
      note: 'अगर आपने यह बदलाव नहीं मांगा है, तो आप इस ईमेल को अनदेखा कर सकते हैं और आपका पासवर्ड वही रहेगा।',
    },
    password_changed: {
      subject: 'आपका Supericons पासवर्ड बदल गया है',
      eyebrow: 'सुरक्षा सूचना',
      title: 'आपका पासवर्ड बदल गया है',
      body: 'यह पुष्टि करता है कि आपके Supericons खाते {email} का पासवर्ड अभी बदला गया है।',
      note: 'अगर आपने यह बदलाव किया है, तो कोई और कार्रवाई आवश्यक नहीं है।',
      support: `अगर आपने अपना पासवर्ड नहीं बदला है, तो तुरंत ${SUPPORT_EMAIL} पर सहायता से संपर्क करें।`,
    },
  },
  ja: {
    confirm_signup: {
      subject: 'Supericons アカウントを確認してください',
      eyebrow: 'アカウント有効化',
      title: 'メールアドレスを確認',
      body: 'Supericons へようこそ。アカウントを有効にするため、メールアドレスを確認してください。',
      cta: 'アカウントを確認',
      fallback: 'ボタンが動作しない場合は、このリンクをコピーしてブラウザに貼り付けてください:',
      note: 'Supericons アカウントを作成していない場合は、このメールを無視してかまいません。',
    },
    reset_password: {
      subject: 'Supericons のパスワードをリセット',
      eyebrow: 'パスワード再設定',
      title: 'パスワードをリセット',
      body: 'Supericons アカウントのパスワード再設定リクエストを受け取りました。下の安全なリンクから新しいパスワードを設定してください。',
      cta: 'パスワードをリセット',
      fallback: 'ボタンが動作しない場合は、このリンクをコピーしてブラウザに貼り付けてください:',
      note: 'この変更をリクエストしていない場合は、このメールを無視してください。パスワードは変更されません。',
    },
    password_changed: {
      subject: 'Supericons のパスワードが変更されました',
      eyebrow: 'セキュリティ通知',
      title: 'パスワードが変更されました',
      body: 'Supericons アカウント {email} のパスワードが更新されたことをお知らせします。',
      note: 'この変更に心当たりがある場合、追加の操作は不要です。',
      support: `パスワードを変更していない場合は、すぐに ${SUPPORT_EMAIL} までお問い合わせください。`,
    },
  },
  ko: {
    confirm_signup: {
      subject: 'Supericons 계정을 확인하세요',
      eyebrow: '계정 활성화',
      title: '이메일을 확인하세요',
      body: 'Supericons에 오신 것을 환영합니다. 계정을 활성화하려면 이메일 주소를 확인하세요.',
      cta: '계정 확인',
      fallback: '버튼이 작동하지 않으면 이 링크를 복사해 브라우저에 붙여 넣으세요:',
      note: 'Supericons 계정을 만들지 않았다면 이 이메일을 안전하게 무시해도 됩니다.',
    },
    reset_password: {
      subject: 'Supericons 비밀번호 재설정',
      eyebrow: '비밀번호 복구',
      title: '비밀번호 재설정',
      body: 'Supericons 계정의 비밀번호 재설정 요청을 받았습니다. 아래 보안 링크를 사용해 새 비밀번호를 선택하세요.',
      cta: '비밀번호 재설정',
      fallback: '버튼이 작동하지 않으면 이 링크를 복사해 브라우저에 붙여 넣으세요:',
      note: '이 변경을 요청하지 않았다면 이 이메일을 무시해도 됩니다. 비밀번호는 그대로 유지됩니다.',
    },
    password_changed: {
      subject: 'Supericons 비밀번호가 변경되었습니다',
      eyebrow: '보안 알림',
      title: '비밀번호가 변경되었습니다',
      body: 'Supericons 계정 {email}의 비밀번호가 방금 업데이트되었음을 확인합니다.',
      note: '직접 변경했다면 추가 조치는 필요하지 않습니다.',
      support: `비밀번호를 변경하지 않았다면 즉시 ${SUPPORT_EMAIL}로 지원팀에 문의하세요.`,
    },
  },
  pt: {
    confirm_signup: {
      subject: 'Confirme sua conta do Supericons',
      eyebrow: 'Ativação da conta',
      title: 'Confirme seu email',
      body: 'Boas-vindas ao Supericons. Confirme seu email para ativar sua conta.',
      cta: 'Confirmar conta',
      fallback: 'Se o botão não funcionar, copie e cole este link no navegador:',
      note: 'Se você não criou uma conta Supericons, pode ignorar este email com segurança.',
    },
    reset_password: {
      subject: 'Redefina sua senha do Supericons',
      eyebrow: 'Recuperação de senha',
      title: 'Redefina sua senha',
      body: 'Recebemos uma solicitação para redefinir a senha da sua conta do Supericons. Use o link seguro abaixo para escolher uma nova senha.',
      cta: 'Redefinir senha',
      fallback: 'Se o botão não funcionar, copie e cole este link no navegador:',
      note: 'Se você não solicitou essa alteração, pode ignorar este email e sua senha continuará a mesma.',
    },
    password_changed: {
      subject: 'Sua senha do Supericons foi alterada',
      eyebrow: 'Aviso de segurança',
      title: 'Sua senha foi alterada',
      body: 'Esta mensagem confirma que a senha da sua conta do Supericons ({email}) acabou de ser alterada.',
      note: 'Se você fez essa alteração, nenhuma outra ação é necessária.',
      support: `Se você não alterou sua senha, fale com o suporte imediatamente em ${SUPPORT_EMAIL}.`,
    },
  },
  th: {
    confirm_signup: {
      subject: 'ยืนยันบัญชี Supericons ของคุณ',
      eyebrow: 'เปิดใช้งานบัญชี',
      title: 'ยืนยันอีเมลของคุณ',
      body: 'ยินดีต้อนรับสู่ Supericons ยืนยันอีเมลของคุณเพื่อเปิดใช้งานบัญชี',
      cta: 'ยืนยันบัญชี',
      fallback: 'หากปุ่มไม่ทำงาน ให้คัดลอกลิงก์นี้แล้ววางในเบราว์เซอร์:',
      note: 'หากคุณไม่ได้สร้างบัญชี Supericons คุณสามารถเพิกเฉยต่ออีเมลนี้ได้อย่างปลอดภัย',
    },
    reset_password: {
      subject: 'รีเซ็ตรหัสผ่าน Supericons ของคุณ',
      eyebrow: 'กู้คืนรหัสผ่าน',
      title: 'รีเซ็ตรหัสผ่าน',
      body: 'เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชี Supericons ของคุณ ใช้ลิงก์ที่ปลอดภัยด้านล่างเพื่อตั้งรหัสผ่านใหม่',
      cta: 'รีเซ็ตรหัสผ่าน',
      fallback: 'หากปุ่มไม่ทำงาน ให้คัดลอกลิงก์นี้แล้ววางในเบราว์เซอร์:',
      note: 'หากคุณไม่ได้ขอเปลี่ยนแปลงนี้ คุณสามารถเพิกเฉยต่ออีเมลนี้และรหัสผ่านของคุณจะยังคงเดิม',
    },
    password_changed: {
      subject: 'รหัสผ่าน Supericons ของคุณถูกเปลี่ยนแล้ว',
      eyebrow: 'แจ้งเตือนความปลอดภัย',
      title: 'รหัสผ่านของคุณถูกเปลี่ยนแล้ว',
      body: 'นี่คือการยืนยันว่ารหัสผ่านสำหรับบัญชี Supericons {email} ของคุณเพิ่งถูกอัปเดต',
      note: 'หากคุณเป็นผู้เปลี่ยนแปลง ไม่จำเป็นต้องดำเนินการเพิ่มเติม',
      support: `หากคุณไม่ได้เปลี่ยนรหัสผ่าน โปรดติดต่อฝ่ายสนับสนุนทันทีที่ ${SUPPORT_EMAIL}`,
    },
  },
  vi: {
    confirm_signup: {
      subject: 'Xác nhận tài khoản Supericons của bạn',
      eyebrow: 'Kích hoạt tài khoản',
      title: 'Xác nhận email của bạn',
      body: 'Chào mừng bạn đến với Supericons. Hãy xác nhận email để kích hoạt tài khoản.',
      cta: 'Xác nhận tài khoản',
      fallback: 'Nếu nút không hoạt động, hãy sao chép và dán liên kết này vào trình duyệt:',
      note: 'Nếu bạn không tạo tài khoản Supericons, bạn có thể bỏ qua email này một cách an toàn.',
    },
    reset_password: {
      subject: 'Đặt lại mật khẩu Supericons',
      eyebrow: 'Khôi phục mật khẩu',
      title: 'Đặt lại mật khẩu',
      body: 'Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản Supericons của bạn. Hãy dùng liên kết an toàn bên dưới để chọn mật khẩu mới.',
      cta: 'Đặt lại mật khẩu',
      fallback: 'Nếu nút không hoạt động, hãy sao chép và dán liên kết này vào trình duyệt:',
      note: 'Nếu bạn không yêu cầu thay đổi này, bạn có thể bỏ qua email này và mật khẩu của bạn sẽ giữ nguyên.',
    },
    password_changed: {
      subject: 'Mật khẩu Supericons của bạn đã được thay đổi',
      eyebrow: 'Thông báo bảo mật',
      title: 'Mật khẩu của bạn đã được thay đổi',
      body: 'Email này xác nhận rằng mật khẩu cho tài khoản Supericons {email} của bạn vừa được cập nhật.',
      note: 'Nếu bạn đã thực hiện thay đổi này, bạn không cần làm gì thêm.',
      support: `Nếu bạn không đổi mật khẩu, hãy liên hệ hỗ trợ ngay tại ${SUPPORT_EMAIL}.`,
    },
  },
  'zh-Hans': {
    confirm_signup: {
      subject: '确认你的 Supericons 账户',
      eyebrow: '账户激活',
      title: '确认你的邮箱地址',
      body: '欢迎使用 Supericons。请确认你的邮箱地址来激活账户。',
      cta: '确认邮箱',
      fallback: '如果按钮无法使用，请复制此链接并粘贴到浏览器中：',
      note: '如果你没有创建 Supericons 账户，可以放心忽略这封邮件。',
    },
    reset_password: {
      subject: '重置你的 Supericons 密码',
      eyebrow: '密码找回',
      title: '重置密码',
      body: '我们收到了重置你 Supericons 账户密码的请求。请使用下方安全链接设置新密码。',
      cta: '重置密码',
      fallback: '如果按钮无法打开，请复制此链接并粘贴到浏览器中：',
      note: '如果这不是你请求的更改，可以忽略这封邮件，你的密码将保持不变。',
    },
    password_changed: {
      subject: '你的 Supericons 密码已更改',
      eyebrow: '安全通知',
      title: '你的密码已更改',
      body: '这封邮件确认你的 Supericons 账户 {email} 的密码刚刚已更新。',
      note: '如果这是你本人操作，则无需采取其他行动。',
      support: `如果你没有更改密码，请立即通过 ${SUPPORT_EMAIL} 联系支持团队。`,
    },
  },
  'zh-Hant': {
    confirm_signup: {
      subject: '確認你的 Supericons 帳戶',
      eyebrow: '帳戶啟用',
      title: '確認你的電子郵件地址',
      body: '歡迎使用 Supericons。請確認你的電子郵件地址來啟用帳戶。',
      cta: '確認電子郵件',
      fallback: '如果按鈕無法使用，請複製此連結並貼到瀏覽器中：',
      note: '如果你沒有建立 Supericons 帳戶，可以放心忽略這封郵件。',
    },
    reset_password: {
      subject: '重設你的 Supericons 密碼',
      eyebrow: '密碼復原',
      title: '重設密碼',
      body: '我們收到了重設你 Supericons 帳戶密碼的要求。請使用下方安全連結設定新密碼。',
      cta: '重設密碼',
      fallback: '如果按鈕無法開啟，請複製此連結並貼到瀏覽器中：',
      note: '如果這不是你要求的變更，可以忽略這封郵件，你的密碼將保持不變。',
    },
    password_changed: {
      subject: '你的 Supericons 密碼已變更',
      eyebrow: '安全通知',
      title: '你的密碼已變更',
      body: '這封郵件確認你的 Supericons 帳戶 {email} 的密碼剛剛已更新。',
      note: '如果這是你本人操作，則不需要採取其他行動。',
      support: `如果你沒有變更密碼，請立即透過 ${SUPPORT_EMAIL} 聯絡支援團隊。`,
    },
  },
};

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? value as Record<string, any> : {};
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export function normalizeLocale(locale: unknown) {
  if (typeof locale !== 'string') return 'en';
  const value = locale.trim();
  const mapped = localeAliases[value] || value;
  return supportedLocales.has(mapped) ? mapped : 'en';
}

function localeFromRedirect(redirectTo: unknown) {
  if (typeof redirectTo !== 'string') return 'en';
  try {
    const value = new URL(redirectTo).searchParams.get('locale');
    return normalizeLocale(value);
  } catch {
    return 'en';
  }
}

function safeUrlOrigin(value: unknown) {
  if (typeof value !== 'string' || !value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function normalizeAction(value: unknown) {
  return asString(value).trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function getEmailData(event: Record<string, any>) {
  return asRecord(event.email_data || event.email);
}

function hasAnyToken(emailData: Record<string, any>) {
  return Boolean(emailData.token_hash || emailData.token_hash_new || emailData.token || emailData.token_new);
}

function hasAnyLink(emailData: Record<string, any>) {
  return Boolean(emailData.confirmation_url || emailData.redirect_to);
}

function resolveEmailIntent(event: Record<string, any>): EmailIntent {
  const emailData = getEmailData(event);
  const action = normalizeAction(emailData.email_action_type || emailData.action || emailData.type);

  if (['signup', 'sign_up', 'confirmation', 'confirm_signup', 'email_confirmation'].includes(action)) {
    return 'confirm_signup';
  }

  if (['recovery', 'recover', 'reset_password', 'password_reset'].includes(action)) {
    return 'reset_password';
  }

  if (['password_changed', 'password_change', 'password_updated'].includes(action)) {
    return 'password_changed';
  }

  if (!action && !hasAnyToken(emailData) && !hasAnyLink(emailData) && (asString(asRecord(event.user).email) || asString(emailData.email))) {
    return 'password_changed';
  }

  throw new Error(`Unsupported auth email action: ${action || '(missing)'}`);
}

function authVerifyType(intent: EmailIntent) {
  return intent === 'confirm_signup' ? 'email' : 'recovery';
}

function getAuthBaseUrl(emailData: Record<string, any>) {
  const configuredUrl = Deno.env.get('SUPABASE_URL');
  if (configuredUrl) return configuredUrl.replace(/\/+$/, '');

  const providedUrl = asString(emailData.confirmation_url);
  if (providedUrl) {
    try {
      return new URL(providedUrl).origin;
    } catch {
      // Fall through to the last-resort legacy value.
    }
  }

  return asString(emailData.site_url).replace(/\/+$/, '');
}

function redirectToFromConfirmationUrl(emailData: Record<string, any>) {
  const providedUrl = asString(emailData.confirmation_url);
  if (!providedUrl) return '';
  try {
    return new URL(providedUrl).searchParams.get('redirect_to') || '';
  } catch {
    return '';
  }
}

function resolveRedirectTo(emailData: Record<string, any>) {
  return asString(emailData.redirect_to) || redirectToFromConfirmationUrl(emailData);
}

function buildConfirmationUrl(emailData: Record<string, any>, tokenHash: string, intent: EmailIntent) {
  const authBaseUrl = getAuthBaseUrl(emailData);
  const redirectTo = resolveRedirectTo(emailData);
  if (authBaseUrl && tokenHash) {
    const url = new URL('/auth/v1/verify', authBaseUrl);
    url.searchParams.set('token', tokenHash);
    url.searchParams.set('type', authVerifyType(intent));
    if (redirectTo) {
      url.searchParams.set('redirect_to', redirectTo);
    }
    return url.toString();
  }

  const providedUrl = asString(emailData.confirmation_url);
  if (providedUrl) return providedUrl;

  return '';
}

function escapeHtml(value: unknown) {
  return asString(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderTemplate(value: string, replacements: Record<string, string>) {
  return value.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key) => replacements[key] || '');
}

function getCopy(locale: string, intent: EmailIntent) {
  return (emailCopy[locale] || emailCopy.en)[intent];
}

export function buildEmailHtml({ locale, intent, url, recipientEmail }: {
  locale: string;
  intent: EmailIntent;
  url: string;
  recipientEmail: string;
}) {
  const copy = getCopy(locale, intent);
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const align = dir === 'rtl' ? 'right' : 'left';
  const replacements = {
    email: recipientEmail,
    supportEmail: SUPPORT_EMAIL,
  };
  const title = escapeHtml(renderTemplate(copy.title, replacements));
  const body = escapeHtml(renderTemplate(copy.body, replacements));
  const note = escapeHtml(renderTemplate(copy.note, replacements));
  const support = copy.support ? escapeHtml(renderTemplate(copy.support, replacements)) : '';
  const safeUrl = escapeHtml(url);
  const button = copy.cta && url
    ? `<p style="margin: 28px 0 0;"><a href="${safeUrl}" style="display: inline-block; background-color: #FF4F00; color: #000000; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 99px;">${escapeHtml(copy.cta)}</a></p>`
    : '';
  const fallback = copy.fallback && url
    ? `<p style="margin: 24px 0 0; color: #8d8d8d; font-size: 13px; line-height: 1.6;">${escapeHtml(copy.fallback)}<br><a href="${safeUrl}" style="color: #FF7A33; word-break: break-all;">${safeUrl}</a></p>`
    : '';
  const supportBlock = support
    ? `<p style="margin: 16px 0 0; color: #f6f6f6; font-size: 15px; line-height: 1.7;">${support}</p>`
    : '';

  return `<!doctype html>
<html lang="${escapeHtml(locale)}" dir="${dir}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Nunito:ital,wght@1,900&display=swap" rel="stylesheet">
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@1,900&display=swap');
    </style>
    <title>${title}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #0e0e0e;">
    <!-- ${EMAIL_TEMPLATE_VERSION} -->
    <div style="padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; text-align: center;">
      <div style="max-width: 480px; margin: 0 auto;">
        <a href="${APP_URL}" style="display: inline-flex; align-items: center; justify-content: center; gap: 2px; margin-bottom: 32px; text-decoration: none;">
          <img src="${LOGO_URL}" alt="${APP_NAME}" height="34" style="display: block; border: 0; outline: none; text-decoration: none;">
        </a>
        <div style="background-color: #131313; border: 1px solid #262626; border-radius: 16px; padding: 48px 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); text-align: ${align};">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #FF4F00; margin-bottom: 12px;">${escapeHtml(copy.eyebrow)}</div>
          <h1 style="font-family: 'Nunito', sans-serif; font-size: 24px; font-weight: 700; margin: 0 0 16px; color: #ffffff; line-height: 1.25;">${title}</h1>
          <p style="margin: 0; color: #cccaca; font-size: 16px; line-height: 1.7;">${body}</p>
          ${button}
          ${fallback}
          <p style="margin: 30px 0 0; color: #a7a7a7; font-size: 14px; line-height: 1.7;">${note}</p>
          ${supportBlock}
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function buildTextEmail({ locale, intent, url, recipientEmail }: {
  locale: string;
  intent: EmailIntent;
  url: string;
  recipientEmail: string;
}) {
  const copy = getCopy(locale, intent);
  const replacements = {
    email: recipientEmail,
    supportEmail: SUPPORT_EMAIL,
  };
  return [
    renderTemplate(copy.title, replacements),
    renderTemplate(copy.body, replacements),
    copy.cta && url ? `${copy.cta}: ${url}` : '',
    copy.fallback && url ? `${copy.fallback} ${url}` : '',
    renderTemplate(copy.note, replacements),
    copy.support ? renderTemplate(copy.support, replacements) : '',
  ].filter(Boolean).join('\n\n');
}

export function buildEmailMessage({ locale, intent, url, recipientEmail }: {
  locale: string;
  intent: EmailIntent;
  url: string;
  recipientEmail: string;
}) {
  const copy = getCopy(locale, intent);
  return {
    subject: copy.subject,
    html: buildEmailHtml({ locale, intent, url, recipientEmail }),
    text: buildTextEmail({ locale, intent, url, recipientEmail }),
  };
}

function safeEventSummary(event: Record<string, any>) {
  const emailData = getEmailData(event);
  const user = asRecord(event.user);
  return {
    emailActionType: asString(emailData.email_action_type || emailData.action || emailData.type) || null,
    emailDataKeys: Object.keys(emailData).sort(),
    userKeys: Object.keys(user).sort(),
    hasConfirmationUrl: Boolean(emailData.confirmation_url),
    hasRedirectTo: Boolean(emailData.redirect_to),
    redirectOrigin: safeUrlOrigin(resolveRedirectTo(emailData)),
    confirmationUrlOrigin: safeUrlOrigin(emailData.confirmation_url),
    confirmationRedirectOrigin: safeUrlOrigin(redirectToFromConfirmationUrl(emailData)),
    hasToken: Boolean(emailData.token || emailData.token_new),
    hasTokenHash: Boolean(emailData.token_hash || emailData.token_hash_new),
    hasUserEmail: Boolean(user.email || emailData.email),
  };
}

export async function sendResendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text: string }) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured');
  if (!to) throw new Error('Auth email recipient is missing');

  const response = await fetch(RESEND_EMAILS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
      text,
      tags: [{ name: 'template_version', value: EMAIL_TEMPLATE_VERSION }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend email failed: ${response.status} ${body}`);
  }
}

async function handleVerifiedEvent(event: Record<string, any>) {
  const user = asRecord(event.user);
  const emailData = getEmailData(event);
  const intent = resolveEmailIntent(event);
  const redirectTo = resolveRedirectTo(emailData);
  const locale = normalizeLocale(user.user_metadata?.locale || localeFromRedirect(redirectTo));
  const recipientEmail = asString(user.email || emailData.email);

  const tokenHash = asString(emailData.token_hash || emailData.token_hash_new || emailData.token || emailData.token_new);
  const url = intent === 'password_changed' ? '' : buildConfirmationUrl(emailData, tokenHash, intent);
  if (intent !== 'password_changed' && !url) {
    throw new Error(`Auth email ${intent} is missing a secure action link`);
  }

  const message = buildEmailMessage({ locale, intent, url, recipientEmail });
  await sendResendEmail({ to: recipientEmail, ...message });
  console.info('[send-email] Sent auth email', {
    intent,
    locale,
    templateVersion: EMAIL_TEMPLATE_VERSION,
    redirectOrigin: safeUrlOrigin(redirectTo),
    authBaseOrigin: safeUrlOrigin(getAuthBaseUrl(emailData)),
  });
}

export function handleRequest(req: Request) {
  return handleSendEmailRequest(req);
}

async function handleSendEmailRequest(req: Request) {
  if (req.method !== 'POST') {
    return new Response('not allowed', { status: 400 });
  }

  const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') || Deno.env.get('SUPABASE_AUTH_HOOK_SECRET');
  if (!hookSecret) {
    return new Response(JSON.stringify({ error: { message: 'SEND_EMAIL_HOOK_SECRET is not configured' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);
  const secret = hookSecret.replace('v1,whsec_', '');
  let event: Record<string, any>;

  try {
    event = new Webhook(secret).verify(payload, headers) as Record<string, any>;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid auth email hook signature';
    console.warn('[send-email] Auth email hook verification failed:', message);
    return new Response(JSON.stringify({ error: { message: 'Invalid auth email hook signature' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await handleVerifiedEvent(event);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send auth email';
    console.error('[send-email] Auth email delivery failed:', message, safeEventSummary(event));
    return new Response(JSON.stringify({ error: { message } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

if (import.meta.main) {
  Deno.serve(handleSendEmailRequest);
}
