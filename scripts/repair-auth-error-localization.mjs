import fs from 'node:fs';
import path from 'node:path';

const messagesDir = path.join(process.cwd(), 'data', 'i18n', 'messages');

const errorMessages = {
  en: {
    invalidCredentials: 'That email and password did not match. If you usually sign in with Google, continue with Google instead.',
    tooManyAttempts: 'Too many sign-in attempts. Please wait a little and try again.',
    signInFailed: 'We could not sign you in. Please check your details and try again.',
    tooManySignupAttempts: 'Too many account requests. Please wait a little and try again.',
    passwordMin: 'Password must be at least 8 characters.',
    signupFailed: 'We could not create the account. Please try again.',
    resetTooSoon: 'Please wait a little before requesting another reset link.',
    resetFailed: 'We could not send the reset link. Please try again.',
    confirmationTooSoon: 'Please wait a little before requesting another confirmation email.',
    resendFailed: 'We could not resend the confirmation email. Please try again.',
    signOutFailed: 'We could not sign you out. Please try again.',
    googleFailed: 'Google sign-in did not finish. Please try again.',
    passwordTooShort: 'New password must be at least 8 characters.',
    passwordsMismatch: 'The passwords do not match.',
    updatePasswordFailed: 'We could not update your password. Please try again.'
  },
  'zh-Hans': {
    invalidCredentials: '邮箱和密码不匹配。如果你平时使用 Google 登录，请改用 Google 继续。',
    tooManyAttempts: '登录尝试次数过多。请稍等片刻后再试。',
    signInFailed: '无法登录。请检查信息后重试。',
    tooManySignupAttempts: '创建账户请求过多。请稍等片刻后再试。',
    passwordMin: '密码必须至少包含 8 个字符。',
    signupFailed: '无法创建账户。请重试。',
    resetTooSoon: '请稍等片刻后再请求新的重置链接。',
    resetFailed: '无法发送重置链接。请重试。',
    confirmationTooSoon: '请稍等片刻后再请求新的确认邮件。',
    resendFailed: '无法重新发送确认邮件。请重试。',
    signOutFailed: '无法退出登录。请重试。',
    googleFailed: 'Google 登录未完成。请重试。',
    passwordTooShort: '新密码必须至少包含 8 个字符。',
    passwordsMismatch: '两次输入的密码不一致。',
    updatePasswordFailed: '无法更新密码。请重试。'
  },
  'zh-Hant': {
    invalidCredentials: '電子郵件和密碼不相符。如果你平常使用 Google 登入，請改用 Google 繼續。',
    tooManyAttempts: '登入嘗試次數過多。請稍等片刻後再試。',
    signInFailed: '無法登入。請檢查資訊後再試。',
    tooManySignupAttempts: '建立帳戶請求過多。請稍等片刻後再試。',
    passwordMin: '密碼必須至少包含 8 個字元。',
    signupFailed: '無法建立帳戶。請再試一次。',
    resetTooSoon: '請稍等片刻後再要求新的重設連結。',
    resetFailed: '無法傳送重設連結。請再試一次。',
    confirmationTooSoon: '請稍等片刻後再要求新的確認信。',
    resendFailed: '無法重新傳送確認信。請再試一次。',
    signOutFailed: '無法登出。請再試一次。',
    googleFailed: 'Google 登入未完成。請再試一次。',
    passwordTooShort: '新密碼必須至少包含 8 個字元。',
    passwordsMismatch: '兩次輸入的密碼不一致。',
    updatePasswordFailed: '無法更新密碼。請再試一次。'
  },
  ja: {
    invalidCredentials: 'メールアドレスとパスワードが一致しません。普段 Google でサインインしている場合は、Google で続行してください。',
    tooManyAttempts: 'サインインの試行回数が多すぎます。少し待ってからもう一度お試しください。',
    signInFailed: 'サインインできませんでした。入力内容を確認してもう一度お試しください。',
    tooManySignupAttempts: 'アカウント作成のリクエストが多すぎます。少し待ってからもう一度お試しください。',
    passwordMin: 'パスワードは 8 文字以上にしてください。',
    signupFailed: 'アカウントを作成できませんでした。もう一度お試しください。',
    resetTooSoon: '新しいリセットリンクをリクエストする前に、少しお待ちください。',
    resetFailed: 'リセットリンクを送信できませんでした。もう一度お試しください。',
    confirmationTooSoon: '新しい確認メールをリクエストする前に、少しお待ちください。',
    resendFailed: '確認メールを再送信できませんでした。もう一度お試しください。',
    signOutFailed: 'サインアウトできませんでした。もう一度お試しください。',
    googleFailed: 'Google サインインが完了しませんでした。もう一度お試しください。',
    passwordTooShort: '新しいパスワードは 8 文字以上にしてください。',
    passwordsMismatch: 'パスワードが一致しません。',
    updatePasswordFailed: 'パスワードを更新できませんでした。もう一度お試しください。'
  },
  ko: {
    invalidCredentials: '이메일과 비밀번호가 일치하지 않습니다. 평소 Google로 로그인한다면 Google로 계속 진행하세요.',
    tooManyAttempts: '로그인 시도가 너무 많습니다. 잠시 기다린 뒤 다시 시도하세요.',
    signInFailed: '로그인할 수 없습니다. 입력한 정보를 확인한 뒤 다시 시도하세요.',
    tooManySignupAttempts: '계정 생성 요청이 너무 많습니다. 잠시 기다린 뒤 다시 시도하세요.',
    passwordMin: '비밀번호는 8자 이상이어야 합니다.',
    signupFailed: '계정을 만들 수 없습니다. 다시 시도하세요.',
    resetTooSoon: '다른 재설정 링크를 요청하기 전에 잠시 기다려 주세요.',
    resetFailed: '재설정 링크를 보낼 수 없습니다. 다시 시도하세요.',
    confirmationTooSoon: '다른 확인 메일을 요청하기 전에 잠시 기다려 주세요.',
    resendFailed: '확인 메일을 다시 보낼 수 없습니다. 다시 시도하세요.',
    signOutFailed: '로그아웃할 수 없습니다. 다시 시도하세요.',
    googleFailed: 'Google 로그인이 완료되지 않았습니다. 다시 시도하세요.',
    passwordTooShort: '새 비밀번호는 8자 이상이어야 합니다.',
    passwordsMismatch: '비밀번호가 일치하지 않습니다.',
    updatePasswordFailed: '비밀번호를 업데이트할 수 없습니다. 다시 시도하세요.'
  },
  es: {
    invalidCredentials: 'El correo y la contraseña no coinciden. Si normalmente entras con Google, continúa con Google.',
    tooManyAttempts: 'Demasiados intentos de inicio de sesión. Espera un momento e inténtalo de nuevo.',
    signInFailed: 'No pudimos iniciar sesión. Revisa tus datos e inténtalo de nuevo.',
    tooManySignupAttempts: 'Demasiadas solicitudes para crear cuenta. Espera un momento e inténtalo de nuevo.',
    passwordMin: 'La contraseña debe tener al menos 8 caracteres.',
    signupFailed: 'No pudimos crear la cuenta. Inténtalo de nuevo.',
    resetTooSoon: 'Espera un momento antes de solicitar otro enlace de restablecimiento.',
    resetFailed: 'No pudimos enviar el enlace de restablecimiento. Inténtalo de nuevo.',
    confirmationTooSoon: 'Espera un momento antes de solicitar otro correo de confirmación.',
    resendFailed: 'No pudimos reenviar el correo de confirmación. Inténtalo de nuevo.',
    signOutFailed: 'No pudimos cerrar la sesión. Inténtalo de nuevo.',
    googleFailed: 'El inicio de sesión con Google no se completó. Inténtalo de nuevo.',
    passwordTooShort: 'La nueva contraseña debe tener al menos 8 caracteres.',
    passwordsMismatch: 'Las contraseñas no coinciden.',
    updatePasswordFailed: 'No pudimos actualizar tu contraseña. Inténtalo de nuevo.'
  },
  de: {
    invalidCredentials: 'E-Mail und Passwort stimmen nicht überein. Wenn du dich normalerweise mit Google anmeldest, fahre mit Google fort.',
    tooManyAttempts: 'Zu viele Anmeldeversuche. Bitte warte kurz und versuche es erneut.',
    signInFailed: 'Wir konnten dich nicht anmelden. Prüfe deine Angaben und versuche es erneut.',
    tooManySignupAttempts: 'Zu viele Kontoanfragen. Bitte warte kurz und versuche es erneut.',
    passwordMin: 'Das Passwort muss mindestens 8 Zeichen lang sein.',
    signupFailed: 'Wir konnten das Konto nicht erstellen. Bitte versuche es erneut.',
    resetTooSoon: 'Bitte warte kurz, bevor du einen weiteren Zurücksetzungslink anforderst.',
    resetFailed: 'Wir konnten den Zurücksetzungslink nicht senden. Bitte versuche es erneut.',
    confirmationTooSoon: 'Bitte warte kurz, bevor du eine weitere Bestätigungs-E-Mail anforderst.',
    resendFailed: 'Wir konnten die Bestätigungs-E-Mail nicht erneut senden. Bitte versuche es erneut.',
    signOutFailed: 'Wir konnten dich nicht abmelden. Bitte versuche es erneut.',
    googleFailed: 'Die Anmeldung mit Google wurde nicht abgeschlossen. Bitte versuche es erneut.',
    passwordTooShort: 'Das neue Passwort muss mindestens 8 Zeichen lang sein.',
    passwordsMismatch: 'Die Passwörter stimmen nicht überein.',
    updatePasswordFailed: 'Wir konnten dein Passwort nicht aktualisieren. Bitte versuche es erneut.'
  },
  pt: {
    invalidCredentials: 'O e-mail e a senha não conferem. Se você costuma entrar com o Google, continue com o Google.',
    tooManyAttempts: 'Muitas tentativas de login. Aguarde um pouco e tente novamente.',
    signInFailed: 'Não foi possível entrar. Confira seus dados e tente novamente.',
    tooManySignupAttempts: 'Muitas solicitações de criação de conta. Aguarde um pouco e tente novamente.',
    passwordMin: 'A senha deve ter pelo menos 8 caracteres.',
    signupFailed: 'Não foi possível criar a conta. Tente novamente.',
    resetTooSoon: 'Aguarde um pouco antes de solicitar outro link de redefinição.',
    resetFailed: 'Não foi possível enviar o link de redefinição. Tente novamente.',
    confirmationTooSoon: 'Aguarde um pouco antes de solicitar outro e-mail de confirmação.',
    resendFailed: 'Não foi possível reenviar o e-mail de confirmação. Tente novamente.',
    signOutFailed: 'Não foi possível sair. Tente novamente.',
    googleFailed: 'O login com Google não foi concluído. Tente novamente.',
    passwordTooShort: 'A nova senha deve ter pelo menos 8 caracteres.',
    passwordsMismatch: 'As senhas não conferem.',
    updatePasswordFailed: 'Não foi possível atualizar sua senha. Tente novamente.'
  },
  ar: {
    invalidCredentials: 'البريد الإلكتروني وكلمة المرور غير متطابقين. إذا كنت تسجل الدخول عادة عبر Google، فتابع باستخدام Google.',
    tooManyAttempts: 'هناك عدد كبير من محاولات تسجيل الدخول. انتظر قليلا ثم حاول مرة أخرى.',
    signInFailed: 'تعذر تسجيل الدخول. تحقق من بياناتك ثم حاول مرة أخرى.',
    tooManySignupAttempts: 'هناك عدد كبير من طلبات إنشاء الحساب. انتظر قليلا ثم حاول مرة أخرى.',
    passwordMin: 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.',
    signupFailed: 'تعذر إنشاء الحساب. حاول مرة أخرى.',
    resetTooSoon: 'انتظر قليلا قبل طلب رابط إعادة تعيين آخر.',
    resetFailed: 'تعذر إرسال رابط إعادة التعيين. حاول مرة أخرى.',
    confirmationTooSoon: 'انتظر قليلا قبل طلب بريد تأكيد آخر.',
    resendFailed: 'تعذر إعادة إرسال بريد التأكيد. حاول مرة أخرى.',
    signOutFailed: 'تعذر تسجيل الخروج. حاول مرة أخرى.',
    googleFailed: 'لم يكتمل تسجيل الدخول باستخدام Google. حاول مرة أخرى.',
    passwordTooShort: 'يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل.',
    passwordsMismatch: 'كلمتا المرور غير متطابقتين.',
    updatePasswordFailed: 'تعذر تحديث كلمة المرور. حاول مرة أخرى.'
  },
  hi: {
    invalidCredentials: 'ईमेल और पासवर्ड मेल नहीं खाते। अगर आप आम तौर पर Google से साइन इन करते हैं, तो Google से जारी रखें।',
    tooManyAttempts: 'साइन इन के बहुत अधिक प्रयास हुए। थोड़ी देर प्रतीक्षा करें और फिर कोशिश करें।',
    signInFailed: 'हम आपको साइन इन नहीं कर पाए। अपनी जानकारी जांचें और फिर कोशिश करें।',
    tooManySignupAttempts: 'खाता बनाने के बहुत अधिक अनुरोध हुए। थोड़ी देर प्रतीक्षा करें और फिर कोशिश करें।',
    passwordMin: 'पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।',
    signupFailed: 'हम खाता नहीं बना पाए। फिर कोशिश करें।',
    resetTooSoon: 'दूसरा रीसेट लिंक मांगने से पहले थोड़ी देर प्रतीक्षा करें।',
    resetFailed: 'हम रीसेट लिंक नहीं भेज पाए। फिर कोशिश करें।',
    confirmationTooSoon: 'दूसरा पुष्टिकरण ईमेल मांगने से पहले थोड़ी देर प्रतीक्षा करें।',
    resendFailed: 'हम पुष्टिकरण ईमेल फिर से नहीं भेज पाए। फिर कोशिश करें।',
    signOutFailed: 'हम आपको साइन आउट नहीं कर पाए। फिर कोशिश करें।',
    googleFailed: 'Google साइन इन पूरा नहीं हुआ। फिर कोशिश करें।',
    passwordTooShort: 'नया पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।',
    passwordsMismatch: 'पासवर्ड मेल नहीं खाते।',
    updatePasswordFailed: 'हम आपका पासवर्ड अपडेट नहीं कर पाए। फिर कोशिश करें।'
  },
  vi: {
    invalidCredentials: 'Email và mật khẩu không khớp. Nếu bạn thường đăng nhập bằng Google, hãy tiếp tục bằng Google.',
    tooManyAttempts: 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng chờ một chút rồi thử lại.',
    signInFailed: 'Không thể đăng nhập. Hãy kiểm tra thông tin rồi thử lại.',
    tooManySignupAttempts: 'Có quá nhiều yêu cầu tạo tài khoản. Vui lòng chờ một chút rồi thử lại.',
    passwordMin: 'Mật khẩu phải có ít nhất 8 ký tự.',
    signupFailed: 'Không thể tạo tài khoản. Vui lòng thử lại.',
    resetTooSoon: 'Vui lòng chờ một chút trước khi yêu cầu liên kết đặt lại khác.',
    resetFailed: 'Không thể gửi liên kết đặt lại. Vui lòng thử lại.',
    confirmationTooSoon: 'Vui lòng chờ một chút trước khi yêu cầu email xác nhận khác.',
    resendFailed: 'Không thể gửi lại email xác nhận. Vui lòng thử lại.',
    signOutFailed: 'Không thể đăng xuất. Vui lòng thử lại.',
    googleFailed: 'Đăng nhập bằng Google chưa hoàn tất. Vui lòng thử lại.',
    passwordTooShort: 'Mật khẩu mới phải có ít nhất 8 ký tự.',
    passwordsMismatch: 'Mật khẩu không khớp.',
    updatePasswordFailed: 'Không thể cập nhật mật khẩu. Vui lòng thử lại.'
  },
  th: {
    invalidCredentials: 'อีเมลและรหัสผ่านไม่ตรงกัน หากคุณมักเข้าสู่ระบบด้วย Google โปรดดำเนินการต่อด้วย Google',
    tooManyAttempts: 'มีการพยายามเข้าสู่ระบบมากเกินไป โปรดรอสักครู่แล้วลองอีกครั้ง',
    signInFailed: 'ไม่สามารถเข้าสู่ระบบได้ โปรดตรวจสอบข้อมูลแล้วลองอีกครั้ง',
    tooManySignupAttempts: 'มีคำขอสร้างบัญชีมากเกินไป โปรดรอสักครู่แล้วลองอีกครั้ง',
    passwordMin: 'รหัสผ่านต้องมีอย่างน้อย 8 อักขระ',
    signupFailed: 'ไม่สามารถสร้างบัญชีได้ โปรดลองอีกครั้ง',
    resetTooSoon: 'โปรดรอสักครู่ก่อนขอลิงก์รีเซ็ตอีกครั้ง',
    resetFailed: 'ไม่สามารถส่งลิงก์รีเซ็ตได้ โปรดลองอีกครั้ง',
    confirmationTooSoon: 'โปรดรอสักครู่ก่อนขออีเมลยืนยันอีกครั้ง',
    resendFailed: 'ไม่สามารถส่งอีเมลยืนยันอีกครั้งได้ โปรดลองอีกครั้ง',
    signOutFailed: 'ไม่สามารถออกจากระบบได้ โปรดลองอีกครั้ง',
    googleFailed: 'การเข้าสู่ระบบด้วย Google ยังไม่เสร็จสมบูรณ์ โปรดลองอีกครั้ง',
    passwordTooShort: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 อักขระ',
    passwordsMismatch: 'รหัสผ่านไม่ตรงกัน',
    updatePasswordFailed: 'ไม่สามารถอัปเดตรหัสผ่านได้ โปรดลองอีกครั้ง'
  }
};

for (const [locale, errors] of Object.entries(errorMessages)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  const catalog = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  catalog.auth ??= {};
  catalog.auth.errors = {
    ...(catalog.auth.errors || {}),
    ...errors
  };
  fs.writeFileSync(filePath, `${JSON.stringify(catalog, null, 2)}\n`);
}

console.log(`Updated auth error messages for ${Object.keys(errorMessages).length} locales.`);
