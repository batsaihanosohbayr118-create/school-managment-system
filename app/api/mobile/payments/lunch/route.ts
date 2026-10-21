import type { LunchPaymentResponse } from "@shared/api-types";
import { requestLunchPayment } from "@/lib/school-db";
import { mobileRoute, preflight } from "@/lib/mobile/route-helpers";

export const runtime = "nodejs";

const METHODS = ["POST"];

export const OPTIONS = preflight(METHODS);

/**
 * Issues a lunch fee record for the picked days; the app then pays it through
 * /api/mobile/payments/qpay like any other record. The amount is computed in
 * the data layer from the dates alone.
 */
export const POST = mobileRoute<LunchPaymentResponse>(METHODS, async (context, request) => {
  const { dates } = ((await request.json().catch(() => ({}))) ?? {}) as { dates?: unknown };
  return requestLunchPayment(dates, context);
});
