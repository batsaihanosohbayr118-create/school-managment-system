import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

import { api } from "./api";

/**
 * Show a notification banner even while the app is open — the default
 * behavior swallows it silently in the foreground, which reads as "the
 * notification never arrived" during testing.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

/**
 * Requests notification permission, obtains this device's Expo push token,
 * and registers it against the signed-in account. Safe to call on every
 * launch and after every sign-in — it's a cheap upsert on the server, and
 * that's how a token rotation or a device switch stays current.
 *
 * A physical device is required (the underlying push services don't exist
 * in a simulator); silently no-ops otherwise rather than surfacing an error
 * for something the user can't act on.
 */
export async function registerPushToken(): Promise<void> {
  if (!Device.isDevice) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.warn("No EAS projectId configured — run `eas init` to enable push notifications.");
    return;
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.registerPushToken(token);
  } catch (error) {
    console.warn("Could not register push token.", error);
  }
}
