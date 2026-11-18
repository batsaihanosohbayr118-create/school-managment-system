import type { QpayCheckResponse } from "@shared/api-types";
import { listResource, settleQpayPayment } from "@/lib/school-db";
import { toPaymentEntries } from "@/lib/mobile/projections";
import { mobileRoute, preflight } from "@/lib/mobile/route-helpers";
import { paidAmountForInvoice, verifyQpaySignature } from "@/lib/qpay";

export const runtime = "nodejs";

const METHODS = ["POST"];

export const OPTIONS = preflight(METHODS);

type CheckBody = { paymentId?: unknown; invoiceId?: unknown; checkToken?: unknown };

/**
 * The app calls this after the user comes back from their bank app. The
 * check token ties the invoice to the payment record it was created for, so
 * a paid invoice cannot be replayed against a different record.
 */
export const POST = mobileRoute<QpayCheckResponse>(METHODS, async (context, request) => {
  const { paymentId, invoiceId, checkToken } = ((await request.json().catch(() => ({}))) ?? {}) as CheckBody;
  if (typeof paymentId !== "string" || typeof invoiceId !== "string" || typeof checkToken !== "string") {
    throw new Error("paymentId, invoiceId and checkToken are required.");
  }

  const payment = toPaymentEntries(await listResource("payments", context)).find((entry) => entry.id === paymentId);
  if (!payment) throw new Error("You are not allowed to check this record.");
  if (payment.status.trim().toLowerCase() === "paid") return { paid: true };

  if (!verifyQpaySignature(checkToken, [paymentId, invoiceId])) throw new Error("Invalid check token.");

  const paidAmount = await paidAmountForInvoice(invoiceId);
  return { paid: await settleQpayPayment(paymentId, paidAmount) };
});
