export function normalizeWhatsAppPhoneNumber(phoneNumber = "") {
  return String(phoneNumber).replace(/[^\d]/g, "");
}

export function buildWhatsAppUrl(phoneNumber, contextLabel = "this request") {
  const normalizedPhoneNumber = normalizeWhatsAppPhoneNumber(phoneNumber);

  if (!normalizedPhoneNumber) {
    return "";
  }

  const message = encodeURIComponent(`Hi, I'm reaching out about ${contextLabel}.`);
  return `https://wa.me/${normalizedPhoneNumber}?text=${message}`;
}

export function canUseWhatsApp(phoneNumber) {
  return normalizeWhatsAppPhoneNumber(phoneNumber).length >= 7;
}
