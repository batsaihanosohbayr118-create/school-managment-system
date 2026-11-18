import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Server-only client for the QPay Merchant API v2. The merchant username and
 * password must never reach the phone — the mobile app only ever sees the
 * invoice (QR + bank deeplinks) this module creates on its behalf.
 *
 * Env:
 *   QPAY_USERNAME, QPAY_PASSWORD, QPAY_INVOICE_CODE  (from QPay)
 *   QPAY_BASE_URL            default https://merchant.qpay.mn (sandbox: https://merchant-sandbox.qpay.mn)
 *   QPAY_CALLBACK_BASE_URL   public origin QPay calls back, e.g. https://www.nova-edu.mn
 *   QPAY_SIGNING_SECRET      signs check tokens and callback URLs; falls back to QPAY_PASSWORD
 */
type QpayConfig = {
  baseUrl: string;
  username: string;
  password: string;
  invoiceCode: string;
};

function qpayConfig(): QpayConfig {
  const username = process.env.QPAY_USERNAME;
  const password = process.env.QPAY_PASSWORD;
  const invoiceCode = process.env.QPAY_INVOICE_CODE;

  if (!username || !password || !invoiceCode) {
    throw new Error("QPay is not configured on the server.");
  }

  return {
    baseUrl: (process.env.QPAY_BASE_URL || "https://merchant.qpay.mn").replace(/\/+$/, ""),
    username,
    password,
    invoiceCode
  };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(config: QpayConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const response = await fetch(`${config.baseUrl}/v2/auth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${config.username}:${config.password}`).toString("base64")}` }
  });

  if (!response.ok) {
    throw new Error(`QPay authentication failed (${response.status}).`);
  }

  const body = (await response.json()) as { access_token?: string };
  if (!body.access_token) {
    throw new Error("QPay authentication returned no token.");
  }

  // QPay's tokens live far longer than this; a short fixed lifetime avoids
  // depending on how its expires_in field is encoded.
  cachedToken = { value: body.access_token, expiresAt: Date.now() + 10 * 60_000 };
  return cachedToken.value;
}

async function qpayRequest<T>(method: "GET" | "POST", path: string, body?: unknown, retried = false): Promise<T> {
  const config = qpayConfig();
  const token = await accessToken(config);

  const response = await fetch(`${config.baseUrl}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  if (response.status === 401 && !retried) {
    cachedToken = null;
    return qpayRequest<T>(method, path, body, true);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.warn(`[qpay] ${method} ${path} failed (${response.status}): ${detail.slice(0, 500)}`);
    throw new Error(`QPay request failed (${response.status}).`);
  }

  return (await response.json()) as T;
}

type QpayInvoiceBody = {
  invoice_id: string;
  qr_text?: string;
  qr_image?: string;
  qPay_shortUrl?: string;
  urls?: { name?: string; description?: string; logo?: string; link?: string }[];
};

export type QpayInvoice = {
  invoiceId: string;
  qrImage: string;
  shortUrl: string;
  banks: { name: string; description: string; logo: string; link: string }[];
};

export async function createQpayInvoice(input: {
  senderInvoiceNo: string;
  receiverCode: string;
  description: string;
  amount: number;
  callbackUrl: string;
}): Promise<QpayInvoice> {
  const config = qpayConfig();
  const body = await qpayRequest<QpayInvoiceBody>("POST", "/v2/invoice", {
    invoice_code: config.invoiceCode,
    sender_invoice_no: input.senderInvoiceNo,
    invoice_receiver_code: input.receiverCode,
    invoice_description: input.description,
    amount: input.amount,
    callback_url: input.callbackUrl
  });

  return {
    invoiceId: body.invoice_id,
    qrImage: body.qr_image ?? "",
    shortUrl: body.qPay_shortUrl ?? "",
    banks: (body.urls ?? [])
      .filter((url) => url.link)
      .map((url) => ({ name: url.name ?? "", description: url.description ?? "", logo: url.logo ?? "", link: url.link ?? "" }))
  };
}

type QpayPaymentRow = { payment_id?: string; payment_status?: string; payment_amount?: string | number };

/** Sum of the PAID payments QPay has recorded against an invoice. */
export async function paidAmountForInvoice(invoiceId: string): Promise<number> {
  const body = await qpayRequest<{ rows?: QpayPaymentRow[] }>("POST", "/v2/payment/check", {
    object_type: "INVOICE",
    object_id: invoiceId,
    offset: { page_number: 1, page_limit: 100 }
  });

  return (body.rows ?? [])
    .filter((row) => row.payment_status === "PAID")
    .reduce((total, row) => total + (Number(row.payment_amount) || 0), 0);
}

/** A single QPay payment, as referenced by the qpay_payment_id QPay puts on its callback. */
export async function qpayPayment(paymentId: string): Promise<{ paid: boolean; amount: number }> {
  const body = await qpayRequest<QpayPaymentRow>("GET", `/v2/payment/${encodeURIComponent(paymentId)}`);
  return { paid: body.payment_status === "PAID", amount: Number(body.payment_amount) || 0 };
}

function signingSecret(): string {
  const secret = process.env.QPAY_SIGNING_SECRET || process.env.QPAY_PASSWORD;
  if (!secret) throw new Error("QPay is not configured on the server.");
  return secret;
}

export function signQpay(parts: string[], secret = signingSecret()): string {
  return createHmac("sha256", secret).update(parts.join("\n")).digest("hex");
}

export function verifyQpaySignature(signature: string, parts: string[], secret = signingSecret()): boolean {
  const expected = Buffer.from(signQpay(parts, secret), "hex");
  const actual = Buffer.from(signature, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** The public origin QPay should call back; QPay cannot reach localhost. */
export function qpayCallbackBase(request: Request): string {
  return (process.env.QPAY_CALLBACK_BASE_URL || new URL(request.url).origin).replace(/\/+$/, "");
}
