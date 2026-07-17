import fs from 'node:fs';
import path from 'node:path';

const messagesDir = path.join(process.cwd(), 'data', 'i18n', 'messages');

function setPath(target, dottedPath, value) {
  if (typeof value === 'undefined') return;
  const parts = dottedPath.split('.');
  let node = target;
  for (const part of parts.slice(0, -1)) {
    node[part] ??= {};
    node = node[part];
  }
  node[parts.at(-1)] = value;
}

function expandGroup(locale, groupName, keys, values) {
  if (!values) return {};
  if (!Array.isArray(values)) {
    throw new Error(`${locale}.${groupName} must be an array`);
  }
  if (values.length !== keys.length) {
    throw new Error(`${locale}.${groupName} has ${values.length} values for ${keys.length} keys`);
  }
  return Object.fromEntries(keys.map((key, index) => [key, values[index]]));
}

const common = {
  en: {
    'checkout.openingPortal': 'Opening subscription portal...',
    'checkout.signInAgainPortal': 'Sign in again to open the subscription portal.',
    'checkout.portalUnavailable': 'Subscription portal is unavailable.',
    'checkout.portalFailed': 'Could not open subscription portal.',
    'account.toast.updated': 'Account updated.',
    'account.profile.enterName': 'Enter a display name to save.',
    'account.profile.nameTooShort': 'Use at least 2 characters for your display name.',
    'account.profile.saved': 'Display name saved.',
    'account.profile.saveFailed': 'Could not save display name.',
    'account.password.noEmail': 'No signed-in email is available for this account.',
    'account.password.addStatus': 'Set a password you can use alongside Google sign-in.',
    'account.password.resetSent': 'A password reset email has been sent to {email}.',
    'account.password.resetToast': 'Password reset email sent.',
    'auth.toast.passwordSignInAdded': 'Password sign-in added.',
    'auth.toast.passwordUpdated': 'Password updated.',
    'auth.copy.default.signin.desc': 'Access animated icon packs, manage purchases, and unlock Pro features.',
    'auth.copy.default.signup.desc': 'Save purchases, sync downloads, and unlock Pro features from one account.',
    'auth.copy.purchase.signin.title': 'Sign in to continue your purchase',
    'auth.copy.purchase.signin.desc': 'Keep collection purchases tied to one account so downloads and updates stay in sync.',
    'auth.copy.purchase.signin.submit': 'Sign in to continue',
    'auth.copy.purchase.signin.toggle': 'Need an account first?',
    'auth.copy.purchase.signup.title': 'Create your account to buy collections',
    'auth.copy.purchase.signup.desc': 'Your purchases, downloads, and future updates will stay connected to this account.',
    'auth.copy.subscribe.signin.title': 'Sign in to go Pro',
    'auth.copy.subscribe.signin.desc': 'Continue to Pro checkout for MCP access, workflow tools, and premium collections.',
    'auth.copy.subscribe.signin.submit': 'Sign in to continue',
    'auth.copy.subscribe.signin.toggle': 'Need an account first?',
    'auth.copy.subscribe.signup.title': 'Create your account to go Pro',
    'auth.copy.subscribe.signup.desc': 'Set up your account first, then continue to Pro checkout when you are ready.',
    'auth.copy.pro.signin.title': 'Sign in to unlock Pro tools',
    'auth.copy.pro.signin.desc': 'Use Motion Lab exports, Converter downloads, and premium MCP access from one account.',
    'auth.copy.pro.signin.note': 'Free account first. Upgrade only when you want Pro features.',
    'auth.copy.pro.signin.submit': 'Sign in to continue',
    'auth.copy.pro.signin.toggle': 'Need an account first?',
    'auth.copy.pro.signup.title': 'Create your account to unlock Pro tools',
    'auth.copy.pro.signup.desc': 'Save your workspace and keep premium tools connected to one account.',
    'auth.copy.pro.signup.note': 'Free account first. Upgrade only when you want Pro features.',
    'auth.forgot.description': 'Enter your account email and we will send you a secure reset link.',
    'auth.forgot.note': 'The recovery link will bring you back here to choose a new password.',
    'auth.forgot.sentStatus': 'If an account matches {email}, you will get a reset link shortly.',
    'auth.reset.title': 'Set a new password',
    'auth.reset.description': 'Choose a new password to secure your Supericons account.',
    'auth.reset.note': 'Use at least 8 characters. Strong passwords are recommended.',
    'auth.reset.addDescription': 'Create a password so you can sign in with email as well as Google.',
    'auth.reset.addNote': 'Google sign-in will keep working after you add password access.',
    'auth.reset.createForEmail': 'Create a password for {email}.',
    'auth.reset.chooseForEmail': 'Choose a new password for {email}.',
    'auth.reset.createForAccount': 'Create a password for your account.',
    'auth.reset.chooseForAccount': 'Choose a new password for your account.',
    'auth.verify.existing.modalTitle': 'Use your existing account',
    'auth.verify.existing.modalDesc': 'This email may already belong to a Supericons account. Sign in instead of creating another one.',
    'auth.verify.existing.modalNote': 'If you usually sign in with Google, continue with Google. Otherwise go back and sign in with your email.',
    'auth.verify.existing.stageTitle': 'Account already exists',
    'auth.verify.existing.stageText': '{email} may already be tied to an existing Supericons account.',
    'auth.verify.unconfirmed.modalTitle': 'Confirm your email',
    'auth.verify.unconfirmed.modalDesc': 'Check your inbox to confirm your email address before signing in.',
    'auth.verify.unconfirmed.modalNote': 'If you cannot find the email, or the link no longer works, send a new confirmation email below.',
    'auth.verify.unconfirmed.stageTitle': 'Email confirmation needed',
    'auth.verify.unconfirmed.stageText': 'Send a new confirmation email to {email}.',
    'auth.verify.unconfirmed.resentStatus': 'A new confirmation email has been sent to {email}.',
    'auth.verify.callback.resetTitle': 'This reset link is no longer valid',
    'auth.verify.callback.linkTitle': 'This link is no longer valid',
    'auth.verify.callback.resetDesc': 'The password reset link is invalid, incomplete, or has expired.',
    'auth.verify.callback.linkDesc': 'The sign-in or recovery link is invalid, incomplete, or has expired.',
    'auth.verify.callback.resetNote': 'Request a fresh reset email and try again.',
    'auth.verify.callback.linkNote': 'Start over from Supericons and request a fresh email if needed.',
    'auth.verify.callback.stageTitle': 'Link expired or invalid',
    'auth.verify.callback.stageText': 'This link can no longer be used.',
    'auth.verify.pending.modalTitle': 'Check your email',
    'auth.verify.pending.modalDesc': 'Open the confirmation email to finish creating your Supericons account.',
    'auth.verify.pending.modalNote': 'If it does not show up right away, you can request another in about a minute.',
    'auth.verify.pending.stageTitle': 'Check your email',
    'auth.verify.pending.stageText': 'Look for the confirmation email we sent to {email}.',
    'auth.verify.pending.sentStatus': 'We sent a confirmation email to {email}. You can request another in about a minute.',
    'auth.verify.pending.resentStatus': 'Check {email} for a new confirmation email.'
  },
  'zh-Hans': {
    'checkout.openingPortal': '正在打开订阅管理页面...',
    'checkout.signInAgainPortal': '请重新登录以打开订阅管理页面。',
    'checkout.portalUnavailable': '订阅管理页面暂时不可用。',
    'checkout.portalFailed': '无法打开订阅管理页面。',
    'account.toast.updated': '账户已更新。',
    'account.profile.enterName': '请输入要保存的显示名称。',
    'account.profile.nameTooShort': '显示名称至少需要 2 个字符。',
    'account.profile.saved': '显示名称已保存。',
    'account.profile.saveFailed': '无法保存显示名称。',
    'account.password.noEmail': '此账户当前没有可用的登录邮箱。',
    'account.password.addStatus': '设置一个可与 Google 登录一起使用的密码。',
    'account.password.resetSent': '密码重置邮件已发送至 {email}。',
    'account.password.resetToast': '密码重置邮件已发送。',
    'auth.toast.passwordSignInAdded': '已添加密码登录。',
    'auth.toast.passwordUpdated': '密码已更新。',
    'auth.copy.default.signin.desc': '访问动效图标包、管理购买内容，并解锁 Pro 功能。',
    'auth.copy.default.signup.desc': '用一个账户保存购买内容、同步下载，并解锁 Pro 功能。',
    'auth.copy.purchase.signin.title': '登录以继续购买',
    'auth.copy.purchase.signin.desc': '将集合购买内容绑定到一个账户，让下载和更新保持同步。',
    'auth.copy.purchase.signin.submit': '登录并继续',
    'auth.copy.purchase.signin.toggle': '需要先创建账户吗？',
    'auth.copy.purchase.signup.title': '创建账户以购买集合',
    'auth.copy.purchase.signup.desc': '你的购买内容、下载和未来更新都会连接到这个账户。',
    'auth.copy.subscribe.signin.title': '登录以升级到 Pro',
    'auth.copy.subscribe.signin.desc': '继续前往 Pro 结账，获取 MCP 访问、工作流工具和高级集合。',
    'auth.copy.subscribe.signin.submit': '登录并继续',
    'auth.copy.subscribe.signin.toggle': '需要先创建账户吗？',
    'auth.copy.subscribe.signup.title': '创建账户以升级到 Pro',
    'auth.copy.subscribe.signup.desc': '先设置账户，准备好后再继续 Pro 结账。',
    'auth.copy.pro.signin.title': '登录以解锁 Pro 工具',
    'auth.copy.pro.signin.desc': '用一个账户使用 Motion Lab 导出、Converter 下载和高级 MCP 访问。',
    'auth.copy.pro.signin.note': '先使用免费账户。需要 Pro 功能时再升级。',
    'auth.copy.pro.signin.submit': '登录并继续',
    'auth.copy.pro.signin.toggle': '需要先创建账户吗？',
    'auth.copy.pro.signup.title': '创建账户以解锁 Pro 工具',
    'auth.copy.pro.signup.desc': '保存你的工作区，并将高级工具连接到一个账户。',
    'auth.copy.pro.signup.note': '先使用免费账户。需要 Pro 功能时再升级。',
    'auth.forgot.description': '输入你的账户邮箱，我们会发送安全的重置链接。',
    'auth.forgot.note': '恢复链接会带你回到这里，以便选择新密码。',
    'auth.forgot.sentStatus': '如果 {email} 匹配某个账户，你很快会收到重置链接。',
    'auth.reset.title': '设置新密码',
    'auth.reset.description': '选择一个新密码来保护你的 Supericons 账户。',
    'auth.reset.note': '请至少使用 8 个字符。建议使用强密码。',
    'auth.reset.addDescription': '创建密码后，你可以同时使用邮箱和 Google 登录。',
    'auth.reset.addNote': '添加密码登录后，Google 登录仍会继续可用。',
    'auth.reset.createForEmail': '为 {email} 创建密码。',
    'auth.reset.chooseForEmail': '为 {email} 选择新密码。',
    'auth.reset.createForAccount': '为你的账户创建密码。',
    'auth.reset.chooseForAccount': '为你的账户选择新密码。',
    'auth.verify.existing.modalTitle': '使用现有账户',
    'auth.verify.existing.modalDesc': '这个邮箱可能已属于某个 Supericons 账户。请登录，而不是创建另一个账户。',
    'auth.verify.existing.modalNote': '如果你通常使用 Google 登录，请继续使用 Google。否则请返回并用邮箱登录。',
    'auth.verify.existing.stageTitle': '账户已存在',
    'auth.verify.existing.stageText': '{email} 可能已绑定到现有的 Supericons 账户。',
    'auth.verify.unconfirmed.modalTitle': '确认你的邮箱',
    'auth.verify.unconfirmed.modalDesc': '登录前，请检查收件箱并确认你的邮箱地址。',
    'auth.verify.unconfirmed.modalNote': '如果找不到邮件，或链接不再有效，可以在下面发送新的确认邮件。',
    'auth.verify.unconfirmed.stageTitle': '需要邮箱确认',
    'auth.verify.unconfirmed.stageText': '向 {email} 发送新的确认邮件。',
    'auth.verify.unconfirmed.resentStatus': '新的确认邮件已发送至 {email}。',
    'auth.verify.callback.resetTitle': '此重置链接已失效',
    'auth.verify.callback.linkTitle': '此链接已失效',
    'auth.verify.callback.resetDesc': '密码重置链接无效、不完整或已过期。',
    'auth.verify.callback.linkDesc': '登录或恢复链接无效、不完整或已过期。',
    'auth.verify.callback.resetNote': '请请求新的重置邮件后再试。',
    'auth.verify.callback.linkNote': '请从 Supericons 重新开始，并在需要时请求新的邮件。',
    'auth.verify.callback.stageTitle': '链接已过期或无效',
    'auth.verify.callback.stageText': '此链接已无法使用。',
    'auth.verify.pending.modalTitle': '检查你的邮箱',
    'auth.verify.pending.modalDesc': '打开确认邮件，以完成 Supericons 账户创建。',
    'auth.verify.pending.modalNote': '如果邮件没有立即出现，你可以约一分钟后再请求一封。',
    'auth.verify.pending.stageTitle': '检查你的邮箱',
    'auth.verify.pending.stageText': '请查找我们发送到 {email} 的确认邮件。',
    'auth.verify.pending.sentStatus': '我们已向 {email} 发送确认邮件。约一分钟后可以再次请求。',
    'auth.verify.pending.resentStatus': '请检查 {email} 中的新确认邮件。'
  },
  'zh-Hant': {
    'checkout.openingPortal': '正在開啟訂閱管理頁面...',
    'checkout.signInAgainPortal': '請重新登入以開啟訂閱管理頁面。',
    'checkout.portalUnavailable': '訂閱管理頁面暫時無法使用。',
    'checkout.portalFailed': '無法開啟訂閱管理頁面。',
    'account.toast.updated': '帳戶已更新。',
    'account.profile.enterName': '請輸入要儲存的顯示名稱。',
    'account.profile.nameTooShort': '顯示名稱至少需要 2 個字元。',
    'account.profile.saved': '顯示名稱已儲存。',
    'account.profile.saveFailed': '無法儲存顯示名稱。',
    'account.password.noEmail': '此帳戶目前沒有可用的登入電子郵件。',
    'account.password.addStatus': '設定可與 Google 登入一起使用的密碼。',
    'account.password.resetSent': '密碼重設電子郵件已傳送至 {email}。',
    'account.password.resetToast': '密碼重設電子郵件已傳送。',
    'auth.toast.passwordSignInAdded': '已新增密碼登入。',
    'auth.toast.passwordUpdated': '密碼已更新。',
    'auth.copy.default.signin.desc': '存取動態圖示包、管理購買內容，並解鎖 Pro 功能。',
    'auth.copy.default.signup.desc': '用一個帳戶儲存購買內容、同步下載，並解鎖 Pro 功能。',
    'auth.copy.purchase.signin.title': '登入以繼續購買',
    'auth.copy.purchase.signin.desc': '將集合購買內容綁定到一個帳戶，讓下載和更新保持同步。',
    'auth.copy.purchase.signin.submit': '登入並繼續',
    'auth.copy.purchase.signin.toggle': '需要先建立帳戶嗎？',
    'auth.copy.purchase.signup.title': '建立帳戶以購買集合',
    'auth.copy.purchase.signup.desc': '你的購買內容、下載和未來更新都會連接到這個帳戶。',
    'auth.copy.subscribe.signin.title': '登入以升級到 Pro',
    'auth.copy.subscribe.signin.desc': '繼續前往 Pro 結帳，取得 MCP 存取、工作流程工具和高級集合。',
    'auth.copy.subscribe.signin.submit': '登入並繼續',
    'auth.copy.subscribe.signin.toggle': '需要先建立帳戶嗎？',
    'auth.copy.subscribe.signup.title': '建立帳戶以升級到 Pro',
    'auth.copy.subscribe.signup.desc': '先設定帳戶，準備好後再繼續 Pro 結帳。',
    'auth.copy.pro.signin.title': '登入以解鎖 Pro 工具',
    'auth.copy.pro.signin.desc': '用一個帳戶使用 Motion Lab 匯出、Converter 下載和高級 MCP 存取。',
    'auth.copy.pro.signin.note': '先使用免費帳戶。需要 Pro 功能時再升級。',
    'auth.copy.pro.signin.submit': '登入並繼續',
    'auth.copy.pro.signin.toggle': '需要先建立帳戶嗎？',
    'auth.copy.pro.signup.title': '建立帳戶以解鎖 Pro 工具',
    'auth.copy.pro.signup.desc': '儲存你的工作區，並將高級工具連接到一個帳戶。',
    'auth.copy.pro.signup.note': '先使用免費帳戶。需要 Pro 功能時再升級。',
    'auth.forgot.description': '輸入你的帳戶電子郵件，我們會傳送安全的重設連結。',
    'auth.forgot.note': '復原連結會帶你回到這裡，方便你選擇新密碼。',
    'auth.forgot.sentStatus': '如果 {email} 符合某個帳戶，你很快會收到重設連結。',
    'auth.reset.title': '設定新密碼',
    'auth.reset.description': '選擇新密碼來保護你的 Supericons 帳戶。',
    'auth.reset.note': '請至少使用 8 個字元。建議使用強密碼。',
    'auth.reset.addDescription': '建立密碼後，你可以同時使用電子郵件和 Google 登入。',
    'auth.reset.addNote': '新增密碼登入後，Google 登入仍會繼續可用。',
    'auth.reset.createForEmail': '為 {email} 建立密碼。',
    'auth.reset.chooseForEmail': '為 {email} 選擇新密碼。',
    'auth.reset.createForAccount': '為你的帳戶建立密碼。',
    'auth.reset.chooseForAccount': '為你的帳戶選擇新密碼。',
    'auth.verify.existing.modalTitle': '使用現有帳戶',
    'auth.verify.existing.modalDesc': '這個電子郵件可能已屬於某個 Supericons 帳戶。請登入，而不是建立另一個帳戶。',
    'auth.verify.existing.modalNote': '如果你通常使用 Google 登入，請繼續使用 Google。否則請返回並用電子郵件登入。',
    'auth.verify.existing.stageTitle': '帳戶已存在',
    'auth.verify.existing.stageText': '{email} 可能已綁定到現有的 Supericons 帳戶。',
    'auth.verify.unconfirmed.modalTitle': '確認你的電子郵件',
    'auth.verify.unconfirmed.modalDesc': '登入前，請檢查收件匣並確認你的電子郵件地址。',
    'auth.verify.unconfirmed.modalNote': '如果找不到郵件，或連結不再有效，可以在下方傳送新的確認信。',
    'auth.verify.unconfirmed.stageTitle': '需要電子郵件確認',
    'auth.verify.unconfirmed.stageText': '向 {email} 傳送新的確認信。',
    'auth.verify.unconfirmed.resentStatus': '新的確認信已傳送至 {email}。',
    'auth.verify.callback.resetTitle': '此重設連結已失效',
    'auth.verify.callback.linkTitle': '此連結已失效',
    'auth.verify.callback.resetDesc': '密碼重設連結無效、不完整或已過期。',
    'auth.verify.callback.linkDesc': '登入或復原連結無效、不完整或已過期。',
    'auth.verify.callback.resetNote': '請要求新的重設電子郵件後再試。',
    'auth.verify.callback.linkNote': '請從 Supericons 重新開始，並在需要時要求新的電子郵件。',
    'auth.verify.callback.stageTitle': '連結已過期或無效',
    'auth.verify.callback.stageText': '此連結已無法使用。',
    'auth.verify.pending.modalTitle': '檢查你的電子郵件',
    'auth.verify.pending.modalDesc': '開啟確認信，以完成 Supericons 帳戶建立。',
    'auth.verify.pending.modalNote': '如果郵件沒有立即出現，你可以約一分鐘後再要求一封。',
    'auth.verify.pending.stageTitle': '檢查你的電子郵件',
    'auth.verify.pending.stageText': '請查找我們傳送到 {email} 的確認信。',
    'auth.verify.pending.sentStatus': '我們已向 {email} 傳送確認信。約一分鐘後可以再次要求。',
    'auth.verify.pending.resentStatus': '請檢查 {email} 中的新確認信。'
  }
};

const western = {
  es: {
    portal: ['Abriendo el portal de suscripción...', 'Vuelve a iniciar sesión para abrir el portal de suscripción.', 'El portal de suscripción no está disponible.', 'No se pudo abrir el portal de suscripción.'],
    account: ['Cuenta actualizada.', 'Escribe un nombre visible para guardarlo.', 'Usa al menos 2 caracteres para tu nombre visible.', 'Nombre visible guardado.', 'No se pudo guardar el nombre visible.', 'No hay ningún correo de inicio de sesión disponible para esta cuenta.', 'Define una contraseña que puedas usar junto con el inicio de sesión con Google.', 'Se envió un correo de restablecimiento de contraseña a {email}.', 'Correo de restablecimiento de contraseña enviado.', 'Inicio de sesión con contraseña añadido.', 'Contraseña actualizada.'],
    copy: ['Accede a packs de iconos animados, gestiona compras y desbloquea funciones Pro.', 'Guarda compras, sincroniza descargas y desbloquea funciones Pro desde una sola cuenta.', 'Inicia sesión para continuar tu compra', 'Mantén las compras de colecciones vinculadas a una cuenta para que las descargas y actualizaciones estén sincronizadas.', 'Te traeremos de vuelta para que puedas continuar donde lo dejaste.', 'Inicia sesión y continúa', '¿Necesitas crear una cuenta primero?', 'Crea tu cuenta para comprar colecciones', 'Tus compras, descargas y futuras actualizaciones quedarán conectadas a esta cuenta.', 'Inicia sesión para pasar a Pro', 'Continúa al pago de Pro para acceder a MCP, herramientas de trabajo y colecciones premium.', 'Te traeremos de vuelta para que puedas continuar al pago.', 'Crea tu cuenta para pasar a Pro', 'Configura tu cuenta primero y luego continúa al pago de Pro cuando estés listo.', 'Inicia sesión para desbloquear herramientas Pro', 'Usa exportaciones de Motion Lab, descargas de Converter y acceso MCP premium desde una sola cuenta.', 'Cuenta gratuita primero. Actualiza solo cuando quieras funciones Pro.', 'Crea tu cuenta para desbloquear herramientas Pro', 'Guarda tu espacio de trabajo y mantén las herramientas premium conectadas a una sola cuenta.'],
    auth: ['Introduce el correo de tu cuenta y te enviaremos un enlace seguro de restablecimiento.', 'El enlace de recuperación te traerá de vuelta aquí para elegir una nueva contraseña.', 'Si una cuenta coincide con {email}, recibirás pronto un enlace de restablecimiento.', 'Define una nueva contraseña', 'Elige una nueva contraseña para proteger tu cuenta de Supericons.', 'Usa al menos 8 caracteres. Se recomienda una contraseña segura.', 'Crea una contraseña para poder iniciar sesión con correo electrónico además de Google.', 'El inicio de sesión con Google seguirá funcionando después de añadir acceso con contraseña.', 'Crea una contraseña para {email}.', 'Elige una nueva contraseña para {email}.', 'Crea una contraseña para tu cuenta.', 'Elige una nueva contraseña para tu cuenta.', 'Usa tu cuenta existente', 'Este correo puede pertenecer ya a una cuenta de Supericons. Inicia sesión en lugar de crear otra.', 'Si normalmente inicias sesión con Google, continúa con Google. Si no, vuelve e inicia sesión con tu correo.', 'La cuenta ya existe', '{email} puede estar vinculado a una cuenta de Supericons existente.', 'Confirma tu correo', 'Revisa tu bandeja de entrada para confirmar tu correo antes de iniciar sesión.', 'Si no encuentras el correo, o el enlace ya no funciona, envía un nuevo correo de confirmación abajo.', 'Se necesita confirmar el correo', 'Envía un nuevo correo de confirmación a {email}.', 'Se envió un nuevo correo de confirmación a {email}.', 'Este enlace de restablecimiento ya no es válido', 'Este enlace ya no es válido', 'El enlace de restablecimiento de contraseña no es válido, está incompleto o ha caducado.', 'El enlace de inicio de sesión o recuperación no es válido, está incompleto o ha caducado.', 'Solicita un nuevo correo de restablecimiento e inténtalo de nuevo.', 'Empieza de nuevo desde Supericons y solicita otro correo si lo necesitas.', 'Enlace caducado o no válido', 'Este enlace ya no se puede usar.', 'Revisa tu correo', 'Abre el correo de confirmación para terminar de crear tu cuenta de Supericons.', 'Si no aparece de inmediato, podrás solicitar otro en aproximadamente un minuto.', 'Busca el correo de confirmación que enviamos a {email}.', 'Enviamos un correo de confirmación a {email}. Puedes solicitar otro en aproximadamente un minuto.', 'Revisa {email} para ver el nuevo correo de confirmación.']
  },
  de: {
    portal: ['Abonnementportal wird geöffnet...', 'Melde dich erneut an, um das Abonnementportal zu öffnen.', 'Das Abonnementportal ist nicht verfügbar.', 'Das Abonnementportal konnte nicht geöffnet werden.'],
    account: ['Konto aktualisiert.', 'Gib einen Anzeigenamen ein, um ihn zu speichern.', 'Verwende mindestens 2 Zeichen für deinen Anzeigenamen.', 'Anzeigename gespeichert.', 'Anzeigename konnte nicht gespeichert werden.', 'Für dieses Konto ist keine angemeldete E-Mail verfügbar.', 'Lege ein Passwort fest, das du zusätzlich zur Google-Anmeldung verwenden kannst.', 'Eine E-Mail zum Zurücksetzen des Passworts wurde an {email} gesendet.', 'E-Mail zum Zurücksetzen des Passworts gesendet.', 'Passwort-Anmeldung hinzugefügt.', 'Passwort aktualisiert.'],
    copy: ['Greife auf animierte Icon-Pakete zu, verwalte Käufe und schalte Pro-Funktionen frei.', 'Speichere Käufe, synchronisiere Downloads und schalte Pro-Funktionen mit einem Konto frei.', 'Melde dich an, um deinen Kauf fortzusetzen', 'Verknüpfe Sammlungskäufe mit einem Konto, damit Downloads und Updates synchron bleiben.', 'Wir bringen dich zurück, damit du dort weitermachen kannst, wo du aufgehört hast.', 'Anmelden und fortfahren', 'Brauchst du zuerst ein Konto?', 'Erstelle dein Konto, um Sammlungen zu kaufen', 'Deine Käufe, Downloads und künftigen Updates bleiben mit diesem Konto verbunden.', 'Melde dich an, um Pro zu nutzen', 'Weiter zum Pro-Checkout für MCP-Zugriff, Workflow-Tools und Premium-Sammlungen.', 'Wir bringen dich zurück, damit du den Checkout fortsetzen kannst.', 'Erstelle dein Konto für Pro', 'Richte zuerst dein Konto ein und fahre dann mit dem Pro-Checkout fort, wenn du bereit bist.', 'Melde dich an, um Pro-Tools freizuschalten', 'Nutze Motion Lab-Exporte, Converter-Downloads und Premium-MCP-Zugriff über ein Konto.', 'Zuerst ein kostenloses Konto. Upgrade nur, wenn du Pro-Funktionen möchtest.', 'Erstelle dein Konto, um Pro-Tools freizuschalten', 'Speichere deinen Arbeitsbereich und verbinde Premium-Tools mit einem Konto.'],
    auth: ['Gib die E-Mail-Adresse deines Kontos ein, und wir senden dir einen sicheren Zurücksetzungslink.', 'Der Wiederherstellungslink bringt dich hierher zurück, damit du ein neues Passwort wählen kannst.', 'Wenn ein Konto zu {email} passt, erhältst du in Kürze einen Zurücksetzungslink.', 'Neues Passwort festlegen', 'Wähle ein neues Passwort, um dein Supericons-Konto zu schützen.', 'Verwende mindestens 8 Zeichen. Ein starkes Passwort wird empfohlen.', 'Erstelle ein Passwort, damit du dich auch per E-Mail und nicht nur mit Google anmelden kannst.', 'Die Google-Anmeldung funktioniert weiter, nachdem du den Passwortzugriff hinzugefügt hast.', 'Erstelle ein Passwort für {email}.', 'Wähle ein neues Passwort für {email}.', 'Erstelle ein Passwort für dein Konto.', 'Wähle ein neues Passwort für dein Konto.', 'Vorhandenes Konto verwenden', 'Diese E-Mail gehört möglicherweise bereits zu einem Supericons-Konto. Melde dich an, statt ein weiteres Konto zu erstellen.', 'Wenn du dich normalerweise mit Google anmeldest, fahre mit Google fort. Andernfalls gehe zurück und melde dich mit deiner E-Mail an.', 'Konto existiert bereits', '{email} ist möglicherweise bereits mit einem bestehenden Supericons-Konto verbunden.', 'Bestätige deine E-Mail', 'Prüfe deinen Posteingang und bestätige deine E-Mail-Adresse, bevor du dich anmeldest.', 'Wenn du die E-Mail nicht findest oder der Link nicht mehr funktioniert, sende unten eine neue Bestätigungs-E-Mail.', 'E-Mail-Bestätigung erforderlich', 'Sende eine neue Bestätigungs-E-Mail an {email}.', 'Eine neue Bestätigungs-E-Mail wurde an {email} gesendet.', 'Dieser Zurücksetzungslink ist nicht mehr gültig', 'Dieser Link ist nicht mehr gültig', 'Der Link zum Zurücksetzen des Passworts ist ungültig, unvollständig oder abgelaufen.', 'Der Anmelde- oder Wiederherstellungslink ist ungültig, unvollständig oder abgelaufen.', 'Fordere eine neue Zurücksetzungs-E-Mail an und versuche es erneut.', 'Starte erneut in Supericons und fordere bei Bedarf eine neue E-Mail an.', 'Link abgelaufen oder ungültig', 'Dieser Link kann nicht mehr verwendet werden.', 'Prüfe deine E-Mail', 'Öffne die Bestätigungs-E-Mail, um dein Supericons-Konto fertigzustellen.', 'Wenn sie nicht sofort erscheint, kannst du in etwa einer Minute eine weitere anfordern.', 'Suche nach der Bestätigungs-E-Mail, die wir an {email} gesendet haben.', 'Wir haben eine Bestätigungs-E-Mail an {email} gesendet. Du kannst in etwa einer Minute eine weitere anfordern.', 'Prüfe {email} auf eine neue Bestätigungs-E-Mail.']
  },
  pt: {
    portal: ['Abrindo o portal de assinatura...', 'Entre novamente para abrir o portal de assinatura.', 'O portal de assinatura está indisponível.', 'Não foi possível abrir o portal de assinatura.'],
    account: ['Conta atualizada.', 'Digite um nome de exibição para salvar.', 'Use pelo menos 2 caracteres no nome de exibição.', 'Nome de exibição salvo.', 'Não foi possível salvar o nome de exibição.', 'Não há e-mail de login disponível para esta conta.', 'Defina uma senha que você possa usar junto com o login do Google.', 'Um e-mail de redefinição de senha foi enviado para {email}.', 'E-mail de redefinição de senha enviado.', 'Login por senha adicionado.', 'Senha atualizada.'],
    copy: ['Acesse pacotes de ícones animados, gerencie compras e desbloqueie recursos Pro.', 'Salve compras, sincronize downloads e desbloqueie recursos Pro em uma só conta.', 'Entre para continuar sua compra', 'Mantenha compras de coleções vinculadas a uma conta para que downloads e atualizações fiquem sincronizados.', 'Traremos você de volta para continuar de onde parou.', 'Entrar e continuar', 'Precisa criar uma conta primeiro?', 'Crie sua conta para comprar coleções', 'Suas compras, downloads e futuras atualizações ficarão conectados a esta conta.', 'Entre para virar Pro', 'Continue para o checkout Pro para acesso MCP, ferramentas de fluxo de trabalho e coleções premium.', 'Traremos você de volta para continuar o checkout.', 'Crie sua conta para virar Pro', 'Configure sua conta primeiro e continue para o checkout Pro quando estiver pronto.', 'Entre para desbloquear ferramentas Pro', 'Use exportações do Motion Lab, downloads do Converter e acesso MCP premium em uma só conta.', 'Conta gratuita primeiro. Faça upgrade apenas quando quiser recursos Pro.', 'Crie sua conta para desbloquear ferramentas Pro', 'Salve seu espaço de trabalho e mantenha ferramentas premium conectadas a uma só conta.'],
    auth: ['Digite o e-mail da sua conta e enviaremos um link seguro de redefinição.', 'O link de recuperação trará você de volta aqui para escolher uma nova senha.', 'Se uma conta corresponder a {email}, você receberá um link de redefinição em breve.', 'Defina uma nova senha', 'Escolha uma nova senha para proteger sua conta Supericons.', 'Use pelo menos 8 caracteres. Senhas fortes são recomendadas.', 'Crie uma senha para entrar também por e-mail, além do Google.', 'O login com Google continuará funcionando depois que você adicionar acesso por senha.', 'Crie uma senha para {email}.', 'Escolha uma nova senha para {email}.', 'Crie uma senha para sua conta.', 'Escolha uma nova senha para sua conta.', 'Use sua conta existente', 'Este e-mail talvez já pertença a uma conta Supericons. Entre em vez de criar outra conta.', 'Se você costuma entrar com o Google, continue com o Google. Caso contrário, volte e entre com seu e-mail.', 'A conta já existe', '{email} talvez já esteja vinculado a uma conta Supericons existente.', 'Confirme seu e-mail', 'Verifique sua caixa de entrada para confirmar seu e-mail antes de entrar.', 'Se você não encontrar o e-mail, ou se o link não funcionar mais, envie um novo e-mail de confirmação abaixo.', 'Confirmação de e-mail necessária', 'Envie um novo e-mail de confirmação para {email}.', 'Um novo e-mail de confirmação foi enviado para {email}.', 'Este link de redefinição não é mais válido', 'Este link não é mais válido', 'O link de redefinição de senha é inválido, incompleto ou expirou.', 'O link de login ou recuperação é inválido, incompleto ou expirou.', 'Solicite um novo e-mail de redefinição e tente novamente.', 'Comece novamente pelo Supericons e solicite um novo e-mail se necessário.', 'Link expirado ou inválido', 'Este link não pode mais ser usado.', 'Verifique seu e-mail', 'Abra o e-mail de confirmação para terminar de criar sua conta Supericons.', 'Se ele não aparecer imediatamente, você poderá solicitar outro em cerca de um minuto.', 'Procure o e-mail de confirmação que enviamos para {email}.', 'Enviamos um e-mail de confirmação para {email}. Você poderá solicitar outro em cerca de um minuto.', 'Verifique {email} para encontrar um novo e-mail de confirmação.']
  }
};

const asian = {
  ja: {
    portal: ['サブスクリプションポータルを開いています...', 'サブスクリプションポータルを開くには、もう一度サインインしてください。', 'サブスクリプションポータルは利用できません。', 'サブスクリプションポータルを開けませんでした。'],
    account: ['アカウントを更新しました。', '保存する表示名を入力してください。', '表示名は 2 文字以上にしてください。', '表示名を保存しました。', '表示名を保存できませんでした。', 'このアカウントで利用できるサインイン用メールアドレスがありません。', 'Google サインインと併用できるパスワードを設定してください。', 'パスワードリセットメールを {email} に送信しました。', 'パスワードリセットメールを送信しました。', 'パスワードでのサインインを追加しました。', 'パスワードを更新しました。'],
    copy: ['アニメーションアイコンパック、購入管理、Pro 機能にアクセスできます。', '購入内容とダウンロードを同期し、1 つのアカウントで Pro 機能を利用できます。', '購入を続けるにはサインイン', 'コレクションの購入を 1 つのアカウントに結び付け、ダウンロードと更新を同期します。', '中断した場所に戻れるよう、この画面に戻します。', 'サインインして続行', '先にアカウントが必要ですか？', 'コレクション購入用のアカウントを作成', '購入内容、ダウンロード、今後の更新はこのアカウントに接続されます。', 'Pro に進むにはサインイン', 'MCP アクセス、ワークフローツール、プレミアムコレクションのために Pro の決済へ進みます。', '決済を続けられるよう、この画面に戻します。', 'Pro 用のアカウントを作成', '先にアカウントを設定し、準備できたら Pro の決済へ進みます。', 'Pro ツールを使うにはサインイン', 'Motion Lab の書き出し、Converter のダウンロード、プレミアム MCP アクセスを 1 つのアカウントで利用します。', 'まずは無料アカウントです。Pro 機能が必要なときだけアップグレードしてください。', 'Pro ツール用のアカウントを作成', 'ワークスペースを保存し、プレミアムツールを 1 つのアカウントに接続します。'],
    auth: ['アカウントのメールアドレスを入力すると、安全なリセットリンクを送信します。', '復旧リンクからここに戻り、新しいパスワードを選べます。', '{email} に一致するアカウントがある場合、まもなくリセットリンクが届きます。', '新しいパスワードを設定', 'Supericons アカウントを保護する新しいパスワードを選んでください。', '8 文字以上にしてください。強いパスワードをおすすめします。', 'Google に加えてメールでもサインインできるよう、パスワードを作成します。', 'パスワードアクセスを追加しても、Google サインインは引き続き使えます。', '{email} 用のパスワードを作成します。', '{email} 用の新しいパスワードを選びます。', 'アカウント用のパスワードを作成します。', 'アカウント用の新しいパスワードを選びます。', '既存のアカウントを使用', 'このメールアドレスは既存の Supericons アカウントに属している可能性があります。別のアカウントを作成せず、サインインしてください。', '普段 Google でサインインしている場合は Google で続行してください。それ以外の場合は戻ってメールでサインインしてください。', 'アカウントはすでに存在します', '{email} は既存の Supericons アカウントに関連付けられている可能性があります。', 'メールを確認してください', 'サインインする前に、受信トレイでメールアドレスを確認してください。', 'メールが見つからない場合やリンクが使えない場合は、下から新しい確認メールを送信できます。', 'メール確認が必要です', '{email} に新しい確認メールを送信します。', '新しい確認メールを {email} に送信しました。', 'このリセットリンクは無効です', 'このリンクは無効です', 'パスワードリセットリンクが無効、不完全、または期限切れです。', 'サインインまたは復旧リンクが無効、不完全、または期限切れです。', '新しいリセットメールをリクエストして、もう一度お試しください。', 'Supericons からやり直し、必要に応じて新しいメールをリクエストしてください。', 'リンクが期限切れまたは無効です', 'このリンクはもう使用できません。', 'メールを確認してください', '確認メールを開いて、Supericons アカウントの作成を完了してください。', 'すぐに届かない場合は、約 1 分後にもう一度リクエストできます。', '{email} に送信した確認メールを探してください。', '{email} に確認メールを送信しました。約 1 分後にもう一度リクエストできます。', '{email} で新しい確認メールを確認してください。']
  },
  ko: {
    portal: ['구독 포털을 여는 중입니다...', '구독 포털을 열려면 다시 로그인하세요.', '구독 포털을 사용할 수 없습니다.', '구독 포털을 열 수 없습니다.'],
    account: ['계정이 업데이트되었습니다.', '저장할 표시 이름을 입력하세요.', '표시 이름은 2자 이상이어야 합니다.', '표시 이름이 저장되었습니다.', '표시 이름을 저장할 수 없습니다.', '이 계정에 사용할 수 있는 로그인 이메일이 없습니다.', 'Google 로그인과 함께 사용할 수 있는 비밀번호를 설정하세요.', '비밀번호 재설정 이메일을 {email}(으)로 보냈습니다.', '비밀번호 재설정 이메일을 보냈습니다.', '비밀번호 로그인이 추가되었습니다.', '비밀번호가 업데이트되었습니다.'],
    copy: ['애니메이션 아이콘 팩, 구매 관리, Pro 기능에 접근하세요.', '구매 내역과 다운로드를 동기화하고 한 계정에서 Pro 기능을 사용하세요.', '구매를 계속하려면 로그인하세요', '컬렉션 구매를 한 계정에 연결해 다운로드와 업데이트를 동기화합니다.', '중단한 위치에서 계속할 수 있도록 다시 돌아오게 됩니다.', '로그인하고 계속', '먼저 계정이 필요하신가요?', '컬렉션 구매용 계정 만들기', '구매 내역, 다운로드, 향후 업데이트가 이 계정에 연결됩니다.', 'Pro로 전환하려면 로그인하세요', 'MCP 접근, 워크플로 도구, 프리미엄 컬렉션을 위해 Pro 결제로 이동합니다.', '결제를 계속할 수 있도록 다시 돌아오게 됩니다.', 'Pro용 계정 만들기', '먼저 계정을 설정한 뒤 준비되면 Pro 결제로 이동하세요.', 'Pro 도구를 잠금 해제하려면 로그인하세요', 'Motion Lab 내보내기, Converter 다운로드, 프리미엄 MCP 접근을 한 계정에서 사용하세요.', '먼저 무료 계정을 사용하세요. Pro 기능이 필요할 때만 업그레이드하세요.', 'Pro 도구용 계정 만들기', '작업 공간을 저장하고 프리미엄 도구를 한 계정에 연결하세요.'],
    auth: ['계정 이메일을 입력하면 안전한 재설정 링크를 보내드립니다.', '복구 링크를 통해 이곳으로 돌아와 새 비밀번호를 선택할 수 있습니다.', '{email}과 일치하는 계정이 있으면 곧 재설정 링크를 받게 됩니다.', '새 비밀번호 설정', 'Supericons 계정을 보호할 새 비밀번호를 선택하세요.', '8자 이상을 사용하세요. 강력한 비밀번호를 권장합니다.', 'Google뿐 아니라 이메일로도 로그인할 수 있도록 비밀번호를 만드세요.', '비밀번호 접근을 추가해도 Google 로그인은 계속 작동합니다.', '{email}의 비밀번호를 만드세요.', '{email}의 새 비밀번호를 선택하세요.', '계정의 비밀번호를 만드세요.', '계정의 새 비밀번호를 선택하세요.', '기존 계정 사용', '이 이메일은 이미 Supericons 계정에 속해 있을 수 있습니다. 새 계정을 만들지 말고 로그인하세요.', '보통 Google로 로그인한다면 Google로 계속 진행하세요. 그렇지 않으면 돌아가서 이메일로 로그인하세요.', '계정이 이미 있습니다', '{email}은(는) 기존 Supericons 계정에 연결되어 있을 수 있습니다.', '이메일 확인', '로그인하기 전에 받은 편지함에서 이메일 주소를 확인하세요.', '이메일을 찾을 수 없거나 링크가 더 이상 작동하지 않으면 아래에서 새 확인 이메일을 보내세요.', '이메일 확인이 필요합니다', '{email}(으)로 새 확인 이메일을 보냅니다.', '새 확인 이메일을 {email}(으)로 보냈습니다.', '이 재설정 링크는 더 이상 유효하지 않습니다', '이 링크는 더 이상 유효하지 않습니다', '비밀번호 재설정 링크가 유효하지 않거나 불완전하거나 만료되었습니다.', '로그인 또는 복구 링크가 유효하지 않거나 불완전하거나 만료되었습니다.', '새 재설정 이메일을 요청한 뒤 다시 시도하세요.', 'Supericons에서 다시 시작하고 필요하면 새 이메일을 요청하세요.', '링크가 만료되었거나 유효하지 않습니다', '이 링크는 더 이상 사용할 수 없습니다.', '이메일 확인', '확인 이메일을 열어 Supericons 계정 생성을 완료하세요.', '바로 보이지 않으면 약 1분 후 다시 요청할 수 있습니다.', '{email}(으)로 보낸 확인 이메일을 찾아보세요.', '{email}(으)로 확인 이메일을 보냈습니다. 약 1분 후 다시 요청할 수 있습니다.', '{email}에서 새 확인 이메일을 확인하세요.']
  }
};

const more = {
  ar: {
    portal: ['جار فتح بوابة الاشتراك...', 'سجل الدخول مرة أخرى لفتح بوابة الاشتراك.', 'بوابة الاشتراك غير متاحة حاليا.', 'تعذر فتح بوابة الاشتراك.'],
    account: ['تم تحديث الحساب.', 'أدخل اسما ظاهرا لحفظه.', 'استخدم حرفين على الأقل للاسم الظاهر.', 'تم حفظ الاسم الظاهر.', 'تعذر حفظ الاسم الظاهر.', 'لا يوجد بريد تسجيل دخول متاح لهذا الحساب.', 'عيّن كلمة مرور يمكنك استخدامها إلى جانب تسجيل الدخول عبر Google.', 'تم إرسال بريد إعادة تعيين كلمة المرور إلى {email}.', 'تم إرسال بريد إعادة تعيين كلمة المرور.', 'تمت إضافة تسجيل الدخول بكلمة مرور.', 'تم تحديث كلمة المرور.'],
    copy: ['يمكنك الوصول إلى حزم الأيقونات المتحركة وإدارة المشتريات وفتح مزايا Pro.', 'احفظ المشتريات وزامن التنزيلات وافتح مزايا Pro من حساب واحد.', 'سجل الدخول لمتابعة الشراء', 'اربط مشتريات المجموعات بحساب واحد حتى تبقى التنزيلات والتحديثات متزامنة.', 'سنعيدك لتتمكن من المتابعة من حيث توقفت.', 'سجل الدخول وتابع', 'هل تحتاج إلى حساب أولا؟', 'أنشئ حسابك لشراء المجموعات', 'ستبقى مشترياتك وتنزيلاتك وتحديثاتك المستقبلية مرتبطة بهذا الحساب.', 'سجل الدخول للانتقال إلى Pro', 'تابع إلى دفع Pro للوصول إلى MCP وأدوات سير العمل والمجموعات المميزة.', 'سنعيدك لتتمكن من متابعة الدفع.', 'أنشئ حسابك للانتقال إلى Pro', 'أعد حسابك أولا، ثم تابع إلى دفع Pro عندما تكون جاهزا.', 'سجل الدخول لفتح أدوات Pro', 'استخدم تصديرات Motion Lab وتنزيلات Converter ووصول MCP المميز من حساب واحد.', 'ابدأ بحساب مجاني. قم بالترقية فقط عندما تريد مزايا Pro.', 'أنشئ حسابك لفتح أدوات Pro', 'احفظ مساحة عملك واجعل الأدوات المميزة متصلة بحساب واحد.'],
    auth: ['أدخل بريد حسابك وسنرسل لك رابط إعادة تعيين آمنا.', 'سيعيدك رابط الاسترداد إلى هنا لاختيار كلمة مرور جديدة.', 'إذا تطابق حساب مع {email}، فستتلقى رابط إعادة تعيين قريبا.', 'عيّن كلمة مرور جديدة', 'اختر كلمة مرور جديدة لتأمين حساب Supericons الخاص بك.', 'استخدم 8 أحرف على الأقل. نوصي بكلمة مرور قوية.', 'أنشئ كلمة مرور لتسجيل الدخول بالبريد الإلكتروني إضافة إلى Google.', 'سيستمر تسجيل الدخول عبر Google بعد إضافة الوصول بكلمة مرور.', 'أنشئ كلمة مرور لـ {email}.', 'اختر كلمة مرور جديدة لـ {email}.', 'أنشئ كلمة مرور لحسابك.', 'اختر كلمة مرور جديدة لحسابك.', 'استخدم حسابك الحالي', 'قد يكون هذا البريد مرتبطا بالفعل بحساب Supericons. سجل الدخول بدلا من إنشاء حساب آخر.', 'إذا كنت تسجل الدخول عادة عبر Google، فتابع باستخدام Google. وإلا فارجع وسجل الدخول ببريدك الإلكتروني.', 'الحساب موجود بالفعل', 'قد يكون {email} مرتبطا بالفعل بحساب Supericons موجود.', 'أكد بريدك الإلكتروني', 'تحقق من صندوق الوارد لتأكيد بريدك الإلكتروني قبل تسجيل الدخول.', 'إذا لم تجد البريد أو لم يعد الرابط يعمل، فأرسل بريد تأكيد جديدا أدناه.', 'تأكيد البريد الإلكتروني مطلوب', 'أرسل بريد تأكيد جديدا إلى {email}.', 'تم إرسال بريد تأكيد جديد إلى {email}.', 'لم يعد رابط إعادة التعيين هذا صالحا', 'لم يعد هذا الرابط صالحا', 'رابط إعادة تعيين كلمة المرور غير صالح أو غير مكتمل أو منتهي الصلاحية.', 'رابط تسجيل الدخول أو الاسترداد غير صالح أو غير مكتمل أو منتهي الصلاحية.', 'اطلب بريد إعادة تعيين جديدا ثم حاول مرة أخرى.', 'ابدأ من Supericons من جديد واطلب بريدا جديدا إذا لزم الأمر.', 'الرابط منتهي الصلاحية أو غير صالح', 'لم يعد بالإمكان استخدام هذا الرابط.', 'تحقق من بريدك الإلكتروني', 'افتح بريد التأكيد لإكمال إنشاء حساب Supericons.', 'إذا لم يظهر فورا، يمكنك طلب رسالة أخرى بعد نحو دقيقة.', 'ابحث عن بريد التأكيد الذي أرسلناه إلى {email}.', 'أرسلنا بريد تأكيد إلى {email}. يمكنك طلب رسالة أخرى بعد نحو دقيقة.', 'تحقق من {email} بحثا عن بريد تأكيد جديد.']
  },
  hi: {
    portal: ['सदस्यता पोर्टल खोला जा रहा है...', 'सदस्यता पोर्टल खोलने के लिए फिर से साइन इन करें।', 'सदस्यता पोर्टल उपलब्ध नहीं है।', 'सदस्यता पोर्टल नहीं खुल सका।'],
    account: ['खाता अपडेट हो गया।', 'सहेजने के लिए प्रदर्शन नाम दर्ज करें।', 'अपने प्रदर्शन नाम के लिए कम से कम 2 अक्षर इस्तेमाल करें।', 'प्रदर्शन नाम सहेज दिया गया।', 'प्रदर्शन नाम सहेजा नहीं जा सका।', 'इस खाते के लिए कोई साइन-इन ईमेल उपलब्ध नहीं है।', 'ऐसा पासवर्ड सेट करें जिसे आप Google साइन-इन के साथ इस्तेमाल कर सकें।', 'पासवर्ड रीसेट ईमेल {email} पर भेज दिया गया है।', 'पासवर्ड रीसेट ईमेल भेज दिया गया।', 'पासवर्ड साइन-इन जोड़ दिया गया।', 'पासवर्ड अपडेट हो गया।'],
    copy: ['एनिमेटेड आइकन पैक खोलें, खरीदारी प्रबंधित करें और Pro सुविधाएं अनलॉक करें।', 'एक खाते से खरीदारी सहेजें, डाउनलोड सिंक करें और Pro सुविधाएं अनलॉक करें।', 'खरीदारी जारी रखने के लिए साइन इन करें', 'कलेक्शन खरीदारी को एक खाते से जोड़कर डाउनलोड और अपडेट सिंक रखें।', 'हम आपको वापस लाएंगे ताकि आप वहीं से जारी रख सकें।', 'साइन इन करके जारी रखें', 'क्या पहले खाता चाहिए?', 'कलेक्शन खरीदने के लिए खाता बनाएं', 'आपकी खरीदारी, डाउनलोड और भविष्य के अपडेट इस खाते से जुड़े रहेंगे।', 'Pro पर जाने के लिए साइन इन करें', 'MCP एक्सेस, वर्कफ्लो टूल और प्रीमियम कलेक्शन के लिए Pro चेकआउट पर जारी रखें।', 'हम आपको वापस लाएंगे ताकि आप चेकआउट जारी रख सकें।', 'Pro पर जाने के लिए खाता बनाएं', 'पहले अपना खाता सेट करें, फिर तैयार होने पर Pro चेकआउट जारी रखें।', 'Pro टूल अनलॉक करने के लिए साइन इन करें', 'एक खाते से Motion Lab एक्सपोर्ट, Converter डाउनलोड और प्रीमियम MCP एक्सेस इस्तेमाल करें।', 'पहले मुफ्त खाता। Pro सुविधाएं चाहिए तभी अपग्रेड करें।', 'Pro टूल अनलॉक करने के लिए खाता बनाएं', 'अपना कार्यक्षेत्र सहेजें और प्रीमियम टूल को एक खाते से जोड़े रखें।'],
    auth: ['अपने खाते का ईमेल दर्ज करें और हम आपको सुरक्षित रीसेट लिंक भेजेंगे।', 'रिकवरी लिंक आपको नया पासवर्ड चुनने के लिए यहां वापस लाएगा।', 'अगर कोई खाता {email} से मेल खाता है, तो आपको जल्द ही रीसेट लिंक मिलेगा।', 'नया पासवर्ड सेट करें', 'अपने Supericons खाते को सुरक्षित रखने के लिए नया पासवर्ड चुनें।', 'कम से कम 8 अक्षर इस्तेमाल करें। मजबूत पासवर्ड की सलाह दी जाती है।', 'पासवर्ड बनाएं ताकि आप Google के साथ ईमेल से भी साइन इन कर सकें।', 'पासवर्ड एक्सेस जोड़ने के बाद भी Google साइन-इन काम करता रहेगा।', '{email} के लिए पासवर्ड बनाएं।', '{email} के लिए नया पासवर्ड चुनें।', 'अपने खाते के लिए पासवर्ड बनाएं।', 'अपने खाते के लिए नया पासवर्ड चुनें।', 'अपना मौजूदा खाता इस्तेमाल करें', 'यह ईमेल पहले से किसी Supericons खाते से जुड़ा हो सकता है। नया खाता बनाने के बजाय साइन इन करें।', 'अगर आप आम तौर पर Google से साइन इन करते हैं, तो Google से जारी रखें। नहीं तो वापस जाकर अपने ईमेल से साइन इन करें।', 'खाता पहले से मौजूद है', '{email} पहले से किसी मौजूदा Supericons खाते से जुड़ा हो सकता है।', 'अपना ईमेल पुष्टि करें', 'साइन इन करने से पहले अपना ईमेल पता पुष्टि करने के लिए इनबॉक्स देखें।', 'अगर ईमेल नहीं मिलता या लिंक काम नहीं करता, तो नीचे नया पुष्टिकरण ईमेल भेजें।', 'ईमेल पुष्टि जरूरी है', '{email} पर नया पुष्टिकरण ईमेल भेजें।', '{email} पर नया पुष्टिकरण ईमेल भेज दिया गया है।', 'यह रीसेट लिंक अब मान्य नहीं है', 'यह लिंक अब मान्य नहीं है', 'पासवर्ड रीसेट लिंक अमान्य, अधूरा या समाप्त हो चुका है।', 'साइन-इन या रिकवरी लिंक अमान्य, अधूरा या समाप्त हो चुका है।', 'नया रीसेट ईमेल मांगें और फिर कोशिश करें।', 'Supericons से फिर शुरू करें और जरूरत हो तो नया ईमेल मांगें।', 'लिंक समाप्त या अमान्य है', 'यह लिंक अब इस्तेमाल नहीं किया जा सकता।', 'अपना ईमेल देखें', 'Supericons खाता बनाना पूरा करने के लिए पुष्टिकरण ईमेल खोलें।', 'अगर यह तुरंत नहीं दिखता, तो लगभग एक मिनट बाद दूसरा मांग सकते हैं।', '{email} पर भेजा गया पुष्टिकरण ईमेल खोजें।', 'हमने {email} पर पुष्टिकरण ईमेल भेजा है। आप लगभग एक मिनट बाद दूसरा मांग सकते हैं।', 'नए पुष्टिकरण ईमेल के लिए {email} देखें।']
  },
  vi: {
    portal: ['Đang mở cổng quản lý gói đăng ký...', 'Hãy đăng nhập lại để mở cổng quản lý gói đăng ký.', 'Cổng quản lý gói đăng ký hiện không khả dụng.', 'Không thể mở cổng quản lý gói đăng ký.'],
    account: ['Tài khoản đã được cập nhật.', 'Nhập tên hiển thị để lưu.', 'Tên hiển thị cần có ít nhất 2 ký tự.', 'Đã lưu tên hiển thị.', 'Không thể lưu tên hiển thị.', 'Không có email đăng nhập khả dụng cho tài khoản này.', 'Đặt mật khẩu để bạn có thể dùng cùng với đăng nhập Google.', 'Email đặt lại mật khẩu đã được gửi tới {email}.', 'Đã gửi email đặt lại mật khẩu.', 'Đã thêm đăng nhập bằng mật khẩu.', 'Mật khẩu đã được cập nhật.'],
    copy: ['Truy cập gói biểu tượng động, quản lý giao dịch mua và mở khóa tính năng Pro.', 'Lưu giao dịch mua, đồng bộ lượt tải xuống và mở khóa tính năng Pro bằng một tài khoản.', 'Đăng nhập để tiếp tục mua hàng', 'Gắn giao dịch mua bộ sưu tập với một tài khoản để lượt tải xuống và cập nhật luôn đồng bộ.', 'Chúng tôi sẽ đưa bạn trở lại để tiếp tục từ nơi bạn dừng lại.', 'Đăng nhập và tiếp tục', 'Bạn cần tạo tài khoản trước?', 'Tạo tài khoản để mua bộ sưu tập', 'Giao dịch mua, lượt tải xuống và cập nhật sau này sẽ được kết nối với tài khoản này.', 'Đăng nhập để lên Pro', 'Tiếp tục đến thanh toán Pro để dùng MCP, công cụ quy trình và bộ sưu tập cao cấp.', 'Chúng tôi sẽ đưa bạn trở lại để tiếp tục thanh toán.', 'Tạo tài khoản để lên Pro', 'Thiết lập tài khoản trước, rồi tiếp tục thanh toán Pro khi bạn sẵn sàng.', 'Đăng nhập để mở khóa công cụ Pro', 'Dùng xuất Motion Lab, tải xuống Converter và quyền truy cập MCP cao cấp từ một tài khoản.', 'Bắt đầu bằng tài khoản miễn phí. Chỉ nâng cấp khi bạn muốn tính năng Pro.', 'Tạo tài khoản để mở khóa công cụ Pro', 'Lưu không gian làm việc và giữ các công cụ cao cấp kết nối với một tài khoản.'],
    auth: ['Nhập email tài khoản và chúng tôi sẽ gửi cho bạn liên kết đặt lại an toàn.', 'Liên kết khôi phục sẽ đưa bạn quay lại đây để chọn mật khẩu mới.', 'Nếu có tài khoản khớp với {email}, bạn sẽ sớm nhận được liên kết đặt lại.', 'Đặt mật khẩu mới', 'Chọn mật khẩu mới để bảo vệ tài khoản Supericons của bạn.', 'Dùng ít nhất 8 ký tự. Nên dùng mật khẩu mạnh.', 'Tạo mật khẩu để bạn có thể đăng nhập bằng email cùng với Google.', 'Đăng nhập Google vẫn hoạt động sau khi bạn thêm quyền truy cập bằng mật khẩu.', 'Tạo mật khẩu cho {email}.', 'Chọn mật khẩu mới cho {email}.', 'Tạo mật khẩu cho tài khoản của bạn.', 'Chọn mật khẩu mới cho tài khoản của bạn.', 'Dùng tài khoản hiện có', 'Email này có thể đã thuộc về một tài khoản Supericons. Hãy đăng nhập thay vì tạo tài khoản khác.', 'Nếu bạn thường đăng nhập bằng Google, hãy tiếp tục bằng Google. Nếu không, quay lại và đăng nhập bằng email.', 'Tài khoản đã tồn tại', '{email} có thể đã được liên kết với một tài khoản Supericons hiện có.', 'Xác nhận email của bạn', 'Kiểm tra hộp thư đến để xác nhận địa chỉ email trước khi đăng nhập.', 'Nếu bạn không tìm thấy email, hoặc liên kết không còn hoạt động, hãy gửi email xác nhận mới bên dưới.', 'Cần xác nhận email', 'Gửi email xác nhận mới tới {email}.', 'Email xác nhận mới đã được gửi tới {email}.', 'Liên kết đặt lại này không còn hợp lệ', 'Liên kết này không còn hợp lệ', 'Liên kết đặt lại mật khẩu không hợp lệ, không đầy đủ hoặc đã hết hạn.', 'Liên kết đăng nhập hoặc khôi phục không hợp lệ, không đầy đủ hoặc đã hết hạn.', 'Yêu cầu email đặt lại mới rồi thử lại.', 'Bắt đầu lại từ Supericons và yêu cầu email mới nếu cần.', 'Liên kết đã hết hạn hoặc không hợp lệ', 'Liên kết này không còn dùng được.', 'Kiểm tra email của bạn', 'Mở email xác nhận để hoàn tất việc tạo tài khoản Supericons.', 'Nếu email không xuất hiện ngay, bạn có thể yêu cầu email khác sau khoảng một phút.', 'Tìm email xác nhận mà chúng tôi đã gửi tới {email}.', 'Chúng tôi đã gửi email xác nhận tới {email}. Bạn có thể yêu cầu email khác sau khoảng một phút.', 'Kiểm tra {email} để xem email xác nhận mới.']
  },
  th: {
    portal: ['กำลังเปิดพอร์ทัลการสมัครสมาชิก...', 'โปรดเข้าสู่ระบบอีกครั้งเพื่อเปิดพอร์ทัลการสมัครสมาชิก', 'พอร์ทัลการสมัครสมาชิกไม่พร้อมใช้งาน', 'ไม่สามารถเปิดพอร์ทัลการสมัครสมาชิกได้'],
    account: ['อัปเดตบัญชีแล้ว', 'ป้อนชื่อที่แสดงเพื่อบันทึก', 'ใช้ชื่อที่แสดงอย่างน้อย 2 อักขระ', 'บันทึกชื่อที่แสดงแล้ว', 'ไม่สามารถบันทึกชื่อที่แสดงได้', 'ไม่มีอีเมลเข้าสู่ระบบสำหรับบัญชีนี้', 'ตั้งรหัสผ่านที่คุณใช้ร่วมกับการเข้าสู่ระบบ Google ได้', 'ส่งอีเมลรีเซ็ตรหัสผ่านไปที่ {email} แล้ว', 'ส่งอีเมลรีเซ็ตรหัสผ่านแล้ว', 'เพิ่มการเข้าสู่ระบบด้วยรหัสผ่านแล้ว', 'อัปเดตรหัสผ่านแล้ว'],
    copy: ['เข้าถึงแพ็กไอคอนเคลื่อนไหว จัดการการซื้อ และปลดล็อกฟีเจอร์ Pro', 'บันทึกการซื้อ ซิงก์การดาวน์โหลด และปลดล็อกฟีเจอร์ Pro จากบัญชีเดียว', 'เข้าสู่ระบบเพื่อซื้อสินค้าต่อ', 'ผูกการซื้อคอลเลกชันกับบัญชีเดียว เพื่อให้การดาวน์โหลดและอัปเดตซิงก์กัน', 'เราจะพาคุณกลับมาเพื่อดำเนินการต่อจากจุดเดิม', 'เข้าสู่ระบบและดำเนินการต่อ', 'ต้องสร้างบัญชีก่อนหรือไม่', 'สร้างบัญชีเพื่อซื้อคอลเลกชัน', 'การซื้อ การดาวน์โหลด และอัปเดตในอนาคตจะเชื่อมกับบัญชีนี้', 'เข้าสู่ระบบเพื่อไป Pro', 'ดำเนินการต่อไปยังการชำระเงิน Pro สำหรับการเข้าถึง MCP เครื่องมือเวิร์กโฟลว์ และคอลเลกชันพรีเมียม', 'เราจะพาคุณกลับมาเพื่อดำเนินการชำระเงินต่อ', 'สร้างบัญชีเพื่อไป Pro', 'ตั้งค่าบัญชีก่อน แล้วค่อยชำระเงิน Pro เมื่อคุณพร้อม', 'เข้าสู่ระบบเพื่อปลดล็อกเครื่องมือ Pro', 'ใช้การส่งออก Motion Lab การดาวน์โหลด Converter และการเข้าถึง MCP พรีเมียมจากบัญชีเดียว', 'เริ่มด้วยบัญชีฟรี อัปเกรดเมื่อคุณต้องการฟีเจอร์ Pro เท่านั้น', 'สร้างบัญชีเพื่อปลดล็อกเครื่องมือ Pro', 'บันทึกพื้นที่ทำงานและเชื่อมเครื่องมือพรีเมียมไว้กับบัญชีเดียว'],
    auth: ['ป้อนอีเมลบัญชีของคุณ แล้วเราจะส่งลิงก์รีเซ็ตที่ปลอดภัยให้', 'ลิงก์กู้คืนจะพาคุณกลับมาที่นี่เพื่อเลือกรหัสผ่านใหม่', 'หากมีบัญชีที่ตรงกับ {email} คุณจะได้รับลิงก์รีเซ็ตในไม่ช้า', 'ตั้งรหัสผ่านใหม่', 'เลือกรหัสผ่านใหม่เพื่อปกป้องบัญชี Supericons ของคุณ', 'ใช้อย่างน้อย 8 อักขระ แนะนำให้ใช้รหัสผ่านที่รัดกุม', 'สร้างรหัสผ่านเพื่อให้คุณเข้าสู่ระบบด้วยอีเมลได้ควบคู่กับ Google', 'การเข้าสู่ระบบด้วย Google จะยังใช้งานได้หลังจากเพิ่มการเข้าถึงด้วยรหัสผ่าน', 'สร้างรหัสผ่านสำหรับ {email}', 'เลือกรหัสผ่านใหม่สำหรับ {email}', 'สร้างรหัสผ่านสำหรับบัญชีของคุณ', 'เลือกรหัสผ่านใหม่สำหรับบัญชีของคุณ', 'ใช้บัญชีที่มีอยู่', 'อีเมลนี้อาจเป็นของบัญชี Supericons อยู่แล้ว โปรดเข้าสู่ระบบแทนการสร้างบัญชีใหม่', 'หากคุณมักเข้าสู่ระบบด้วย Google ให้ดำเนินการต่อด้วย Google มิฉะนั้นให้ย้อนกลับและเข้าสู่ระบบด้วยอีเมล', 'บัญชีมีอยู่แล้ว', '{email} อาจเชื่อมกับบัญชี Supericons ที่มีอยู่แล้ว', 'ยืนยันอีเมลของคุณ', 'ตรวจสอบกล่องจดหมายเพื่อยืนยันที่อยู่อีเมลก่อนเข้าสู่ระบบ', 'หากหาอีเมลไม่พบ หรือลิงก์ไม่ทำงานแล้ว ให้ส่งอีเมลยืนยันใหม่ด้านล่าง', 'ต้องยืนยันอีเมล', 'ส่งอีเมลยืนยันใหม่ไปที่ {email}', 'ส่งอีเมลยืนยันใหม่ไปที่ {email} แล้ว', 'ลิงก์รีเซ็ตนี้ไม่สามารถใช้ได้อีกต่อไป', 'ลิงก์นี้ไม่สามารถใช้ได้อีกต่อไป', 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง ไม่สมบูรณ์ หรือหมดอายุแล้ว', 'ลิงก์เข้าสู่ระบบหรือกู้คืนไม่ถูกต้อง ไม่สมบูรณ์ หรือหมดอายุแล้ว', 'ขออีเมลรีเซ็ตใหม่แล้วลองอีกครั้ง', 'เริ่มใหม่จาก Supericons และขออีเมลใหม่หากจำเป็น', 'ลิงก์หมดอายุหรือไม่ถูกต้อง', 'ลิงก์นี้ใช้ไม่ได้อีกต่อไป', 'ตรวจสอบอีเมลของคุณ', 'เปิดอีเมลยืนยันเพื่อสร้างบัญชี Supericons ให้เสร็จ', 'หากยังไม่ปรากฏทันที คุณสามารถขออีกฉบับได้ในประมาณหนึ่งนาที', 'มองหาอีเมลยืนยันที่เราส่งไปที่ {email}', 'เราส่งอีเมลยืนยันไปที่ {email} แล้ว คุณสามารถขออีกฉบับได้ในประมาณหนึ่งนาที', 'ตรวจสอบ {email} เพื่อดูอีเมลยืนยันใหม่']
  }
};

const repairData = {
  ...common,
  ...western,
  ...asian,
  ...more
};

const copyDescriptionRepairs = {
  es: {
    'auth.copy.default.signin.desc': 'Accede a packs de iconos animados, gestiona compras y desbloquea funciones Pro.',
    'auth.copy.default.signup.desc': 'Guarda compras, sincroniza descargas y desbloquea funciones Pro desde una sola cuenta.',
    'auth.copy.purchase.signin.desc': 'Mantén las compras de colecciones vinculadas a una cuenta para que las descargas y actualizaciones estén sincronizadas.',
    'auth.copy.purchase.signup.desc': 'Tus compras, descargas y futuras actualizaciones quedarán conectadas a esta cuenta.',
    'auth.copy.subscribe.signin.desc': 'Continúa al pago de Pro para acceder a MCP, herramientas de trabajo y colecciones premium.',
    'auth.copy.subscribe.signup.desc': 'Configura tu cuenta primero y luego continúa al pago de Pro cuando estés listo.',
    'auth.copy.pro.signin.desc': 'Usa exportaciones de Motion Lab, descargas de Converter y acceso MCP premium desde una sola cuenta.',
    'auth.copy.pro.signup.desc': 'Guarda tu espacio de trabajo y mantén las herramientas premium conectadas a una sola cuenta.'
  },
  de: {
    'auth.copy.default.signin.desc': 'Greife auf animierte Icon-Pakete zu, verwalte Käufe und schalte Pro-Funktionen frei.',
    'auth.copy.default.signup.desc': 'Speichere Käufe, synchronisiere Downloads und schalte Pro-Funktionen mit einem Konto frei.',
    'auth.copy.purchase.signin.desc': 'Verknüpfe Sammlungskäufe mit einem Konto, damit Downloads und Updates synchron bleiben.',
    'auth.copy.purchase.signup.desc': 'Deine Käufe, Downloads und künftigen Updates bleiben mit diesem Konto verbunden.',
    'auth.copy.subscribe.signin.desc': 'Weiter zum Pro-Checkout für MCP-Zugriff, Workflow-Tools und Premium-Sammlungen.',
    'auth.copy.subscribe.signup.desc': 'Richte zuerst dein Konto ein und fahre dann mit dem Pro-Checkout fort, wenn du bereit bist.',
    'auth.copy.pro.signin.desc': 'Nutze Motion Lab-Exporte, Converter-Downloads und Premium-MCP-Zugriff über ein Konto.',
    'auth.copy.pro.signup.desc': 'Speichere deinen Arbeitsbereich und verbinde Premium-Tools mit einem Konto.'
  },
  pt: {
    'auth.copy.default.signin.desc': 'Acesse pacotes de ícones animados, gerencie compras e desbloqueie recursos Pro.',
    'auth.copy.default.signup.desc': 'Salve compras, sincronize downloads e desbloqueie recursos Pro em uma só conta.',
    'auth.copy.purchase.signin.desc': 'Mantenha compras de coleções vinculadas a uma conta para que downloads e atualizações fiquem sincronizados.',
    'auth.copy.purchase.signup.desc': 'Suas compras, downloads e futuras atualizações ficarão conectados a esta conta.',
    'auth.copy.subscribe.signin.desc': 'Continue para o checkout Pro para acesso MCP, ferramentas de fluxo de trabalho e coleções premium.',
    'auth.copy.subscribe.signup.desc': 'Configure sua conta primeiro e continue para o checkout Pro quando estiver pronto.',
    'auth.copy.pro.signin.desc': 'Use exportações do Motion Lab, downloads do Converter e acesso MCP premium em uma só conta.',
    'auth.copy.pro.signup.desc': 'Salve seu espaço de trabalho e mantenha ferramentas premium conectadas a uma só conta.'
  },
  ja: {
    'auth.copy.default.signin.desc': 'アニメーションアイコンパック、購入管理、Pro 機能にアクセスできます。',
    'auth.copy.default.signup.desc': '購入内容とダウンロードを同期し、1 つのアカウントで Pro 機能を利用できます。',
    'auth.copy.purchase.signin.desc': 'コレクションの購入を 1 つのアカウントに結び付け、ダウンロードと更新を同期します。',
    'auth.copy.purchase.signup.desc': '購入内容、ダウンロード、今後の更新はこのアカウントに接続されます。',
    'auth.copy.subscribe.signin.desc': 'MCP アクセス、ワークフローツール、プレミアムコレクションのために Pro の決済へ進みます。',
    'auth.copy.subscribe.signup.desc': '先にアカウントを設定し、準備できたら Pro の決済へ進みます。',
    'auth.copy.pro.signin.desc': 'Motion Lab の書き出し、Converter のダウンロード、プレミアム MCP アクセスを 1 つのアカウントで利用します。',
    'auth.copy.pro.signup.desc': 'ワークスペースを保存し、プレミアムツールを 1 つのアカウントに接続します。'
  },
  ko: {
    'auth.copy.default.signin.desc': '애니메이션 아이콘 팩, 구매 관리, Pro 기능에 접근하세요.',
    'auth.copy.default.signup.desc': '구매 내역과 다운로드를 동기화하고 한 계정에서 Pro 기능을 사용하세요.',
    'auth.copy.purchase.signin.desc': '컬렉션 구매를 한 계정에 연결해 다운로드와 업데이트를 동기화합니다.',
    'auth.copy.purchase.signup.desc': '구매 내역, 다운로드, 향후 업데이트가 이 계정에 연결됩니다.',
    'auth.copy.subscribe.signin.desc': 'MCP 접근, 워크플로 도구, 프리미엄 컬렉션을 위해 Pro 결제로 이동합니다.',
    'auth.copy.subscribe.signup.desc': '먼저 계정을 설정한 뒤 준비되면 Pro 결제로 이동하세요.',
    'auth.copy.pro.signin.desc': 'Motion Lab 내보내기, Converter 다운로드, 프리미엄 MCP 접근을 한 계정에서 사용하세요.',
    'auth.copy.pro.signup.desc': '작업 공간을 저장하고 프리미엄 도구를 한 계정에 연결하세요.'
  },
  ar: {
    'auth.copy.default.signin.desc': 'يمكنك الوصول إلى حزم الأيقونات المتحركة وإدارة المشتريات وفتح مزايا Pro.',
    'auth.copy.default.signup.desc': 'احفظ المشتريات وزامن التنزيلات وافتح مزايا Pro من حساب واحد.',
    'auth.copy.purchase.signin.desc': 'اربط مشتريات المجموعات بحساب واحد حتى تبقى التنزيلات والتحديثات متزامنة.',
    'auth.copy.purchase.signup.desc': 'ستبقى مشترياتك وتنزيلاتك وتحديثاتك المستقبلية مرتبطة بهذا الحساب.',
    'auth.copy.subscribe.signin.desc': 'تابع إلى دفع Pro للوصول إلى MCP وأدوات سير العمل والمجموعات المميزة.',
    'auth.copy.subscribe.signup.desc': 'أعد حسابك أولا، ثم تابع إلى دفع Pro عندما تكون جاهزا.',
    'auth.copy.pro.signin.desc': 'استخدم تصديرات Motion Lab وتنزيلات Converter ووصول MCP المميز من حساب واحد.',
    'auth.copy.pro.signup.desc': 'احفظ مساحة عملك واجعل الأدوات المميزة متصلة بحساب واحد.'
  },
  hi: {
    'auth.copy.default.signin.desc': 'एनिमेटेड आइकन पैक खोलें, खरीदारी प्रबंधित करें और Pro सुविधाएं अनलॉक करें।',
    'auth.copy.default.signup.desc': 'एक खाते से खरीदारी सहेजें, डाउनलोड सिंक करें और Pro सुविधाएं अनलॉक करें।',
    'auth.copy.purchase.signin.desc': 'कलेक्शन खरीदारी को एक खाते से जोड़कर डाउनलोड और अपडेट सिंक रखें।',
    'auth.copy.purchase.signup.desc': 'आपकी खरीदारी, डाउनलोड और भविष्य के अपडेट इस खाते से जुड़े रहेंगे।',
    'auth.copy.subscribe.signin.desc': 'MCP एक्सेस, वर्कफ्लो टूल और प्रीमियम कलेक्शन के लिए Pro चेकआउट पर जारी रखें।',
    'auth.copy.subscribe.signup.desc': 'पहले अपना खाता सेट करें, फिर तैयार होने पर Pro चेकआउट जारी रखें।',
    'auth.copy.pro.signin.desc': 'एक खाते से Motion Lab एक्सपोर्ट, Converter डाउनलोड और प्रीमियम MCP एक्सेस इस्तेमाल करें।',
    'auth.copy.pro.signup.desc': 'अपना कार्यक्षेत्र सहेजें और प्रीमियम टूल को एक खाते से जोड़े रखें।'
  },
  vi: {
    'auth.copy.default.signin.desc': 'Truy cập gói biểu tượng động, quản lý giao dịch mua và mở khóa tính năng Pro.',
    'auth.copy.default.signup.desc': 'Lưu giao dịch mua, đồng bộ lượt tải xuống và mở khóa tính năng Pro bằng một tài khoản.',
    'auth.copy.purchase.signin.desc': 'Gắn giao dịch mua bộ sưu tập với một tài khoản để lượt tải xuống và cập nhật luôn đồng bộ.',
    'auth.copy.purchase.signup.desc': 'Giao dịch mua, lượt tải xuống và cập nhật sau này sẽ được kết nối với tài khoản này.',
    'auth.copy.subscribe.signin.desc': 'Tiếp tục đến thanh toán Pro để dùng MCP, công cụ quy trình và bộ sưu tập cao cấp.',
    'auth.copy.subscribe.signup.desc': 'Thiết lập tài khoản trước, rồi tiếp tục thanh toán Pro khi bạn sẵn sàng.',
    'auth.copy.pro.signin.desc': 'Dùng xuất Motion Lab, tải xuống Converter và quyền truy cập MCP cao cấp từ một tài khoản.',
    'auth.copy.pro.signup.desc': 'Lưu không gian làm việc và giữ các công cụ cao cấp kết nối với một tài khoản.'
  },
  th: {
    'auth.copy.default.signin.desc': 'เข้าถึงแพ็กไอคอนเคลื่อนไหว จัดการการซื้อ และปลดล็อกฟีเจอร์ Pro',
    'auth.copy.default.signup.desc': 'บันทึกการซื้อ ซิงก์การดาวน์โหลด และปลดล็อกฟีเจอร์ Pro จากบัญชีเดียว',
    'auth.copy.purchase.signin.desc': 'ผูกการซื้อคอลเลกชันกับบัญชีเดียว เพื่อให้การดาวน์โหลดและอัปเดตซิงก์กัน',
    'auth.copy.purchase.signup.desc': 'การซื้อ การดาวน์โหลด และอัปเดตในอนาคตจะเชื่อมกับบัญชีนี้',
    'auth.copy.subscribe.signin.desc': 'ดำเนินการต่อไปยังการชำระเงิน Pro สำหรับการเข้าถึง MCP เครื่องมือเวิร์กโฟลว์ และคอลเลกชันพรีเมียม',
    'auth.copy.subscribe.signup.desc': 'ตั้งค่าบัญชีก่อน แล้วค่อยชำระเงิน Pro เมื่อคุณพร้อม',
    'auth.copy.pro.signin.desc': 'ใช้การส่งออก Motion Lab การดาวน์โหลด Converter และการเข้าถึง MCP พรีเมียมจากบัญชีเดียว',
    'auth.copy.pro.signup.desc': 'บันทึกพื้นที่ทำงานและเชื่อมเครื่องมือพรีเมียมไว้กับบัญชีเดียว'
  }
};

const portalKeys = ['checkout.openingPortal', 'checkout.signInAgainPortal', 'checkout.portalUnavailable', 'checkout.portalFailed'];
const accountKeys = ['account.toast.updated', 'account.profile.enterName', 'account.profile.nameTooShort', 'account.profile.saved', 'account.profile.saveFailed', 'account.password.noEmail', 'account.password.addStatus', 'account.password.resetSent', 'account.password.resetToast', 'auth.toast.passwordSignInAdded', 'auth.toast.passwordUpdated'];
const authKeys = ['auth.forgot.description', 'auth.forgot.note', 'auth.forgot.sentStatus', 'auth.reset.title', 'auth.reset.description', 'auth.reset.note', 'auth.reset.addDescription', 'auth.reset.addNote', 'auth.reset.createForEmail', 'auth.reset.chooseForEmail', 'auth.reset.createForAccount', 'auth.reset.chooseForAccount', 'auth.verify.existing.modalTitle', 'auth.verify.existing.modalDesc', 'auth.verify.existing.modalNote', 'auth.verify.existing.stageTitle', 'auth.verify.existing.stageText', 'auth.verify.unconfirmed.modalTitle', 'auth.verify.unconfirmed.modalDesc', 'auth.verify.unconfirmed.modalNote', 'auth.verify.unconfirmed.stageTitle', 'auth.verify.unconfirmed.stageText', 'auth.verify.unconfirmed.resentStatus', 'auth.verify.callback.resetTitle', 'auth.verify.callback.linkTitle', 'auth.verify.callback.resetDesc', 'auth.verify.callback.linkDesc', 'auth.verify.callback.resetNote', 'auth.verify.callback.linkNote', 'auth.verify.callback.stageTitle', 'auth.verify.callback.stageText', 'auth.verify.pending.modalTitle', 'auth.verify.pending.modalDesc', 'auth.verify.pending.modalNote', 'auth.verify.pending.stageText', 'auth.verify.pending.sentStatus', 'auth.verify.pending.resentStatus'];

for (const [locale, data] of Object.entries(repairData)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  const catalog = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const repairs = { ...data };
  Object.assign(repairs, expandGroup(locale, 'portal', portalKeys, data.portal));
  Object.assign(repairs, expandGroup(locale, 'account', accountKeys, data.account));
  Object.assign(repairs, expandGroup(locale, 'auth', authKeys, data.auth));
  Object.assign(repairs, copyDescriptionRepairs[locale] || {});
  delete repairs.portal;
  delete repairs.account;
  delete repairs.copy;
  delete repairs.auth;
  for (const [key, value] of Object.entries(repairs)) setPath(catalog, key, value);
  const pendingTitle = repairs['auth.verify.pending.modalTitle'];
  if (pendingTitle) setPath(catalog, 'auth.verify.pending.stageTitle', pendingTitle);
  fs.writeFileSync(filePath, `${JSON.stringify(catalog, null, 2)}\n`);
}

console.log(`Repaired auth/account/checkout message localization for ${Object.keys(repairData).length} locales.`);
