# Supericons Localization Copy Review Matrix

**Audit date:** 2026-05-13
**Auditor:** Automated extraction (read-only)
**Source files:**
- `supabase/functions/send-email/index.ts` (auth email copy)
- `data/i18n/messages/*.json` (UI messages)

**Locales audited:** zh-Hans, zh-Hant, ja, ko, es, de, pt, ar, hi, vi, th
**English anchor:** `en.json` + inline email copy in `send-email/index.ts`

**French scope note:** `fr.json` does not exist and `fr` is not present in the current `send-email/index.ts` `supportedLocales` set. French is therefore outside the current UI and auth-email locale scope, not a partially supported locale.

---

## 1. Auth Emails (`send-email/index.ts`)

Source file: `supabase/functions/send-email/index.ts:54-391`

### 1.1 confirm_signup

| Field | EN (anchor) | zh-Hans | zh-Hant | ja | ko | es | de | pt | ar | hi | vi | th |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| subject | Confirm your Supericons account | 确认你的 Supericons 账户 | 確認你的 Supericons 帳戶 | Supericons アカウントを確認してください | Supericons 계정을 확인하세요 | Confirma tu cuenta de Supericons | Bestätige dein Supericons-Konto | Confirme sua conta Supericons | أكّد حسابك في Supericons | अपना Supericons खाता पुष्टि करें | Xác nhận tài khoản Supericons của bạn | ยืนยันบัญชี Supericons ของคุณ |
| eyebrow | Account Activation | 账户激活 | 帳戶啟用 | アカウント有効化 | 계정 활성화 | Activación de cuenta | Konto aktivieren | Ativação da conta | تفعيل الحساب | खाता सक्रिय करें | Kích hoạt tài khoản | เปิดใช้งานบัญชี |
| title | Confirm your email | 确认你的邮箱 | 確認你的電子郵件 | メールアドレスを確認 | 이메일을 확인하세요 | Confirma tu correo | Bestätige deine E-Mail-Adresse | Confirme seu email | أكّد بريدك الإلكتروني | अपना ईमेल पुष्टि करें | Xác nhận email của bạn | ยืนยันอีเมลของคุณ |
| body | Welcome to Supericons. Confirm your email address to activate your account. | 欢迎使用 Supericons。请确认你的邮箱地址以激活账户。 | 歡迎使用 Supericons。請確認你的電子郵件地址以啟用帳戶。 | Supericons へようこそ。アカウントを有効にするため、メールアドレスを確認してください。 | Supericons에 오신 것을 환영합니다. 계정을 활성화하려면 이메일 주소를 확인하세요. | Te damos la bienvenida a Supericons. Confirma tu correo para activar tu cuenta. | Willkommen bei Supericons. Bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren. | Boas-vindas ao Supericons. Confirme seu email para ativar sua conta. | مرحباً بك في Supericons. أكّد بريدك الإلكتروني لتفعيل حسابك. | Supericons में आपका स्वागत है। अपना खाता सक्रिय करने के लिए ईमेल पता पुष्टि करें। | Chào mừng bạn đến với Supericons. Hãy xác nhận email để kích hoạt tài khoản. | ยินดีต้อนรับสู่ Supericons ยืนยันอีเมลของคุณเพื่อเปิดใช้งานบัญชี |
| cta | Confirm Account | 确认账户 | 確認帳戶 | アカウントを確認 | 계정 확인 | Confirmar cuenta | Konto bestätigen | Confirmar conta | تأكيد الحساب | खाता पुष्टि करें | Xác nhận tài khoản | ยืนยันบัญชี |

**Quality notes — confirm_signup:**

| Locale | Note |
|---|---|
| hi | subject "अपना Supericons खाता पुष्टि करें" — awkward word order; natural Hindi would be "अपना Supericons खाता पुष्टि करें" is acceptable but "अपने Supericons खाते की पुष्टि करें" is more grammatically correct (oblique case). Body "ईमेल पता पुष्टि करें" also lacks the oblique postposition; should be "ईमेल पते की पुष्टि करें". |
| th | body "ยืนยันอีเมลของคุณเพื่อเปิดใช้งานบัญชี" — correct and natural. |
| ja | All strings look natural and polite. |
| ko | All strings look natural. |
| ar | RTL strings look correct. Body uses proper Arabic grammar. |
| zh-Hans/zh-Hant | Clean, natural Simplified/Traditional Chinese. |

### 1.2 reset_password

| Field | EN (anchor) | zh-Hans | zh-Hant | ja | ko | es | de | pt | ar | hi | vi | th |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| subject | Reset your Supericons password | 重置你的 Supericons 密码 | 重設你的 Supericons 密碼 | Supericons のパスワードをリセット | Supericons 비밀번호 재설정 | Restablece tu contraseña de Supericons | Supericons-Passwort zurücksetzen | Redefina sua senha do Supericons | إعادة تعيين كلمة مرور Supericons | अपना Supericons पासवर्ड रीसेट करें | Đặt lại mật khẩu Supericons | รีเซ็ตรหัสผ่าน Supericons ของคุณ |
| eyebrow | Password Recovery | 密码找回 | 密碼復原 | パスワード再設定 | 비밀번호 복구 | Recuperación de contraseña | Passwort wiederherstellen | Recuperação de senha | استرداد كلمة المرور | पासवर्ड रिकवरी | Khôi phục mật khẩu | กู้คืนรหัสผ่าน |
| title | Reset your password | 重置密码 | 重設密碼 | パスワードをリセット | 비밀번호 재설정 | Restablece tu contraseña | Passwort zurücksetzen | Redefina sua senha | إعادة تعيين كلمة المرور | अपना पासवर्ड रीसेट करें | Đặt lại mật khẩu | รีเซ็ตรหัสผ่าน |
| cta | Reset Password | 重置密码 | 重設密碼 | パスワードをリセット | 비밀번호 재설정 | Restablecer contraseña | Passwort zurücksetzen | Redefinir senha | إعادة تعيين كلمة المرور | पासवर्ड रीसेट करें | Đặt lại mật khẩu | รีเซ็ตรหัสผ่าน |

**Quality notes — reset_password:**

| Locale | Note |
|---|---|
| hi | subject "अपना Supericons पासवर्ड रीसेट करें" — mixes Hindi and English "पासवर्ड" (transliteration is acceptable but "पासवर्ड" vs "password" inconsistency with other strings where English "password" may appear). Eyebrow "पासवर्ड रिकवरी" — uses English loanword "रिकवरी" which is common in Hindi UI. |
| All others | Clean, natural translations. |

### 1.3 password_changed

| Field | EN (anchor) | zh-Hans | zh-Hant | ja | ko | es | de | pt | ar | hi | vi | th |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| subject | Your Supericons password was changed | 你的 Supericons 密码已更改 | 你的 Supericons 密碼已變更 | Supericons のパスワードが変更されました | Supericons 비밀번호가 변경되었습니다 | Tu contraseña de Supericons cambió | Dein Supericons-Passwort wurde geändert | Sua senha do Supericons foi alterada | تم تغيير كلمة مرور Supericons | आपका Supericons पासवर्ड बदल गया है | Mật khẩu Supericons của bạn đã được thay đổi | รหัสผ่าน Supericons ของคุณถูกเปลี่ยนแล้ว |
| eyebrow | Security Notice | 安全通知 | 安全通知 | セキュリティ通知 | 보안 알림 | Aviso de seguridad | Sicherheitshinweis | Aviso de segurança | تنبيه أمني | सुरक्षा सूचना | Thông báo bảo mật | แจ้งเตือนความปลอดภัย |

**Quality notes — password_changed:**

| Locale | Note |
|---|---|
| th | Corrected extraction artifact. The source string is `แจ้งเตือนความปลอดภัย` at `send-email/index.ts:300`; an earlier table cell rendered a mixed Thai/Chinese artifact. No source-code change is required. |
| hi | body "आपके Supericons खाते {email} का पासवर्ड अभी अपडेट किया गया है" — "अपडेट किया गया है" uses English loanword "अपडेट" which is common but "बदला गया है" would be more natural Hindi. |
| zh-Hans/zh-Hant | Clean. |
| ja | Polite and natural. |
| ko | Natural. |
| ar | Correct RTL text. |

### 1.4 Email placeholder coverage

All locales correctly preserve the `{email}` placeholder in `password_changed.body`. The `support` field correctly interpolates `SUPPORT_EMAIL` in all locales.

### 1.5 Email locale coverage

| Issue | Severity |
|---|---|
| No active email-locale coverage gap was verified for the current scope. `send-email/index.ts:24-37` lists `ar`, `de`, `en`, `es`, `hi`, `ja`, `ko`, `pt`, `th`, `vi`, `zh-Hans`, and `zh-Hant`; each has auth email copy in `emailCopy`. | None |
| French is not implemented in UI locale files or auth email copy. This is a product-scope decision for future expansion, not a current fallback bug. | Informational |

---

## 2. Auth UI Messages (`auth.*` in locale JSON files)

### 2.1 Auth form labels and placeholders

| Key | EN | zh-Hans | zh-Hant | ja | ko | es | de | pt | ar | hi | vi | th | Issues |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| continueWithGoogle | Continue with Google | 使用 Google 继续 | 使用 Google 繼續 | Google で続行 | Google로 계속 | Continuar con Google | Mit Google fortfahren | Continuar com Google | المتابعة باستخدام Google | Google से जारी रखें | Tiếp tục với Google | ดำเนินการต่อด้วย Google | All OK |
| emailPlaceholder | Email address | 邮箱地址 | 電子郵件地址 | メールアドレス | 이메일 주소 | Correo electrónico | E-Mail-Adresse | Endereço de email | عنوان البريد الإلكتروني | ईमेल पता | Địa chỉ email | ที่อยู่อีเมล | All OK |
| passwordPlaceholder | Password | 密码 | 密碼 | パスワード | 비밀번호 | Contraseña | Passwort | Senha | كلمة المرور | पासवर्ड | Mật khẩu | รหัสผ่าน | All OK |
| forgotPassword | Forgot password | 忘记密码 | 忘記密碼 | パスワードを忘れた場合 | 비밀번호 찾기 | Olvidé mi contraseña | Passwort vergessen | Esqueci a senha | نسيت كلمة المرور | पासवर्ड भूल गए | Quên mật khẩu | ลืมรหัสผ่าน | All OK |
| backToSignIn | Back to sign in | 返回登录 | 返回登入 | サインインに戻る | 로그인으로 돌아가기 | Volver a iniciar sesión | Zurück zur Anmeldung | Voltar para entrar | العودة إلى تسجيل الدخول | साइन इन पर लौटें | Quay lại đăng nhập | กลับไปเข้าสู่ระบบ | All OK |
| resendConfirmation | Resend confirmation | 重新发送确认邮件 | 重新傳送確認信 | 確認メールを再送 | 확인 메일 다시 보내기 | Reenviar confirmación | Bestätigung erneut senden | Reenviar confirmação | إعادة إرسال التأكيد | पुष्टि फिर भेजें | Gửi lại xác nhận | ส่งอีเมลยืนยันอีกครั้ง | All OK |
| sendResetLink | Send reset link | 发送重置链接 | 傳送重設連結 | リセットリンクを送信 | 재설정 링크 보내기 | Enviar enlace de restablecimiento | Link zum Zurücksetzen senden | Enviar link de redefinição | إرسال رابط إعادة التعيين | रीसेट लिंक भेजें | Gửi liên kết đặt lại | ส่งลิงก์รีเซ็ต | All OK |

### 2.2 Auth copy — signin/signup contexts

| Context | Key | EN | Quality issues across locales |
|---|---|---|---|
| default.signin | title | Sign in to Supericons | All locales translate naturally. |
| default.signin | note | Free account. No card required for free icons. | All locales convey the meaning correctly. |
| default.signin | toggle | Do not have an account. | All locales render as a natural prompt. |
| default.signup | title | Create your Supericons account | All locales translate naturally. |
| purchase.signin | title | Sign in to continue your purchase | All locales translate naturally. |
| subscribe.signin | title | Sign in to go Pro | All locales translate naturally. |
| pro.signin | note | Free account first. Upgrade only when you want Pro features. | All locales convey this correctly. |

### 2.3 Auth error messages

| Key | EN | Quality issues |
|---|---|---|
| invalidCredentials | That email and password did not match. If you usually sign in with Google, continue with Google instead. | All locales correctly translate both the error and the Google fallback suggestion. |
| tooManyAttempts | Too many sign-in attempts. Please wait a little and try again. | All locales use polite, natural phrasing. |
| passwordMin | Password must be at least 8 characters. | All locales correctly convey the 8-character minimum. |
| passwordsMismatch | The passwords do not match. | All locales translate naturally. |
| resetTooSoon | Please wait a little before requesting another reset link. | All locales translate naturally. |
| confirmationTooSoon | Please wait a little before requesting another confirmation email. | All locales translate naturally. |

### 2.4 Cooldown/resend timer strings

| Key | EN | Note |
|---|---|---|
| resendInSeconds | Resend confirmation {seconds}s | All locales preserve the `{seconds}` placeholder correctly. |
| sendAgainInSeconds | Send reset link {seconds}s | All locales preserve the `{seconds}` placeholder correctly. |
| account.password.resetInSeconds | Send another reset email in {seconds}s | All locales preserve the `{seconds}` placeholder correctly. |

---

## 3. Account UI Messages (`account.*`)

### 3.1 Account menu and profile

| Key | EN | zh-Hans | zh-Hant | ja | ko | es | de | pt | ar | hi | vi | th | Issues |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| title | Account | 账户 | 帳戶 | アカウント | 계정 | Cuenta | Konto | Conta | الحساب | खाता | Tài khoản | บัญชี | All OK |
| menu.signOut | Sign out | 退出登录 | 登出 | サインアウト | 로그아웃 | Cerrar sesión | Abmelden | Sair | تسجيل الخروج | साइन आउट | Đăng xuất | ออกจากระบบ | All OK |
| menu.manageSubscription | Manage Subscription | 管理订阅 | 管理訂閱 | サブスクリプション管理 | 구독 관리 | Gestionar suscripción | Abo verwalten | Gerenciar assinatura | إدارة الاشتراك | सदस्यता प्रबंधित करें | Quản lý gói đăng ký | จัดการการสมัครสมาชิก | All OK |
| menu.purchases | My Purchases | 我的购买 | 我的購買 | 購入済み | 내 구매 | Mis compras | Meine Käufe | Minhas compras | مشترياتي | मेरी खरीदारी | Giao dịch mua của tôi | รายการซื้อของฉัน | All OK |

### 3.2 Profile section

| Key | EN | Quality notes |
|---|---|---|
| profile.title | Profile | All locales translate naturally (プロフィール, 프로필, Perfil, etc.) |
| profile.displayNamePlaceholder | Display name | All locales translate naturally. |
| profile.enterName | Enter a display name to save. | All locales translate naturally. |
| profile.nameTooShort | Use at least 2 characters for your display name. | All locales translate naturally. |
| profile.saved | Display name saved. | All locales translate naturally. |
| profile.saveFailed | Could not save display name. | All locales translate naturally. |

### 3.3 Password section

| Key | EN | Quality notes |
|---|---|---|
| password.addTitle | Add password sign-in | All locales translate naturally. |
| password.description | Use the secure recovery flow to choose a new password. | All locales translate naturally. |
| password.addDescription | You currently sign in with Google. Set a password if you also want to sign in with email. | All locales translate naturally. |
| password.resetSent | A password reset email has been sent to {email}. | All locales preserve `{email}` correctly. |
| password.noEmail | No signed-in email is available for this account. | All locales translate naturally. |

---

## 4. Checkout and Portal Messages (`checkout.*`)

| Key | EN | zh-Hans | zh-Hant | ja | ko | es | de | pt | ar | hi | vi | th | Issues |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| openingPortal | Opening subscription portal... | 正在打开订阅管理页面... | 正在開啟訂閱管理頁面... | サブスクリプションポータルを開いています... | 구독 포털을 여는 중입니다... | Abriendo el portal de suscripción... | Abonnementportal wird geöffnet... | Abrindo o portal de assinatura... | جار فتح بوابة الاشتراك... | सदस्यता पोर्टल खोला जा रहा है... | Đang mở cổng quản lý gói đăng ký... | กำลังเปิดพอร์ทัลการสมัครสมาชิก... | All OK |
| signInAgainPortal | Sign in again to open the subscription portal. | 请重新登录以打开订阅管理页面。 | 請重新登入以開啟訂閱管理頁面。 | サブスクリプションポータルを開くには、もう一度サインインしてください。 | 구독 포털을 열려면 다시 로그인하세요. | Vuelve a iniciar sesión para abrir el portal. | Melde dich erneut an, um das Portal zu öffnen. | Entre novamente para abrir o portal. | سجل الدخول مرة أخرى لفتح بوابة الاشتراك. | सदस्यता पोर्टल खोलने के लिए फिर से साइन इन करें। | Hãy đăng nhập lại để mở cổng quản lý. | โปรดเข้าสู่ระบบอีกครั้งเพื่อเปิดพอร์ทัล | All OK |
| portalUnavailable | Subscription portal is unavailable. | 订阅管理页面暂时不可用。 | 訂閱管理頁面暫時無法使用。 | サブスクリプションポータルは利用できません。 | 구독 포털을 사용할 수 없습니다. | El portal no está disponible. | Das Portal ist nicht verfügbar. | O portal está indisponível. | بوابة الاشتراك غير متاحة حاليا. | सदस्यता पोर्टल उपलब्ध नहीं है। | Cổng quản lý hiện không khả dụng. | พอร์ทัลการสมัครสมาชิกไม่พร้อมใช้งาน | All OK |
| portalFailed | Could not open subscription portal. | 无法打开订阅管理页面。 | 無法開啟訂閱管理頁面。 | サブスクリプションポータルを開けませんでした。 | 구독 포털을 열 수 없습니다. | No se pudo abrir el portal. | Das Portal konnte nicht geöffnet werden. | Não foi possível abrir o portal. | تعذر فتح بوابة الاشتراك. | सदस्यता पोर्टल नहीं खुल सका। | Không thể mở cổng quản lý. | ไม่สามารถเปิดพอร์ทัลการสมัครสมาชิกได้ | All OK |

---

## 5. API Key Messages (`apiKeys.*`)

Source: `data/i18n/messages/*.json`, `apiKeys` object.

### 5.1 API Keys per-locale comparison

| Key | EN | zh-Hans | zh-Hant | ja | ko | es | de | pt | ar | hi | vi | th | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| apiKeys.generateKey | Generate Key | 生成密钥 | 產生金鑰 | キーを生成 | 키 생성 | Generar clave | Schlüssel erstellen | Gerar chave | إنشاء مفتاح | कुंजी बनाएं | Tạo khóa | สร้างคีย์ | Present in all locales |
| apiKeys.modalWarning | Copy this key now. It will not be shown again. | 请立即复制此密钥。之后不会再次显示。 | 請立即複製此金鑰。之後不會再次顯示。 | このキーを今すぐコピーしてください。再表示はされません。 | 이 키를 지금 복사하세요. 다시 표시되지 않습니다. | Copia esta clave ahora. No se mostrará de nuevo. | Kopiere diesen Schlüssel jetzt. Er wird nicht erneut angezeigt. | Copie esta chave agora. Ela não será mostrada novamente. | انسخ هذا المفتاح الآن. لن يظهر مرة أخرى. | इस कुंजी को अभी कॉपी करें। यह फिर नहीं दिखाई जाएगी। | Hãy sao chép khóa này ngay. Khóa sẽ không được hiển thị lại. | คัดลอกคีย์นี้ตอนนี้ ระบบจะไม่แสดงอีก | Present in all locales |
| apiKeys.sessionExpired | Your session expired. Sign in again to manage keys. | 你的会话已过期。请重新登录以管理密钥。 | 你的工作階段已過期。請重新登入以管理金鑰。 | セッションの期限が切れました。キーを管理するには再度サインインしてください。 | 세션이 만료되었습니다. 키를 관리하려면 다시 로그인하세요. | Tu sesión expiró. Inicia sesión de nuevo para gestionar claves. | Deine Sitzung ist abgelaufen. Melde dich erneut an, um Schlüssel zu verwalten. | Sua sessão expirou. Entre novamente para gerenciar chaves. | انتهت جلستك. سجل الدخول مرة أخرى لإدارة المفاتيح. | आपका सत्र समाप्त हो गया। कुंजियां प्रबंधित करने के लिए फिर से लॉग इन करें। | Phiên của bạn đã hết hạn. Đăng nhập lại để quản lý khóa. | เซสชันของคุณหมดอายุ เข้าสู่ระบบอีกครั้งเพื่อจัดการคีย์ | Present in all locales |
| apiKeys.limitReached | You have reached the {limit}-key limit. Revoke one before creating another. | 你已达到 {limit} 个密钥上限。请先撤销一个再创建新的。 | 你已達到 {limit} 個金鑰上限。請先撤銷一個再建立新的。 | {limit} 個のキー上限に達しました。新しく作成する前に 1 つ取り消してください。 | 키 {limit}개 제한에 도달했습니다. 새 키를 만들기 전에 하나를 취소하세요. | Has alcanzado el límite de {limit} claves. Revoca una antes de crear otra. | Du hast das Limit von {limit} Schlüsseln erreicht. Widerrufe einen, bevor du einen neuen erstellst. | Você atingiu o limite de {limit} chaves. Revogue uma antes de criar outra. | وصلت إلى حد {limit} مفاتيح. ألغ مفتاحا قبل إنشاء آخر. | आप {limit} कुंजियों की सीमा पर पहुंच गए हैं। नई बनाने से पहले एक कुंजी रद्द करें। | Bạn đã đạt giới hạn {limit} khóa. Hãy thu hồi một khóa trước khi tạo khóa khác. | คุณถึงขีดจำกัด {limit} คีย์แล้ว เพิกถอนคีย์หนึ่งอันก่อนสร้างใหม่ | Present in all locales |
| apiKeys.failedGenerate | Failed to generate key | 生成密钥失败 | 產生金鑰失敗 | キーの生成に失敗しました | 키 생성 실패 | No se pudo generar la clave | Schlüssel konnte nicht erstellt werden | Falha ao gerar chave | فشل إنشاء المفتاح | कुंजी बनाना विफल रहा | Không tạo được khóa | สร้างคีย์ไม่สำเร็จ | Present in all locales |
| apiKeys.copiedToast | API key copied to clipboard | API 密钥已复制到剪贴板 | API 金鑰已複製到剪貼簿 | API キーをクリップボードにコピーしました | API 키가 클립보드에 복사되었습니다 | Clave API copiada al portapapeles | API-Schlüssel in die Zwischenablage kopiert | Chave API copiada para a área de transferência | تم نسخ مفتاح API إلى الحافظة | API कुंजी क्लिपबोर्ड में कॉपी हो गई | Đã sao chép khóa API vào clipboard | คัดลอกคีย์ API ไปยังคลิปบอร์ดแล้ว | Present in all locales |
| apiKeys.setup.pro | Connect your coding agent to Supericons MCP to access your premium icon collections or Pro workflow tools. | 将你的编程代理连接到 Supericons MCP，以访问高级图标集合或 Pro 工作流工具。 | 將你的程式代理連接到 Supericons MCP，以存取進階圖示集合或 Pro 工作流程工具。 | コーディングエージェントを Supericons MCP に接続して、プレミアムアイコンコレクションや Pro ワークフローツールにアクセスします。 | 코딩 에이전트를 Supericons MCP에 연결해 프리미엄 아이콘 컬렉션이나 Pro 워크플로 도구에 접근합니다. | Conecta tu agente de código a Supericons MCP para acceder a tus colecciones premium o herramientas Pro. | Verbinde deinen Coding-Agenten mit Supericons MCP, um auf Premium-Sammlungen oder Pro-Workflow-Tools zuzugreifen. | Conecte seu agente de código ao Supericons MCP para acessar coleções premium ou ferramentas Pro. | اربط وكيل البرمجة لديك بـ Supericons MCP للوصول إلى مجموعاتك المميزة أو أدوات Pro. | अपने कोडिंग एजेंट को Supericons MCP से जोड़ें ताकि आप प्रीमियम आइकन संग्रह या Pro वर्कफ्लो टूल इस्तेमाल कर सकें। | Kết nối tác nhân lập trình của bạn với Supericons MCP để truy cập bộ sưu tập premium hoặc công cụ Pro. | เชื่อมต่อเอเจนต์เขียนโค้ดของคุณกับ Supericons MCP เพื่อเข้าถึงคอลเลกชันพรีเมียมหรือเครื่องมือ Pro | Present in all locales |
| apiKeys.setup.free | Free MCP works without a key. | 免费 MCP 无需密钥即可使用。 | 免費 MCP 不需要金鑰即可使用。 | 無料 MCP はキーなしで使えます。 | 무료 MCP는 키 없이 사용할 수 있습니다. | MCP gratuito funciona sin clave. | Free MCP funktioniert ohne Schlüssel. | O MCP gratuito funciona sem chave. | يعمل MCP المجاني بدون مفتاح. | मुफ्त MCP बिना कुंजी के काम करता है। | MCP miễn phí hoạt động không cần khóa. | MCP ฟรีใช้งานได้โดยไม่ต้องใช้คีย์ | Present in all locales |
| apiKeys.seePricing | See Pricing | 查看价格 | 查看價格 | 料金を見る | 가격 보기 | Ver precios | Preise ansehen | Ver preços | عرض الأسعار | कीमत देखें | Xem giá | ดูราคา | Present in all locales |

### 5.2 API key observations

| Severity | Locale | Area | Observation | Recommended action |
|---|---|---|---|---|
| None | All | API key placeholders | `{limit}` is preserved in `apiKeys.limitReached` across all locales. | No action required. |
| Low | de | `apiKeys.setup.free` | `Free MCP funktioniert ohne Schlüssel.` keeps the English adjective `Free`, likely as product phrasing. | Decide whether this should remain product terminology or become `Kostenloses MCP funktioniert ohne Schlüssel.` |

---

## 6. Purchase Flow Messages (`purchaseFlow.*`)

Source: `data/i18n/messages/*.json`, `purchaseFlow` object.

| Key | EN | zh-Hans | zh-Hant | ja | ko | es | de | pt | ar | hi | vi | th | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| purchaseFlow.signInToPurchase | Sign in to continue your purchase | 登录以继续购买 | 登入以繼續購買 | 購入を続けるにはサインインしてください | 구매를 계속하려면 로그인하세요 | Inicia sesión para continuar con tu compra | Melde dich an, um deinen Kauf fortzusetzen | Entre para continuar sua compra | سجل الدخول لمتابعة الشراء | खरीद जारी रखने के लिए साइन इन करें | Đăng nhập để tiếp tục mua hàng | เข้าสู่ระบบเพื่อดำเนินการซื้อต่อ | Present in all locales |
| purchaseFlow.redirecting | Redirecting to checkout... | 正在跳转到结账页面... | 正在前往結帳頁面... | 決済画面に移動しています... | 결제 페이지로 이동 중... | Redirigiendo al pago... | Weiterleitung zum Checkout... | Redirecionando para o checkout... | جار التحويل إلى الدفع... | चेकआउट पर भेजा जा रहा है... | Đang chuyển đến trang thanh toán... | กำลังไปยังหน้าชำระเงิน... | Present in all locales |
| purchaseFlow.checkoutFailed | Checkout failed | 无法启动结账 | 無法啟動結帳 | 決済を開始できませんでした | 결제를 시작하지 못했습니다 | No se pudo iniciar el pago | Checkout fehlgeschlagen | Falha no checkout | فشل الدفع | चेकआउट शुरू नहीं हो सका | Không thể bắt đầu thanh toán | เริ่มการชำระเงินไม่สำเร็จ | Present in all locales |
| purchaseFlow.paymentError | Payment error. Please try again. | 支付过程中出现错误。请重试。 | 付款過程發生錯誤。請重試。 | 支払いエラーです。もう一度お試しください。 | 결제 오류가 발생했습니다. 다시 시도하세요. | Error de pago. Inténtalo de nuevo. | Zahlungsfehler. Bitte versuche es erneut. | Erro de pagamento. Tente novamente. | خطأ في الدفع. حاول مرة أخرى. | भुगतान में त्रुटि हुई। कृपया फिर कोशिश करें। | Lỗi thanh toán. Vui lòng thử lại. | เกิดข้อผิดพลาดในการชำระเงิน โปรดลองอีกครั้ง | Present in all locales |
| purchaseFlow.canceled | Payment was not completed. Try again. | 支付未完成。请重试。 | 付款尚未完成。請重試。 | 支払いは完了していません。もう一度お試しください。 | 결제가 완료되지 않았습니다. 다시 시도하세요. | El pago no se completó. Inténtalo de nuevo. | Die Zahlung wurde nicht abgeschlossen. Versuche es erneut. | O pagamento não foi concluído. Tente novamente. | لم يكتمل الدفع. حاول مرة أخرى. | भुगतान पूरा नहीं हुआ। कृपया फिर कोशिश करें। | Thanh toán chưa hoàn tất. Vui lòng thử lại. | การชำระเงินยังไม่เสร็จสมบูรณ์ โปรดลองอีกครั้ง | Present in all locales |
| purchaseFlow.purchaseSuccess | Purchase successful! Opening your collection... | 购买成功。正在打开你的集合... | 購買成功。正在開啟你的集合... | 購入が完了しました。コレクションを開いています... | 구매가 완료되었습니다. 컬렉션을 여는 중... | Compra completada. Abriendo tu colección... | Kauf erfolgreich. Deine Sammlung wird geöffnet... | Compra concluída. Abrindo sua coleção... | تم الشراء بنجاح. جار فتح مجموعتك... | खरीद सफल रही। आपका संग्रह खोला जा रहा है... | Mua hàng thành công. Đang mở bộ sưu tập... | ซื้อสำเร็จ กำลังเปิดคอลเลกชันของคุณ... | Present in all locales |

### 6.1 Purchase flow observations

| Severity | Locale | Area | Observation | Recommended action |
|---|---|---|---|---|
| None | All | Purchase flow | All audited purchase-flow strings are present in all 11 non-English locale files. | No action required. |

---

## 7. Claim Flow Messages (`claimFlow.*`)

Source: `data/i18n/messages/*.json`, `claimFlow` object.

| Key | EN | zh-Hans | zh-Hant | ja | ko | es | de | pt | ar | hi | vi | th | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claimFlow.subscriptionRequired | An active Pro subscription is required to claim collections. | 需要有效的 Pro 订阅才能领取集合。 | 需要有效的 Pro 訂閱才能領取集合。 | コレクションを追加するには有効な Pro サブスクリプションが必要です。 | 컬렉션을 추가하려면 활성 Pro 구독이 필요합니다. | Necesitas una suscripción Pro activa para añadir colecciones. | Zum Beanspruchen von Sammlungen ist ein aktives Pro-Abonnement erforderlich. | É necessária uma assinatura Pro ativa para resgatar coleções. | يلزم اشتراك Pro نشط للمطالبة بالمجموعات. | संग्रह लेने के लिए सक्रिय Pro सदस्यता चाहिए। | Cần có gói Pro đang hoạt động để nhận bộ sưu tập. | ต้องมีสมาชิก Pro ที่ใช้งานอยู่เพื่อรับคอลเลกชัน | Present in all locales |
| claimFlow.failed | Collection claim failed. Please try again. | 集合领取失败。请重试。 | 集合領取失敗。請重試。 | コレクションを追加できませんでした。もう一度お試しください。 | 컬렉션을 추가하지 못했습니다. 다시 시도하세요. | No se pudo añadir la colección. Inténtalo de nuevo. | Sammlung konnte nicht beansprucht werden. Bitte versuche es erneut. | Falha ao resgatar coleção. Tente novamente. | فشلت مطالبة المجموعة. حاول مرة أخرى. | संग्रह नहीं लिया जा सका। कृपया फिर कोशिश करें। | Không thể nhận bộ sưu tập. Vui lòng thử lại. | รับคอลเลกชันไม่สำเร็จ โปรดลองอีกครั้ง | Present in all locales |
| claimFlow.sessionExpired | Session expired. Please sign in again. | 你的会话已过期。请重新登录。 | 你的工作階段已過期。請重新登入。 | セッションの期限が切れました。もう一度サインインしてください。 | 세션이 만료되었습니다. 다시 로그인하세요. | Tu sesión caducó. Inicia sesión de nuevo. | Sitzung abgelaufen. Bitte melde dich erneut an. | Sessão expirada. Entre novamente. | انتهت الجلسة. سجل الدخول مرة أخرى. | आपका सेशन समाप्त हो गया। कृपया फिर साइन इन करें। | Phiên của bạn đã hết hạn. Vui lòng đăng nhập lại. | เซสชันของคุณหมดอายุ โปรดเข้าสู่ระบบอีกครั้ง | Present in all locales |
| claimFlow.nextAvailable | Next claim available {date}. | 下次可领取时间：{date}。 | 下次可領取時間：{date}。 | 次の引き換え可能日: {date} | 다음 사용 가능일: {date} | Próximo canje disponible el {date}. | Nächster Claim verfügbar am {date}. | Próximo resgate disponível em {date}. | المطالبة التالية متاحة في {date}. | अगला दावा {date} को उपलब्ध होगा। | Lượt nhận tiếp theo có vào {date}. | รับครั้งถัดไปได้ในวันที่ {date} | Present in all locales |
| claimFlow.legacyCredit | This will use 1 legacy credit. | 这将使用 1 个旧版额度。 | 這將使用 1 個舊版額度。 | 以前のクレジットを 1 つ使用します。 | 기존 크레딧 1개가 사용됩니다. | Esto usará 1 crédito anterior. | Dies verwendet 1 altes Guthaben. | Isto usará 1 crédito legado. | سيستخدم هذا رصيدا قديما واحدا. | इससे 1 पुराना क्रेडिट उपयोग होगा। | Thao tác này sẽ dùng 1 tín dụng cũ. | การดำเนินการนี้จะใช้เครดิตเดิม 1 เครดิต | Present in all locales |
| claimFlow.proClaim | This will use your active Pro claim. | 这将使用你的有效 Pro 领取额度。 | 這將使用你的有效 Pro 領取額度。 | 有効な Pro 引き換え枠を使用します。 | 활성 Pro 사용권이 사용됩니다. | Esto usará tu canje Pro activo. | Dies verwendet deinen aktiven Pro-Claim. | Isto usará seu resgate Pro ativo. | سيستخدم هذا مطالبة Pro النشطة لديك. | इससे आपका सक्रिय Pro दावा उपयोग होगा। | Thao tác này sẽ dùng lượt nhận Pro đang hoạt động của bạn. | การดำเนินการนี้จะใช้สิทธิ์รับ Pro ที่ใช้งานอยู่ของคุณ | Present in all locales |
| claimFlow.unavailable | Claim unavailable right now. | 此集合现在无法领取。 | 此集合現在無法領取。 | このコレクションは現在追加できません。 | 지금은 이 컬렉션을 추가할 수 없습니다. | Esta colección no está disponible para añadir ahora. | Claim ist gerade nicht verfügbar. | Resgate indisponível no momento. | المطالبة غير متاحة الآن. | यह संग्रह अभी नहीं लिया जा सकता। | Hiện chưa thể thêm bộ sưu tập này. | ยังรับคอลเลกชันนี้ไม่ได้ในตอนนี้ | Present in all locales |
| claimFlow.checking | Checking claim access... | 正在检查访问权限... | 正在檢查存取權限... | アクセス権を確認しています... | 접근 권한 확인 중... | Comprobando acceso... | Claim-Zugriff wird geprüft... | Verificando acesso ao resgate... | جار التحقق من وصول المطالبة... | एक्सेस जांचा जा रहा है... | Đang kiểm tra quyền truy cập... | กำลังตรวจสอบสิทธิ์... | Present in all locales |
| claimFlow.adding | Adding collection to My Collection... | 正在添加集合... | 正在加入集合... | コレクションを追加しています... | 컬렉션 추가 중... | Añadiendo colección... | Sammlung wird zu Meine Sammlung hinzugefügt... | Adicionando coleção à Minha coleção... | جار إضافة المجموعة إلى مجموعتي... | संग्रह जोड़ा जा रहा है... | Đang thêm bộ sưu tập... | กำลังเพิ่มคอลเลกชัน... | Present in all locales |
| claimFlow.added | Added "{name}" to My Collection. | {name} 已添加到我的集合。 | {name} 已加入我的集合。 | {name} をマイコレクションに追加しました。 | {name}이 내 컬렉션에 추가되었습니다. | {name} se añadió a Mi colección. | "{name}" wurde zu Meine Sammlung hinzugefügt. | "{name}" foi adicionada à Minha coleção. | تمت إضافة "{name}" إلى مجموعتي. | {name} मेरे संग्रह में जोड़ दिया गया। | Đã thêm {name} vào Bộ sưu tập của tôi. | เพิ่ม {name} ไปยังคอลเลกชันของฉันแล้ว | Present in all locales |
| claimFlow.addFailed | Failed to add collection. Please try again. | 无法添加集合。请重试。 | 無法加入集合。請重試。 | コレクションを追加できませんでした。もう一度お試しください。 | 컬렉션을 추가하지 못했습니다. 다시 시도하세요. | No se pudo añadir la colección. Inténtalo de nuevo. | Sammlung konnte nicht hinzugefügt werden. Bitte versuche es erneut. | Falha ao adicionar coleção. Tente novamente. | فشل إضافة المجموعة. حاول مرة أخرى. | संग्रह नहीं जोड़ा जा सका। कृपया फिर कोशिश करें। | Không thể thêm bộ sưu tập. Vui lòng thử lại. | เพิ่มคอลเลกชันไม่สำเร็จ โปรดลองอีกครั้ง | Present in all locales |

### 7.1 Claim flow observations

| Severity | Locale | Area | Observation | Recommended action |
|---|---|---|---|---|
| Medium | de | `claimFlow.unavailable` | Source string is `Claim ist gerade nicht verfügbar.` at `data/i18n/messages/de.json:714`, retaining the English noun `Claim`. | Replace with `Einlösung ist gerade nicht verfügbar.` if the product wants fully German claim-flow terminology. |
| Low | de | `claimFlow.checking`, `claimFlow.proClaim`, `claimFlow.nextAvailable` | These also retain `Claim` in German copy. This may be deliberate product terminology, but it should be a style decision rather than accidental drift. | Decide whether `Claim` is a product term in German. If not, align the claim-flow group around `Einlösung` or `Anspruch`. |
| None | All | Claim placeholders | `{date}` and `{name}` are preserved in the audited claim-flow strings across all locales. | No action required. |

---

## 8. Cross-Cutting Issues Summary

### 8.1 Source-backed issues and observations

| # | Severity | Locale | Area | Observation | Recommended action |
|---|---|---|---|---|---|
| 1 | None | th | Email `password_changed.eyebrow` | The matrix previously showed `แจ้งเตือนความ安全感`, but source verification confirms `แจ้งเตือนความปลอดภัย` at `send-email/index.ts:300`. This was a report extraction artifact. | Corrected in this report. No source-code change required. |
| 2 | Informational | fr | Locale scope | `fr.json` is absent and `fr` is not listed in `send-email/index.ts:24-37`. French is not in the current supported locale scope. | Do not treat as a current bug. Revisit only if French is added to product scope. |
| 3 | Medium | hi | Email `confirm_signup` | `अपना Supericons खाता पुष्टि करें` and `ईमेल पता पुष्टि करें` are understandable but grammatically incomplete. The verb phrase requires oblique case plus `की`. | Prefer `अपने Supericons खाते की पुष्टि करें` and `अपने ईमेल पते की पुष्टि करें`. |
| 4 | Low | hi | Email terminology | Hindi copy uses English loanwords in Devanagari, such as `पासवर्ड`, `रीसेट`, and `अपडेट`. This is lexical borrowing, not Latin-script mixing. | Decide style-guide stance: accept common Indian tech loanwords or prefer more Sanskritized/native terms. |
| 5 | Medium | hi | Email `password_changed.body` | `अपडेट किया गया है` uses a loanword; `बदला गया है` is more natural for a password-change notice. | Replace with `बदला गया है` if the desired Hindi style is more natural and less loanword-heavy. |
| 6 | Low | ja | Auth copy contexts | Several Japanese auth sign-in contexts use identical note text. This may be intentional simplification. | Verify with product intent before changing. |
| 7 | Medium | de | Claim flow | German `claimFlow.unavailable` keeps English `Claim`. Related claim-flow strings also use `Claim`. | Make an explicit German terminology decision and update the group consistently if needed. |
| 8 | None | All | Placeholder consistency | `{email}`, `{seconds}`, `{limit}`, `{date}`, `{name}`, `{price}`, `{count}`, `{percent}`, `{owned}`, `{total}`, `{label}`, `{prefix}`, `{active}`, `{shown}`, and `{library}` placeholders were previously reported as preserved. The new audited API Keys, Purchase Flow, and Claim Flow tables also preserve their placeholders. | No action required. |
| 9 | None | ar | RTL | Arabic email rendering uses `dir="rtl"` in the template path. The source sets this based on locale in `send-email/index.ts`. | No action required. |

### 8.2 Tone and register consistency

| Locale | Register | Evidence sample | Notes |
|---|---|---|---|
| ja | Polite | `メールアドレスを確認してください。` | Uses `してください`, appropriate for SaaS account messaging. |
| ko | Polite | `이메일 주소를 확인하세요.` | Uses polite `하세요`, appropriate for product UI. |
| zh-Hans | Neutral-polite | `请确认你的邮箱地址以激活账户。` | Uses `请` and `你`, standard for Simplified Chinese SaaS copy. |
| zh-Hant | Neutral-polite | `請確認你的電子郵件地址以啟用帳戶。` | Uses `請` and `你`, standard for Traditional Chinese SaaS copy. |
| de | Informal | `Bestätige deine E-Mail-Adresse...` | Uses informal `deine`, consistent with modern developer-product tone. |
| es | Informal | `Confirma tu correo...` | Uses informal `tu`, appropriate for approachable SaaS copy. |
| pt | Brazilian Portuguese | `Confirme seu email...` | Uses Brazilian-style `seu` and `email`, appropriate for the current `pt` locale. |
| ar | Neutral/formal | `أكّد بريدك الإلكتروني` | Direct but respectful product tone. |
| hi | Mixed loanword style | `पासवर्ड रीसेट करें` | Common in Indian tech UI, but should be governed by a style decision. |
| vi | Neutral-polite | `Hãy xác nhận email...` | Uses `Hãy` and `bạn`, standard for Vietnamese SaaS copy. |
| th | Neutral-polite | `ยืนยันอีเมลของคุณ` | Natural Thai product copy without unnecessary particles. |

---

## 9. Key-Level Completeness Check

Method: flatten `data/i18n/messages/en.json` and compare every key against each non-English locale file. Arrays are treated as terminal values.

| Locale file | Total keys in `en.json` | Missing keys | Extra keys | Percent complete |
|---|---:|---:|---:|---:|
| `zh-Hans.json` | 647 | 0 | 0 | 100.0% |
| `zh-Hant.json` | 647 | 0 | 0 | 100.0% |
| `ja.json` | 647 | 0 | 0 | 100.0% |
| `ko.json` | 647 | 0 | 0 | 100.0% |
| `es.json` | 647 | 0 | 0 | 100.0% |
| `de.json` | 647 | 0 | 0 | 100.0% |
| `pt.json` | 647 | 0 | 0 | 100.0% |
| `ar.json` | 647 | 0 | 0 | 100.0% |
| `hi.json` | 647 | 0 | 0 | 100.0% |
| `vi.json` | 647 | 0 | 0 | 100.0% |
| `th.json` | 647 | 0 | 0 | 100.0% |

### 9.1 Locale completeness matrix

| Area | zh-Hans | zh-Hant | ja | ko | es | de | pt | ar | hi | vi | th |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Email copy (3 intents) | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete |
| Auth UI | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete |
| Account UI | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete |
| Checkout/Portal | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete |
| API Keys | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete |
| Purchase Flow | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete |
| Claim Flow | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete | Complete |

---

## 10. Recommended Actions

| Priority | Action | Rationale |
|---|---|---|
| P1 | Do not change source code for the Thai email eyebrow issue | The source is already correct; only this report contained the extraction artifact. |
| P2 | Review German claim-flow terminology | `Claim` appears in German claim-flow copy. It may be acceptable as product terminology, but it should be a deliberate style decision. |
| P2 | Review Hindi auth email grammar | Some Hindi auth email strings are understandable but grammatically rough. The confirm-signup and password-changed email copy would benefit from a focused Hindi refinement pass. |
| P3 | Decide whether French is in future scope | French is not currently present in the UI files or auth email supported locale set. Add it only as a deliberate expansion with full UI and email coverage. |
| P3 | Review Japanese auth note reuse | The repeated Japanese note text may be fine, but should be confirmed as intentional. |

---

*End of audit report. This refinement updated the report only; no app code, locale JSON, or Supabase function files are part of this document change.*
