const ALLOWED_PUBLIC_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "hotmail.co.uk",
  "outlook.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.co.uk",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
]);

const DISPOSABLE_DOMAINS = new Set([
  "10minutemail.com",
  "20minutemail.com",
  "dispostable.com",
  "emailondeck.com",
  "fakeinbox.com",
  "getnada.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "maildrop.cc",
  "mailinator.com",
  "mintemail.com",
  "moakt.com",
  "sharklasers.com",
  "temp-mail.org",
  "tempmail.com",
  "throwaway.email",
  "trashmail.com",
  "yopmail.com",
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z0-9-]{2,63}$/i;

function isDisposableDomain(domain: string): boolean {
  return [...DISPOSABLE_DOMAINS].some((blocked) => domain === blocked || domain.endsWith(`.${blocked}`));
}

function isAllowedDomain(domain: string): boolean {
  return ALLOWED_PUBLIC_DOMAINS.has(domain) || /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.gov\.sa$/i.test(domain);
}

export function validateRegistrationEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (!email) return "يرجى إدخال البريد الإلكتروني";
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return "يرجى إدخال بريد إلكتروني صحيح";

  const [, domain = ""] = email.split("@");
  if (isDisposableDomain(domain)) return "لا يمكن استخدام بريد مؤقت أو disposable";
  if (!isAllowedDomain(domain)) {
    return "يسمح فقط ببريد Gmail أو Hotmail أو Outlook أو نطاقات رسمية مثل gov.sa";
  }
  return "";
}

export function validateLoginEmail(value: string): string {
  const email = value.trim();
  if (!email) return "يرجى إدخال البريد الإلكتروني";
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return "يرجى إدخال بريد إلكتروني صحيح";
  return "";
}