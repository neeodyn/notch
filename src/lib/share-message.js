/** Default text a painter sends with the homeowner quote link. Editable before sending. */
export function defaultShareMessage({ clientName, address, businessName }) {
  const first = String(clientName || "").trim().split(/\s+/)[0];
  const street = String(address || "").split(",")[0].trim();
  const greeting = first ? `Hi ${first}, here's` : "Here's";
  const where = street ? ` for ${street}` : "";
  return `${greeting} your painting quote${where} from ${businessName || "us"}. You can view it, choose any optional extras and accept it online:`;
}

export function composeShareText(message, url) {
  return `${String(message || "").trim()}\n${url}`;
}

/** sms: link that pre-fills the message on both iPhone and Android. */
export function smsHref(phone, body) {
  const number = String(phone || "").replace(/[^\d+]/g, "");
  return `sms:${number}?&body=${encodeURIComponent(body)}`;
}

export function mailtoHref(email, subject, body) {
  const to = String(email || "").replace(/\s+/g, "");
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}