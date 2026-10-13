import { addMonths, format } from "date-fns";
import { storage } from "../storage";
import { sendRecurringChargeEmail } from "./email";

async function getActiveClientUserEmails(clientId: string): Promise<string[]> {
  const clientUsers = await storage.getClientUsersByClient(clientId);
  return clientUsers.filter((cu) => cu.isActive).map((cu) => cu.email);
}

export async function processDueRecurringCharges() {
  const today = format(new Date(), "yyyy-MM-dd");
  const due = await storage.getDueRecurringCharges(today);

  for (const charge of due) {
    const client = await storage.getClientById(charge.clientId);
    const recipients = client ? await getActiveClientUserEmails(charge.clientId) : [];

    try {
      if (recipients.length === 0) {
        await storage.createRecurringChargeSend({ chargeId: charge.id, status: "skipped_no_recipient" });
      } else {
        await sendRecurringChargeEmail({
          to: recipients,
          clientName: client!.clientName,
          title: charge.title,
          description: charge.description,
          amount: charge.amount,
          frequencyLabel: charge.frequency === "monthly" ? "دفعة شهرية متكررة" : "فاتورة لمرة واحدة",
        });
        await storage.createRecurringChargeSend({ chargeId: charge.id, status: "sent" });
      }
    } catch (err) {
      console.error(`Recurring charge ${charge.id} send failed:`, err);
      await storage.createRecurringChargeSend({ chargeId: charge.id, status: "failed", errorMessage: String(err) });
    }

    if (charge.frequency === "once") {
      await storage.updateRecurringCharge(charge.id, { status: "completed", lastSentAt: new Date() });
    } else {
      const nextSendDate = format(addMonths(new Date(charge.nextSendDate), 1), "yyyy-MM-dd");
      await storage.updateRecurringCharge(charge.id, { nextSendDate, lastSentAt: new Date() });
    }
  }
}
