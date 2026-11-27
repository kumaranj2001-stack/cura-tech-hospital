/**
 * SMS & WhatsApp Notification Gateway Hook
 * Logs every notification in Firestore/Sandbox and triggers optional Webhook or WhatsApp Web link.
 */
import * as db from "./db.js";
import * as auth from "./auth.js";

export async function queueOrSendNotification({ recipientName, phone, channel = "SMS", category = "General", message }) {
  const cleanPhone = String(phone || "").replace(/\D/g, "");
  const settings = await db.getHospitalSettings();

  const record = await db.add("notifications_log", {
    sentAt: new Date().toISOString(),
    recipientName: recipientName || "Patient",
    phone: cleanPhone || phone || "",
    channel,
    category,
    message,
    sentBy: auth.getCurrentUser()?.username || "system",
    status: settings.smsWebhookUrl ? "Dispatched via Webhook" : "Logged (Gateway Ready)"
  });

  if (settings.smsWebhookUrl && channel === "SMS") {
    try {
      await fetch(settings.smsWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: cleanPhone, message, category })
      });
    } catch (err) {
      console.warn("Webhook call failed (logged locally):", err);
    }
  }

  let whatsappUrl = null;
  if (channel === "WhatsApp" && cleanPhone) {
    const intl = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    whatsappUrl = `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
  }

  return { record, whatsappUrl };
}
