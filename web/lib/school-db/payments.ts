import { createHash } from "node:crypto";
import { toPaymentEntries } from "@/lib/mobile/projections";
import { parseMoney } from "@/lib/mobile/table";
import { lunchAmount, normalizeLunchDates } from "@shared/lunch";
import { groupThousands } from "@shared/money";
import type { SchoolSession } from "@/lib/school-session";
import { type SchoolRequestContext, getPool, normalizedToken, stringValue } from "./base";
import { ensureSchoolDatabase } from "./schema";
import { logDatabaseFallback, readLocalStore, writeLocalStore } from "./local-store";
import { ownStudentRow } from "./access";
import { listResource, updateResource } from "./resources";

/**
 * Grades a student's English placement test and records the level.
 *
 * Lives here rather than in the route so the route keeps to the mobile API
 * rule — no SQL, no role checks of its own. The answer key is read from the
 * raw table, which the student's own listResource view never exposes.
 *
 * One attempt per student: a second submission is refused until the English
 * teacher deletes the first result.
 */
const QPAY_SYSTEM_SESSION: SchoolSession = { role: "admin", email: "qpay@system", name: "QPay", avatarUrl: "", source: "neon" };

/**
 * Marks a payment Paid once QPay has confirmed `paidAmount` against it.
 * The caller verifies the money with QPay; this only checks it covers the
 * recorded amount, then writes through updateResource like the admin
 * dashboard does. Returns whether the payment is now Paid.
 */
export async function settleQpayPayment(id: string, paidAmount: number): Promise<boolean> {
  const context: SchoolRequestContext = { session: QPAY_SYSTEM_SESSION };
  const table = await listResource("payments", context);
  const index = table.ids.indexOf(id);
  if (index < 0) return false;

  const row = table.rows[index];
  const value = (column: string) => row[table.columns.indexOf(column)] ?? "";
  if (value("Status").trim().toLowerCase() === "paid") return true;

  const amount = parseMoney(value("Amount"));
  if (amount === null || amount <= 0 || paidAmount < amount) return false;

  await updateResource(
    "payments",
    id,
    { Student: value("Student"), Amount: value("Amount"), Status: "Paid", "Due Date": value("Due Date"), "Fee Type": value("Fee Type") },
    context
  );
  return true;
}

const LUNCH_FEE_TYPE = "Lunch fee";

/**
 * Issues the lunch fee for the days a parent picked, so it can be paid with
 * QPay like any other payment record. The amount is recomputed here from the
 * dates; the client never sends one.
 *
 * The id hashes the child and the dates, so paying again for the same
 * selection (after a cancelled or failed QPay attempt) reuses the record
 * instead of piling up duplicates.
 */
export async function requestLunchPayment(dates: unknown, context: SchoolRequestContext) {
  if (context.session.role !== "parent") {
    throw new Error("Only parents have permission to pay the lunch fee.");
  }

  const days = normalizeLunchDates(dates);
  const student = await ownStudentRow("parent", normalizedToken(context.session.email));
  const studentName = stringValue(student?.full_name);
  if (!student || !studentName) {
    throw new Error("A linked student record is required to pay the lunch fee.");
  }

  const id = `LF-${createHash("sha256").update(`${stringValue(student.id)}|${days.join(",")}`).digest("hex").slice(0, 12)}`;
  const amountLabel = `${groupThousands(String(lunchAmount(days.length)))}₮`;
  const period = days.length === 1 ? days[0] : `${days[0]} – ${days[days.length - 1]}`;

  try {
    await ensureSchoolDatabase();
    await getPool().query(
      `INSERT INTO payment_records (id, student, amount, status, due_date, fee_type)
       VALUES ($1, $2, $3, 'Unpaid', $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [id, studentName, amountLabel, period, LUNCH_FEE_TYPE]
    );
  } catch (error) {
    logDatabaseFallback(error);
    const store = await readLocalStore();
    if (!store.payments.some((row) => row.id === id)) {
      store.payments = [{ id, values: [studentName, amountLabel, "Unpaid", period, LUNCH_FEE_TYPE], createdAt: new Date().toISOString() }, ...store.payments];
      await writeLocalStore(store);
    }
  }

  // Read back through the role filter, as the QPay route will.
  const payment = toPaymentEntries(await listResource("payments", context)).find((entry) => entry.id === id);
  if (!payment) throw new Error("You are not allowed to pay this record.");
  if (payment.status.trim().toLowerCase() === "paid") throw new Error("Invalid payment: these days are already paid.");

  return { paymentId: id, amountLabel: payment.amountLabel, days: days.length };
}
