// Supericons: authenticated password-change notification email
// Deploy with: supabase functions deploy notify-password-changed --no-verify-jwt

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_EMAILS_URL = 'https://api.resend.com/emails';
const EMAIL_TEMPLATE_VERSION = "supericons-auth-email-v2-link-only-2026-05-12";
const EMAIL_INTENT = 'password_changed';
const EMAIL_PLACEHOLDER = "__SUPERICONS_RECIPIENT_EMAIL__";
const DEFAULT_FROM_EMAIL = 'Supericons <no-reply@auth.supericons.dev>';
const FROM_EMAIL = Deno.env.get('AUTH_EMAIL_FROM') || DEFAULT_FROM_EMAIL;

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

type EmailMessage = {
  subject: string;
  text: string;
  html: string;
};

const passwordChangedMessages: Record<string, EmailMessage> = {
  "ar": {
    "subject": "تم تغيير كلمة مرور Supericons",
    "html": "<!doctype html>\n<html lang=\"ar\" dir=\"rtl\">\n  <head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <link href=\"https://fonts.googleapis.com/css2?family=Nunito:ital,wght@1,900&display=swap\" rel=\"stylesheet\">\n    <style>\n      @import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@1,900&display=swap');\n    </style>\n    <title>تم تغيير كلمة المرور</title>\n  </head>\n  <body style=\"margin: 0; padding: 0; background-color: #0e0e0e;\">\n    <!-- supericons-auth-email-v2-link-only-2026-05-12 -->\n    <div style=\"padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; text-align: center;\">\n      <div style=\"max-width: 480px; margin: 0 auto;\">\n        <a href=\"https://supericons.dev\" style=\"display: inline-flex; align-items: center; justify-content: center; gap: 2px; margin-bottom: 32px; text-decoration: none;\">\n          <img src=\"https://supericons.dev/logo_email_header.png\" alt=\"Supericons\" height=\"34\" style=\"display: block; border: 0; outline: none; text-decoration: none;\">\n        </a>\n        <div style=\"background-color: #131313; border: 1px solid #262626; border-radius: 16px; padding: 48px 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); text-align: right;\">\n          <div style=\"font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #FF4F00; margin-bottom: 12px;\">تنبيه أمني</div>\n          <h1 style=\"font-family: 'Nunito', sans-serif; font-size: 24px; font-weight: 700; margin: 0 0 16px; color: #ffffff; line-height: 1.25;\">تم تغيير كلمة المرور</h1>\n          <p style=\"margin: 0; color: #cccaca; font-size: 16px; line-height: 1.7;\">هذا تأكيد بأن كلمة مرور حسابك في Supericons __SUPERICONS_RECIPIENT_EMAIL__ قد تم تحديثها للتو.</p>\n          \n          \n          <p style=\"margin: 30px 0 0; color: #a7a7a7; font-size: 14px; line-height: 1.7;\">إذا أجريت هذا التغيير بنفسك، فلا حاجة لأي إجراء إضافي.</p>\n          <p style=\"margin: 16px 0 0; color: #f6f6f6; font-size: 15px; line-height: 1.7;\">إذا لم تغيّر كلمة المرور، تواصل فوراً مع الدعم عبر hello@supericons.dev.</p>\n        </div>\n      </div>\n    </div>\n  </body>\n</html>",
    "text": "تم تغيير كلمة المرور\n\nهذا تأكيد بأن كلمة مرور حسابك في Supericons __SUPERICONS_RECIPIENT_EMAIL__ قد تم تحديثها للتو.\n\nإذا أجريت هذا التغيير بنفسك، فلا حاجة لأي إجراء إضافي.\n\nإذا لم تغيّر كلمة المرور، تواصل فوراً مع الدعم عبر hello@supericons.dev."
  },
  "de": {
    "subject": "Dein Supericons-Passwort wurde geändert",
    "html": "<!doctype html>\n<html lang=\"de\" dir=\"ltr\">\n  <head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <link href=\"https://fonts.googleapis.com/css2?family=Nunito:ital,wght@1,900&display=swap\" rel=\"stylesheet\">\n    <style>\n      @import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@1,900&display=swap');\n    </style>\n    <title>Dein Passwort wurde geändert</title>\n  </head>\n  <body style=\"margin: 0; padding: 0; background-color: #0e0e0e;\">\n    <!-- supericons-auth-email-v2-link-only-2026-05-12 -->\n    <div style=\"padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; text-align: center;\">\n      <div style=\"max-width: 480px; margin: 0 auto;\">\n        <a href=\"https://supericons.dev\" style=\"display: inline-flex; align-items: center; justify-content: center; gap: 2px; margin-bottom: 32px; text-decoration: none;\">\n          <img src=\"https://supericons.dev/logo_email_header.png\" alt=\"Supericons\" height=\"34\" style=\"display: block; border: 0; outline: none; text-decoration: none;\">\n        </a>\n        <div style=\"background-color: #131313; border: 1px solid #262626; border-radius: 16px; padding: 48px 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); text-align: left;\">\n          <div style=\"font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #FF4F00; margin-bottom: 12px;\">Sicherheitshinweis</div>\n          <h1 style=\"font-family: 'Nunito', sans-serif; font-size: 24px; font-weight: 700; margin: 0 0 16px; color: #ffffff; line-height: 1.25;\">Dein Passwort wurde geändert</h1>\n          <p style=\"margin: 0; color: #cccaca; font-size: 16px; line-height: 1.7;\">Dies bestätigt, dass das Passwort für dein Supericons-Konto __SUPERICONS_RECIPIENT_EMAIL__ gerade aktualisiert wurde.</p>\n          \n          \n          <p style=\"margin: 30px 0 0; color: #a7a7a7; font-size: 14px; line-height: 1.7;\">Wenn du diese Änderung vorgenommen hast, musst du nichts weiter tun.</p>\n          <p style=\"margin: 16px 0 0; color: #f6f6f6; font-size: 15px; line-height: 1.7;\">Wenn du dein Passwort nicht geändert hast, kontaktiere sofort den Support unter hello@supericons.dev.</p>\n        </div>\n      </div>\n    </div>\n  </body>\n</html>",
    "text": "Dein Passwort wurde geändert\n\nDies bestätigt, dass das Passwort für dein Supericons-Konto __SUPERICONS_RECIPIENT_EMAIL__ gerade aktualisiert wurde.\n\nWenn du diese Änderung vorgenommen hast, musst du nichts weiter tun.\n\nWenn du dein Passwort nicht geändert hast, kontaktiere sofort den Support unter hello@supericons.dev."
  },
  "en": {
    "subject": "Your Supericons password was changed",
    "html": "<!doctype html>\n<html lang=\"en\" dir=\"ltr\">\n  <head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <link href=\"https://fonts.googleapis.com/css2?family=Nunito:ital,wght@1,900&display=swap\" rel=\"stylesheet\">\n    <style>\n      @import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@1,900&display=swap');\n    </style>\n    <title>Your password was changed</title>\n  </head>\n  <body style=\"margin: 0; padding: 0; background-color: #0e0e0e;\">\n    <!-- supericons-auth-email-v2-link-only-2026-05-12 -->\n    <div style=\"padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; text-align: center;\">\n      <div style=\"max-width: 480px; margin: 0 auto;\">\n        <a href=\"https://supericons.dev\" style=\"display: inline-flex; align-items: center; justify-content: center; gap: 2px; margin-bottom: 32px; text-decoration: none;\">\n          <img src=\"https://supericons.dev/logo_email_header.png\" alt=\"Supericons\" height=\"34\" style=\"display: block; border: 0; outline: none; text-decoration: none;\">\n        </a>\n        <div style=\"background-color: #131313; border: 1px solid #262626; border-radius: 16px; padding: 48px 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); text-align: left;\">\n          <div style=\"font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #FF4F00; margin-bottom: 12px;\">Security Notice</div>\n          <h1 style=\"font-family: 'Nunito', sans-serif; font-size: 24px; font-weight: 700; margin: 0 0 16px; color: #ffffff; line-height: 1.25;\">Your password was changed</h1>\n          <p style=\"margin: 0; color: #cccaca; font-size: 16px; line-height: 1.7;\">This confirms that the password for your Supericons account __SUPERICONS_RECIPIENT_EMAIL__ was just updated.</p>\n          \n          \n          <p style=\"margin: 30px 0 0; color: #a7a7a7; font-size: 14px; line-height: 1.7;\">If you made this change, no further action is needed.</p>\n          <p style=\"margin: 16px 0 0; color: #f6f6f6; font-size: 15px; line-height: 1.7;\">If you did not change your password, contact support immediately at hello@supericons.dev.</p>\n        </div>\n      </div>\n    </div>\n  </body>\n</html>",
    "text": "Your password was changed\n\nThis confirms that the password for your Supericons account __SUPERICONS_RECIPIENT_EMAIL__ was just updated.\n\nIf you made this change, no further action is needed.\n\nIf you did not change your password, contact support immediately at hello@supericons.dev."
  },
  "es": {
    "subject": "Tu contraseña de Supericons cambió",
    "html": "<!doctype html>\n<html lang=\"es\" dir=\"ltr\">\n  <head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <link href=\"https://fonts.googleapis.com/css2?family=Nunito:ital,wght@1,900&display=swap\" rel=\"stylesheet\">\n    <style>\n      @import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@1,900&display=swap');\n    </style>\n    <title>Tu contraseña cambió</title>\n  </head>\n  <body style=\"margin: 0; padding: 0; background-color: #0e0e0e;\">\n    <!-- supericons-auth-email-v2-link-only-2026-05-12 -->\n    <div style=\"padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; text-align: center;\">\n      <div style=\"max-width: 480px; margin: 0 auto;\">\n        <a href=\"https://supericons.dev\" style=\"display: inline-flex; align-items: center; justify-content: center; gap: 2px; margin-bottom: 32px; text-decoration: none;\">\n          <img src=\"https://supericons.dev/logo_email_header.png\" alt=\"Supericons\" height=\"34\" style=\"display: block; border: 0; outline: none; text-decoration: none;\">\n        </a>\n        <div style=\"background-color: #131313; border: 1px solid #262626; border-radius: 16px; padding: 48px 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); text-align: left;\">\n          <div style=\"font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #FF4F00; margin-bottom: 12px;\">Aviso de seguridad</div>\n          <h1 style=\"font-family: 'Nunito', sans-serif; font-size: 24px; font-weight: 700; margin: 0 0 16px; color: #ffffff; line-height: 1.25;\">Tu contraseña cambió</h1>\n          <p style=\"margin: 0; color: #cccaca; font-size: 16px; line-height: 1.7;\">Esto confirma que la contraseña de tu cuenta de Supericons __SUPERICONS_RECIPIENT_EMAIL__ acaba de actualizarse.</p>\n          \n          \n          <p style=\"margin: 30px 0 0; color: #a7a7a7; font-size: 14px; line-height: 1.7;\">Si hiciste este cambio, no necesitas hacer nada más.</p>\n          <p style=\"margin: 16px 0 0; color: #f6f6f6; font-size: 15px; line-height: 1.7;\">Si no cambiaste tu contraseña, contacta al soporte de inmediato en hello@supericons.dev.</p>\n        </div>\n      </div>\n    </div>\n  </body>\n</html>",
    "text": "Tu contraseña cambió\n\nEsto confirma que la contraseña de tu cuenta de Supericons __SUPERICONS_RECIPIENT_EMAIL__ acaba de actualizarse.\n\nSi hiciste este cambio, no necesitas hacer nada más.\n\nSi no cambiaste tu contraseña, contacta al soporte de inmediato en hello@supericons.dev."
  },
  "hi": {
    "subject": "आपका Supericons पासवर्ड बदल गया है",
    "html": "<!doctype html>\n<html lang=\"hi\" dir=\"ltr\">\n  <head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <link href=\"https://fonts.googleapis.com/css2?family=Nunito:ital,wght@1,900&display=swap\" rel=\"stylesheet\">\n    <style>\n      @import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@1,900&display=swap');\n    </style>\n    <title>आपका पासवर्ड बदल गया है</title>\n  </head>\n  <body style=\"margin: 0; padding: 0; background-color: #0e0e0e;\">\n    <!-- supericons-auth-email-v2-link-only-2026-05-12 -->\n    <div style=\"padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; text-align: center;\">\n      <div style=\"max-width: 480px; margin: 0 auto;\">\n        <a href=\"https://supericons.dev\" style=\"display: inline-flex; align-items: center; justify-content: center; gap: 2px; margin-bottom: 32px; text-decoration: none;\">\n          <img src=\"https://supericons.dev/logo_email_header.png\" alt=\"Supericons\" height=\"34\" style=\"display: block; border: 0; outline: none; text-decoration: none;\">\n        </a>\n        <div style=\"background-color: #131313; border: 1px solid #262626; border-radius: 16px; padding: 48px 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); text-align: left;\">\n          <div style=\"font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #FF4F00; margin-bottom: 12px;\">सुरक्षा सूचना</div>\n          <h1 style=\"font-family: 'Nunito', sans-serif; font-size: 24px; font-weight: 700; margin: 0 0 16px; color: #ffffff; line-height: 1.25;\">आपका पासवर्ड बदल गया है</h1>\n          <p style=\"margin: 0; color: #cccaca; font-size: 16px; line-height: 1.7;\">यह पुष्टि है कि आपके Supericons खाते __SUPERICONS_RECIPIENT_EMAIL__ का पासवर्ड अभी अपडेट किया गया है।</p>\n          \n          \n          <p style=\"margin: 30px 0 0; color: #a7a7a7; font-size: 14px; line-height: 1.7;\">अगर आपने यह बदलाव किया है, तो कोई और कार्रवाई आवश्यक नहीं है।</p>\n          <p style=\"margin: 16px 0 0; color: #f6f6f6; font-size: 15px; line-height: 1.7;\">अगर आपने अपना पासवर्ड नहीं बदला है, तो तुरंत hello@supericons.dev पर सहायता से संपर्क करें।</p>\n        </div>\n      </div>\n    </div>\n  </body>\n</html>",
    "text": "आपका पासवर्ड बदल गया है\n\nयह पुष्टि है कि आपके Supericons खाते __SUPERICONS_RECIPIENT_EMAIL__ का पासवर्ड अभी अपडेट किया गया है।\n\nअगर आपने यह बदलाव किया है, तो कोई और कार्रवाई आवश्यक नहीं है।\n\nअगर आपने अपना पासवर्ड नहीं बदला है, तो तुरंत hello@supericons.dev पर सहायता से संपर्क करें।"
  },
  "ja": {
    "subject": "Supericons のパスワードが変更されました",
    "html": "<!doctype html>\n<html lang=\"ja\" dir=\"ltr\">\n  <head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <link href=\"https://fonts.googleapis.com/css2?family=Nunito:ital,wght@1,900&display=swap\" rel=\"stylesheet\">\n    <style>\n      @import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@1,900&display=swap');\n    </style>\n    <title>パスワードが変更されました</title>\n  </head>\n  <body style=\"margin: 0; padding: 0; background-color: #0e0e0e;\">\n    <!-- supericons-auth-email-v2-link-only-2026-05-12 -->\n    <div style=\"padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; text-align: center;\">\n      <div style=\"max-width: 480px; margin: 0 auto;\">\n        <a href=\"https://supericons.dev\" style=\"display: inline-flex; align-items: center; justify-content: center; gap: 2px; margin-bottom: 32px; text-decoration: none;\">\n          <img src=\"https://supericons.dev/logo_email_header.png\" alt=\"Supericons\" height=\"34\" style=\"display: block; border: 0; outline: none; text-decoration: none;\">\n        </a>\n        <div style=\"background-color: #131313; border: 1px solid #262626; border-radius: 16px; padding: 48px 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); text-align: left;\">\n          <div style=\"font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #FF4F00; margin-bottom: 12px;\">セキュリティ通知</div>\n          <h1 style=\"font-family: 'Nunito', sans-serif; font-size: 24px; font-weight: 700; margin: 0 0 16px; color: #ffffff; line-height: 1.25;\">パスワードが変更されました</h1>\n          <p style=\"margin: 0; color: #cccaca; font-size: 16px; line-height: 1.7;\">Supericons アカウント __SUPERICONS_RECIPIENT_EMAIL__ のパスワードが更新されたことをお知らせします。</p>\n          \n          \n          <p style=\"margin: 30px 0 0; color: #a7a7a7; font-size: 14px; line-height: 1.7;\">この変更に心当たりがある場合、追加の操作は不要です。</p>\n          <p style=\"margin: 16px 0 0; color: #f6f6f6; font-size: 15px; line-height: 1.7;\">パスワードを変更していない場合は、すぐに hello@supericons.dev までお問い合わせください。</p>\n        </div>\n      </div>\n    </div>\n  </body>\n</html>",
    "text": "パスワードが変更されました\n\nSupericons アカウント __SUPERICONS_RECIPIENT_EMAIL__ のパスワードが更新されたことをお知らせします。\n\nこの変更に心当たりがある場合、追加の操作は不要です。\n\nパスワードを変更していない場合は、すぐに hello@supericons.dev までお問い合わせください。"
  },
  "ko": {
    "subject": "Supericons 비밀번호가 변경되었습니다",
    "html": "<!doctype html>\n<html lang=\"ko\" dir=\"ltr\">\n  <head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <link href=\"https://fonts.googleapis.com/css2?family=Nunito:ital,wght@1,900&display=swap\" rel=\"stylesheet\">\n    <style>\n      @import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@1,900&display=swap');\n    </style>\n    <title>비밀번호가 변경되었습니다</title>\n  </head>\n  <body style=\"margin: 0; padding: 0; background-color: #0e0e0e;\">\n    <!-- supericons-auth-email-v2-link-only-2026-05-12 -->\n    <div style=\"padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; text-align: center;\">\n      <div style=\"max-width: 480px; margin: 0 auto;\">\n        <a href=\"https://supericons.dev\" style=\"display: inline-flex; align-items: center; justify-content: center; gap: 2px; margin-bottom: 32px; text-decoration: none;\">\n          <img src=\"https://supericons.dev/logo_email_header.png\" alt=\"Supericons\" height=\"34\" style=\"display: block; border: 0; outline: none; text-decoration: none;\">\n        </a>\n        <div style=\"background-color: #131313; border: 1px solid #262626; border-radius: 16px; padding: 48px 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); text-align: left;\">\n          <div style=\"font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #FF4F00; margin-bottom: 12px;\">보안 알림</div>\n          <h1 style=\"font-family: 'Nunito', sans-serif; font-size: 24px; font-weight: 700; margin: 0 0 16px; color: #ffffff; line-height: 1.25;\">비밀번호가 변경되었습니다</h1>\n          <p style=\"margin: 0; color: #cccaca; font-size: 16px; line-height: 1.7;\">Supericons 계정 __SUPERICONS_RECIPIENT_EMAIL__의 비밀번호가 방금 업데이트되었음을 확인합니다.</p>\n          \n          \n          <p style=\"margin: 30px 0 0; color: #a7a7a7; font-size: 14px; line-height: 1.7;\">직접 변경했다면 추가 조치는 필요하지 않습니다.</p>\n          <p style=\"margin: 16px 0 0; color: #f6f6f6; font-size: 15px; line-height: 1.7;\">비밀번호를 변경하지 않았다면 즉시 hello@supericons.dev로 지원팀에 문의하세요.</p>\n        </div>\n      </div>\n    </div>\n  </body>\n</html>",
    "text": "비밀번호가 변경되었습니다\n\nSupericons 계정 __SUPERICONS_RECIPIENT_EMAIL__의 비밀번호가 방금 업데이트되었음을 확인합니다.\n\n직접 변경했다면 추가 조치는 필요하지 않습니다.\n\n비밀번호를 변경하지 않았다면 즉시 hello@supericons.dev로 지원팀에 문의하세요."
  },
  "pt": {
    "subject": "Sua senha do Supericons foi alterada",
    "html": "<!doctype html>\n<html lang=\"pt\" dir=\"ltr\">\n  <head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <link href=\"https://fonts.googleapis.com/css2?family=Nunito:ital,wght@1,900&display=swap\" rel=\"stylesheet\">\n    <style>\n      @import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@1,900&display=swap');\n    </style>\n    <title>Sua senha foi alterada</title>\n  </head>\n  <body style=\"margin: 0; padding: 0; background-color: #0e0e0e;\">\n    <!-- supericons-auth-email-v2-link-only-2026-05-12 -->\n    <div style=\"padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; text-align: center;\">\n      <div style=\"max-width: 480px; margin: 0 auto;\">\n        <a href=\"https://supericons.dev\" style=\"display: inline-flex; align-items: center; justify-content: center; gap: 2px; margin-bottom: 32px; text-decoration: none;\">\n          <img src=\"https://supericons.dev/logo_email_header.png\" alt=\"Supericons\" height=\"34\" style=\"display: block; border: 0; outline: none; text-decoration: none;\">\n        </a>\n        <div style=\"background-color: #131313; border: 1px solid #262626; border-radius: 16px; padding: 48px 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); text-align: left;\">\n          <div style=\"font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #FF4F00; margin-bottom: 12px;\">Aviso de segurança</div>\n          <h1 style=\"font-family: 'Nunito', sans-serif; font-size: 24px; font-weight: 700; margin: 0 0 16px; color: #ffffff; line-height: 1.25;\">Sua senha foi alterada</h1>\n          <p style=\"margin: 0; color: #cccaca; font-size: 16px; line-height: 1.7;\">Esta mensagem confirma que a senha da sua conta Supericons __SUPERICONS_RECIPIENT_EMAIL__ acabou de ser atualizada.</p>\n          \n          \n          <p style=\"margin: 30px 0 0; color: #a7a7a7; font-size: 14px; line-height: 1.7;\">Se você fez essa alteração, nenhuma outra ação é necessária.</p>\n          <p style=\"margin: 16px 0 0; color: #f6f6f6; font-size: 15px; line-height: 1.7;\">Se você não alterou sua senha, fale com o suporte imediatamente em hello@supericons.dev.</p>\n        </div>\n      </div>\n    </div>\n  </body>\n</html>",
    "text": "Sua senha foi alterada\n\nEsta mensagem confirma que a senha da sua conta Supericons __SUPERICONS_RECIPIENT_EMAIL__ acabou de ser atualizada.\n\nSe você fez essa alteração, nenhuma outra ação é necessária.\n\nSe você não alterou sua senha, fale com o suporte imediatamente em hello@supericons.dev."
  },
  "th": {
    "subject": "รหัสผ่าน Supericons ของคุณถูกเปลี่ยนแล้ว",
    "html": "<!doctype html>\n<html lang=\"th\" dir=\"ltr\">\n  <head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <link href=\"https://fonts.googleapis.com/css2?family=Nunito:ital,wght@1,900&display=swap\" rel=\"stylesheet\">\n    <style>\n      @import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@1,900&display=swap');\n    </style>\n    <title>รหัสผ่านของคุณถูกเปลี่ยนแล้ว</title>\n  </head>\n  <body style=\"margin: 0; padding: 0; background-color: #0e0e0e;\">\n    <!-- supericons-auth-email-v2-link-only-2026-05-12 -->\n    <div style=\"padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; text-align: center;\">\n      <div style=\"max-width: 480px; margin: 0 auto;\">\n        <a href=\"https://supericons.dev\" style=\"display: inline-flex; align-items: center; justify-content: center; gap: 2px; margin-bottom: 32px; text-decoration: none;\">\n          <img src=\"https://supericons.dev/logo_email_header.png\" alt=\"Supericons\" height=\"34\" style=\"display: block; border: 0; outline: none; text-decoration: none;\">\n        </a>\n        <div style=\"background-color: #131313; border: 1px solid #262626; border-radius: 16px; padding: 48px 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); text-align: left;\">\n          <div style=\"font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #FF4F00; margin-bottom: 12px;\">แจ้งเตือนความปลอดภัย</div>\n          <h1 style=\"font-family: 'Nunito', sans-serif; font-size: 24px; font-weight: 700; margin: 0 0 16px; color: #ffffff; line-height: 1.25;\">รหัสผ่านของคุณถูกเปลี่ยนแล้ว</h1>\n          <p style=\"margin: 0; color: #cccaca; font-size: 16px; line-height: 1.7;\">นี่คือการยืนยันว่ารหัสผ่านสำหรับบัญชี Supericons __SUPERICONS_RECIPIENT_EMAIL__ ของคุณเพิ่งถูกอัปเดต</p>\n          \n          \n          <p style=\"margin: 30px 0 0; color: #a7a7a7; font-size: 14px; line-height: 1.7;\">หากคุณเป็นผู้เปลี่ยนแปลง ไม่จำเป็นต้องดำเนินการเพิ่มเติม</p>\n          <p style=\"margin: 16px 0 0; color: #f6f6f6; font-size: 15px; line-height: 1.7;\">หากคุณไม่ได้เปลี่ยนรหัสผ่าน โปรดติดต่อฝ่ายสนับสนุนทันทีที่ hello@supericons.dev</p>\n        </div>\n      </div>\n    </div>\n  </body>\n</html>",
    "text": "รหัสผ่านของคุณถูกเปลี่ยนแล้ว\n\nนี่คือการยืนยันว่ารหัสผ่านสำหรับบัญชี Supericons __SUPERICONS_RECIPIENT_EMAIL__ ของคุณเพิ่งถูกอัปเดต\n\nหากคุณเป็นผู้เปลี่ยนแปลง ไม่จำเป็นต้องดำเนินการเพิ่มเติม\n\nหากคุณไม่ได้เปลี่ยนรหัสผ่าน โปรดติดต่อฝ่ายสนับสนุนทันทีที่ hello@supericons.dev"
  },
  "vi": {
    "subject": "Mật khẩu Supericons của bạn đã được thay đổi",
    "html": "<!doctype html>\n<html lang=\"vi\" dir=\"ltr\">\n  <head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <link href=\"https://fonts.googleapis.com/css2?family=Nunito:ital,wght@1,900&display=swap\" rel=\"stylesheet\">\n    <style>\n      @import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@1,900&display=swap');\n    </style>\n    <title>Mật khẩu của bạn đã được thay đổi</title>\n  </head>\n  <body style=\"margin: 0; padding: 0; background-color: #0e0e0e;\">\n    <!-- supericons-auth-email-v2-link-only-2026-05-12 -->\n    <div style=\"padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; text-align: center;\">\n      <div style=\"max-width: 480px; margin: 0 auto;\">\n        <a href=\"https://supericons.dev\" style=\"display: inline-flex; align-items: center; justify-content: center; gap: 2px; margin-bottom: 32px; text-decoration: none;\">\n          <img src=\"https://supericons.dev/logo_email_header.png\" alt=\"Supericons\" height=\"34\" style=\"display: block; border: 0; outline: none; text-decoration: none;\">\n        </a>\n        <div style=\"background-color: #131313; border: 1px solid #262626; border-radius: 16px; padding: 48px 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); text-align: left;\">\n          <div style=\"font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #FF4F00; margin-bottom: 12px;\">Thông báo bảo mật</div>\n          <h1 style=\"font-family: 'Nunito', sans-serif; font-size: 24px; font-weight: 700; margin: 0 0 16px; color: #ffffff; line-height: 1.25;\">Mật khẩu của bạn đã được thay đổi</h1>\n          <p style=\"margin: 0; color: #cccaca; font-size: 16px; line-height: 1.7;\">Email này xác nhận rằng mật khẩu cho tài khoản Supericons __SUPERICONS_RECIPIENT_EMAIL__ của bạn vừa được cập nhật.</p>\n          \n          \n          <p style=\"margin: 30px 0 0; color: #a7a7a7; font-size: 14px; line-height: 1.7;\">Nếu bạn đã thực hiện thay đổi này, bạn không cần làm gì thêm.</p>\n          <p style=\"margin: 16px 0 0; color: #f6f6f6; font-size: 15px; line-height: 1.7;\">Nếu bạn không đổi mật khẩu, hãy liên hệ hỗ trợ ngay tại hello@supericons.dev.</p>\n        </div>\n      </div>\n    </div>\n  </body>\n</html>",
    "text": "Mật khẩu của bạn đã được thay đổi\n\nEmail này xác nhận rằng mật khẩu cho tài khoản Supericons __SUPERICONS_RECIPIENT_EMAIL__ của bạn vừa được cập nhật.\n\nNếu bạn đã thực hiện thay đổi này, bạn không cần làm gì thêm.\n\nNếu bạn không đổi mật khẩu, hãy liên hệ hỗ trợ ngay tại hello@supericons.dev."
  },
  "zh-Hans": {
    "subject": "你的 Supericons 密码已更改",
    "html": "<!doctype html>\n<html lang=\"zh-Hans\" dir=\"ltr\">\n  <head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <link href=\"https://fonts.googleapis.com/css2?family=Nunito:ital,wght@1,900&display=swap\" rel=\"stylesheet\">\n    <style>\n      @import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@1,900&display=swap');\n    </style>\n    <title>你的密码已更改</title>\n  </head>\n  <body style=\"margin: 0; padding: 0; background-color: #0e0e0e;\">\n    <!-- supericons-auth-email-v2-link-only-2026-05-12 -->\n    <div style=\"padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; text-align: center;\">\n      <div style=\"max-width: 480px; margin: 0 auto;\">\n        <a href=\"https://supericons.dev\" style=\"display: inline-flex; align-items: center; justify-content: center; gap: 2px; margin-bottom: 32px; text-decoration: none;\">\n          <img src=\"https://supericons.dev/logo_email_header.png\" alt=\"Supericons\" height=\"34\" style=\"display: block; border: 0; outline: none; text-decoration: none;\">\n        </a>\n        <div style=\"background-color: #131313; border: 1px solid #262626; border-radius: 16px; padding: 48px 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); text-align: left;\">\n          <div style=\"font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #FF4F00; margin-bottom: 12px;\">安全通知</div>\n          <h1 style=\"font-family: 'Nunito', sans-serif; font-size: 24px; font-weight: 700; margin: 0 0 16px; color: #ffffff; line-height: 1.25;\">你的密码已更改</h1>\n          <p style=\"margin: 0; color: #cccaca; font-size: 16px; line-height: 1.7;\">这封邮件确认你的 Supericons 账户 __SUPERICONS_RECIPIENT_EMAIL__ 的密码刚刚已更新。</p>\n          \n          \n          <p style=\"margin: 30px 0 0; color: #a7a7a7; font-size: 14px; line-height: 1.7;\">如果这是你本人操作，则无需采取其他行动。</p>\n          <p style=\"margin: 16px 0 0; color: #f6f6f6; font-size: 15px; line-height: 1.7;\">如果你没有更改密码，请立即通过 hello@supericons.dev 联系支持团队。</p>\n        </div>\n      </div>\n    </div>\n  </body>\n</html>",
    "text": "你的密码已更改\n\n这封邮件确认你的 Supericons 账户 __SUPERICONS_RECIPIENT_EMAIL__ 的密码刚刚已更新。\n\n如果这是你本人操作，则无需采取其他行动。\n\n如果你没有更改密码，请立即通过 hello@supericons.dev 联系支持团队。"
  },
  "zh-Hant": {
    "subject": "你的 Supericons 密碼已變更",
    "html": "<!doctype html>\n<html lang=\"zh-Hant\" dir=\"ltr\">\n  <head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <link href=\"https://fonts.googleapis.com/css2?family=Nunito:ital,wght@1,900&display=swap\" rel=\"stylesheet\">\n    <style>\n      @import url('https://fonts.googleapis.com/css2?family=Nunito:ital,wght@1,900&display=swap');\n    </style>\n    <title>你的密碼已變更</title>\n  </head>\n  <body style=\"margin: 0; padding: 0; background-color: #0e0e0e;\">\n    <!-- supericons-auth-email-v2-link-only-2026-05-12 -->\n    <div style=\"padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; text-align: center;\">\n      <div style=\"max-width: 480px; margin: 0 auto;\">\n        <a href=\"https://supericons.dev\" style=\"display: inline-flex; align-items: center; justify-content: center; gap: 2px; margin-bottom: 32px; text-decoration: none;\">\n          <img src=\"https://supericons.dev/logo_email_header.png\" alt=\"Supericons\" height=\"34\" style=\"display: block; border: 0; outline: none; text-decoration: none;\">\n        </a>\n        <div style=\"background-color: #131313; border: 1px solid #262626; border-radius: 16px; padding: 48px 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); text-align: left;\">\n          <div style=\"font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #FF4F00; margin-bottom: 12px;\">安全通知</div>\n          <h1 style=\"font-family: 'Nunito', sans-serif; font-size: 24px; font-weight: 700; margin: 0 0 16px; color: #ffffff; line-height: 1.25;\">你的密碼已變更</h1>\n          <p style=\"margin: 0; color: #cccaca; font-size: 16px; line-height: 1.7;\">這封郵件確認你的 Supericons 帳戶 __SUPERICONS_RECIPIENT_EMAIL__ 的密碼剛剛已更新。</p>\n          \n          \n          <p style=\"margin: 30px 0 0; color: #a7a7a7; font-size: 14px; line-height: 1.7;\">如果這是你本人操作，則不需要採取其他行動。</p>\n          <p style=\"margin: 16px 0 0; color: #f6f6f6; font-size: 15px; line-height: 1.7;\">如果你沒有變更密碼，請立即透過 hello@supericons.dev 聯絡支援團隊。</p>\n        </div>\n      </div>\n    </div>\n  </body>\n</html>",
    "text": "你的密碼已變更\n\n這封郵件確認你的 Supericons 帳戶 __SUPERICONS_RECIPIENT_EMAIL__ 的密碼剛剛已更新。\n\n如果這是你本人操作，則不需要採取其他行動。\n\n如果你沒有變更密碼，請立即透過 hello@supericons.dev 聯絡支援團隊。"
  }
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(value: string | null | undefined) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeLocale(locale: unknown) {
  if (typeof locale !== 'string') return 'en';
  const value = locale.trim();
  const mapped = localeAliases[value] || value;
  return supportedLocales.has(mapped) ? mapped : 'en';
}

function renderPasswordChangedMessage(locale: string, email: string) {
  const template = passwordChangedMessages[locale] || passwordChangedMessages.en;
  return {
    subject: template.subject,
    text: template.text.replaceAll(EMAIL_PLACEHOLDER, email),
    html: template.html.replaceAll(EMAIL_PLACEHOLDER, escapeHtml(email)),
  };
}

async function sendResendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text: string }) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured');

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
      tags: [
        { name: 'template_version', value: EMAIL_TEMPLATE_VERSION },
        { name: 'intent', value: EMAIL_INTENT },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend email failed: ${response.status} ${body}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.email) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const payload = await req.json().catch(() => ({})) as Record<string, unknown>;
    const locale = normalizeLocale(payload.locale || user.user_metadata?.locale);
    const message = renderPasswordChangedMessage(locale, user.email);

    await sendResendEmail({ to: user.email, ...message });
    console.info('[notify-password-changed] Sent password change email', {
      intent: 'password_changed',
      locale,
      templateVersion: EMAIL_TEMPLATE_VERSION,
    });

    return jsonResponse({ ok: true, templateVersion: EMAIL_TEMPLATE_VERSION });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send password change notification';
    console.error('[notify-password-changed] Password change notification failed:', message);
    return jsonResponse({ error: message }, 500);
  }
});
