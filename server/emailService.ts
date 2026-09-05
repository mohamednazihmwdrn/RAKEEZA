import nodemailer from 'nodemailer';

interface SendOtpResult {
  success: boolean;
  code: string;
  sentViaSmtp: boolean;
  message: string;
  error?: string;
}

let transporter: any = null;

function getTransporter(): any {
  const host = process.env.SMTP_HOST || (process.env.SMTP_USER && process.env.SMTP_USER.endsWith('@gmail.com') ? 'smtp.gmail.com' : '');
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || (host.includes('gmail.com') ? 465 : 587);
    const secure = port === 465;

    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  return transporter;
}

/**
 * Sends a 6-digit OTP verification email to user's Gmail
 */
export async function sendOtpVerificationEmail(
  toEmail: string,
  otpCode: string,
  companyName?: string
): Promise<SendOtpResult> {
  const mailer = getTransporter();
  const fromAddress = process.env.SMTP_FROM || `"منظومة ركيزة RAKEEZA ERP" <${process.env.SMTP_USER || 'no-reply@rakeeza.com'}>`;

  const htmlBody = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <title>رمز التحقق لمنظومة ركيزة السحابية</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; direction: rtl; }
        .card { max-width: 520px; margin: 20px auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.4); }
        .logo-box { text-align: center; margin-bottom: 24px; }
        .logo-title { font-size: 24px; font-weight: 900; color: #ffd54f; letter-spacing: 2px; }
        .subtitle { font-size: 14px; color: #94a3b8; margin-top: 4px; }
        .content { text-align: center; }
        .headline { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
        .desc { font-size: 14px; color: #cbd5e1; line-height: 1.6; margin-bottom: 24px; }
        .otp-box { background: #0f172a; border: 2px dashed #f59e0b; border-radius: 12px; padding: 18px 24px; display: inline-block; margin: 16px 0 24px 0; }
        .otp-code { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #fbbf24; font-family: monospace; }
        .warning { font-size: 12px; color: #ef4444; margin-top: 16px; }
        .footer { border-top: 1px solid #334155; margin-top: 30px; padding-top: 20px; text-align: center; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo-box">
          <div class="logo-title">📊 RAKEEZA CLOUD ERP</div>
          <div class="subtitle">منظومة إدارة المؤسسات والشركات السحابية المتكاملة</div>
        </div>
        <div class="content">
          <div class="headline">تأكيد البريد الإلكتروني وتفعيل حساب المنشأة</div>
          <p class="desc">
            مرحباً بك! لقد طلبت التحقق من بريدك الإلكتروني (${toEmail}) لتسجيل منشأتك ${companyName ? `"${companyName}"` : ''} في منظومة ركيزة السحابية.
            <br>
            يرجى استخدام رمز التحقق التالي لإتمام التفعيل:
          </p>
          <div class="otp-box">
            <div class="otp-code">${otpCode}</div>
          </div>
          <p class="desc">
            صلاحية هذا الرمز هي <strong>10 دقائق</strong> فقط.
          </p>
          <div class="warning">
            ⚠️ تنبيه أمني: لا تشارك هذا الرمز مع أي شخص. موظفو الدعم الفني لركيزة لن يطلبوا هذا الرمز أبداً.
          </div>
        </div>
        <div class="footer">
          جميع الحقوق محفوظة لمنظومة ركيزة RAKEEZA ERP © ${new Date().getFullYear()}
        </div>
      </div>
    </body>
    </html>
  `;

  if (mailer) {
    try {
      await mailer.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: `رمز التحقق لمنظومة ركيزة RAKEEZA: [ ${otpCode} ]`,
        text: `رمز التحقق الخاص بك في منظومة ركيزة السحابية هو: ${otpCode}. ينتهي خلال 10 دقائق.`,
        html: htmlBody,
      });

      return {
        success: true,
        code: otpCode,
        sentViaSmtp: true,
        message: 'تم إرسال كود التحقق بنجاح إلى بريدك الإلكتروني في Gmail.',
      };
    } catch (err: any) {
      console.error('SMTP sending error:', err);
      return {
        success: true,
        code: otpCode,
        sentViaSmtp: false,
        message: 'تم توليد كود التحقق (فشل إرسال SMTP، يرجى مراجعة إعدادات البريد).',
        error: err.message,
      };
    }
  }

  // If no SMTP configured, return code in sandbox mode so application doesn't get blocked
  return {
    success: true,
    code: otpCode,
    sentViaSmtp: false,
    message: 'تم إصدار رمز التحقق بنجاح.',
  };
}
