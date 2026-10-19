import { NextResponse } from "next/server";
import { settleQpayPayment } from "@/lib/school-db";
import { qpayPayment, verifyQpaySignature } from "@/lib/qpay";

export const runtime = "nodejs";

/**
 * QPay calls this once an invoice is paid. The URL carries our payment id
 * and a signature only the server can produce; the callback itself is never
 * trusted — the payment is re-fetched from QPay before anything is marked
 * Paid. If QPay's request carries no qpay_payment_id, nothing happens here
 * and the app's own check (/api/mobile/payments/qpay/check) settles it.
 */
async function handle(request: Request) {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get("payment") ?? "";
  const signature = url.searchParams.get("sig") ?? "";

  if (!paymentId || !/^[0-9a-f]+$/i.test(signature) || !verifyQpaySignature(signature, [paymentId])) {
    return NextResponse.json({ message: "Invalid callback." }, { status: 400 });
  }

  let qpayPaymentId = url.searchParams.get("qpay_payment_id") ?? "";
  if (!qpayPaymentId && request.method === "POST") {
    const body = (await request.json().catch(() => null)) as { payment_id?: unknown; qpay_payment_id?: unknown } | null;
    qpayPaymentId = String(body?.qpay_payment_id ?? body?.payment_id ?? "");
  }

  if (qpayPaymentId) {
    try {
      const payment = await qpayPayment(qpayPaymentId);
      if (payment.paid) await settleQpayPayment(paymentId, payment.amount);
    } catch (error) {
      console.warn("[qpay] callback verification failed", error);
    }
  }

  return new NextResponse("SUCCESS", { status: 200 });
}

export const GET = handle;
export const POST = handle;
