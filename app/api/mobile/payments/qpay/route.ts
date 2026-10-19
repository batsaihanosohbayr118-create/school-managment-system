import type { QpayInvoiceResponse } from "@shared/api-types";
import { listResource } from "@/lib/school-db";
import { toPaymentEntries } from "@/lib/mobile/projections";
import { mobileRoute, preflight } from "@/lib/mobile/route-helpers";
import { createQpayInvoice, qpayCallbackBase, signQpay } from "@/lib/qpay";

export const runtime = "nodejs";

const METHODS = ["POST"];

export const OPTIONS = preflight(METHODS);

/**
 * Creates a QPay invoice for one payment record. The record is looked up
 * through listResource, so a student or parent can only ever invoice a
 * payment the data layer already lets them see.
 */
export const POST = mobileRoute<QpayInvoiceResponse>(METHODS, async (context, request) => {
  const { paymentId } = ((await request.json().catch(() => ({}))) ?? {}) as { paymentId?: unknown };
  if (typeof paymentId !== "string" || !paymentId) throw new Error("paymentId is required.");

  const payment = toPaymentEntries(await listResource("payments", context)).find((entry) => entry.id === paymentId);
  if (!payment) throw new Error("You are not allowed to pay this record.");
  if (payment.status.trim().toLowerCase() === "paid") throw new Error("Invalid payment: it is already paid.");

  const amount = payment.amount;
  if (amount === null || amount <= 0 || !Number.isInteger(amount)) throw new Error("Invalid payment amount.");

  const callbackUrl =
    `${qpayCallbackBase(request)}/api/qpay/callback` +
    `?payment=${encodeURIComponent(paymentId)}&sig=${signQpay([paymentId])}`;

  const invoice = await createQpayInvoice({
    // QPay wants this unique per invoice; a retry for the same record gets a fresh one.
    senderInvoiceNo: `${paymentId}-${Date.now()}`,
    receiverCode: context.session.email || "terminal",
    description: `${payment.student} ${payment.dueDate}`.trim() || paymentId,
    amount,
    callbackUrl
  });

  return {
    invoiceId: invoice.invoiceId,
    checkToken: signQpay([paymentId, invoice.invoiceId]),
    amount,
    qrImage: invoice.qrImage,
    shortUrl: invoice.shortUrl,
    banks: invoice.banks
  };
});
