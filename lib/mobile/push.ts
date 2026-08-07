/**
 * Sends push notifications through Expo's push service. No SDK needed — it's
 * a plain HTTPS endpoint that fans a batch out to Apple/Google on Expo's side.
 * https://docs.expo.dev/push-notifications/sending-notifications/
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/** Expo caps a single request at 100 messages; callers can pass more and this chunks it. */
const BATCH_SIZE = 100;

export type PushMessage = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/**
 * Fire-and-forget: failures are logged, never thrown. A missed notification
 * must not fail the grade/attendance/announcement save that triggered it.
 */
export async function sendPushNotifications(tokens: string[], message: PushMessage): Promise<void> {
  const uniqueTokens = [...new Set(tokens)].filter((token) => token.startsWith("ExponentPushToken"));
  if (uniqueTokens.length === 0) return;

  for (const batch of chunk(uniqueTokens, BATCH_SIZE)) {
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(
          batch.map((token) => ({
            to: token,
            title: message.title,
            body: message.body,
            data: message.data ?? {}
          }))
        )
      });

      // Expo's API returns 200 even when an individual token failed — the
      // per-token result (e.g. DeviceNotRegistered, a missing FCM/APNs
      // credential) is only visible in the response body's ticket list.
      const body = (await response.json().catch(() => null)) as { data?: unknown; errors?: unknown } | null;
      const tickets = Array.isArray(body?.data) ? body.data : [];
      const errorTickets = tickets.filter((ticket: { status?: string }) => ticket?.status === "error");
      if (!response.ok || errorTickets.length > 0 || body?.errors) {
        console.warn("Push notification batch had errors.", JSON.stringify({ status: response.status, body }));
      }
    } catch (error) {
      console.warn("Push notification batch failed to send.", error);
    }
  }
}
