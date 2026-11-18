import type { PaymentsResponse } from "@shared/api-types";
import { listResource } from "@/lib/school-db";
import { toPaymentEntries } from "@/lib/mobile/projections";
import { mobileRoute, preflight } from "@/lib/mobile/route-helpers";

export const runtime = "nodejs";

const METHODS = ["GET"];

export const OPTIONS = preflight(METHODS);

export const GET = mobileRoute<PaymentsResponse>(METHODS, async (context) => ({
  payments: toPaymentEntries(await listResource("payments", context))
}));
