/**
 * SMS & WhatsApp Gateway Hook + Notification Log
 */
import * as db from "./db.js";
import { getCurrentUser } from "./auth.js";

export async function queueOrSendNotification({ recipientName, phone, channel = "WhatsApp", category = "Patient Alert", message }) {
  const cleanPhone = String(phone || "").replace(/[^0-9]/g, "");
  const settings = await db.getHospitalSettings();
  let status = "Queued";

  if (channel === "SMS" && settings.smsWebhookUrl) {
    try {
      await fetch(settings.smsWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, message, category })
      });
      status = "Sent via Webhook";
    } catch {
      status = "Webhook Queued";
    }
  } else if (channel === "WhatsApp" && cleanPhone) {
    status = "Ready (WhatsApp Link)";
  }

  const record = await db.add("sms_logs", {
    sentAt: new Date().toISOString(),
    recipientName,
    phone: cleanPhone,
    channel,
    category,
    message,
    status,
    sentBy: getCurrentUser()?.username || "system"
  });

  return {
    record,
    whatsappUrl: cleanPhone ? `https://wa.me/${cleanPhone.length === 10 ? "91" + cleanPhone : cleanPhone}?text=${encodeURIComponent(message)}` : null
  };
}
