// إرسال الإيميلات عبر Brevo (خطة مجانية، 300 رسالة يوميًا). يتطلب متغيرات البيئة على Render:
//   BREVO_API_KEY  مفتاح API من Brevo
//   MAIL_FROM      إيميل مُرسِل تم التحقق منه في Brevo
//   MAIL_FROM_NAME اختياري (الافتراضي CLUBSA)
// بدون هذه المتغيرات لا تُرسل رسائل ويستمر الموقع بالعمل (يبقى الاسترجاع بالكود).

export function mailConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.MAIL_FROM);
}

export async function sendMail(options: { to: string; subject: string; html: string; text: string }): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) throw new Error("mail_not_configured");

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: process.env.MAIL_FROM_NAME || "CLUBSA", email: from },
      to: [{ email: options.to }],
      subject: options.subject,
      htmlContent: options.html,
      textContent: options.text,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`mail_failed_${response.status}`);
}
