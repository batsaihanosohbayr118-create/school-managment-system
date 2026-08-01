export const themeStorageKey = "educore_theme";

export function getInitialDarkMode(): boolean {
  if (typeof window === "undefined") return false;

  const stored = window.localStorage.getItem(themeStorageKey);
  if (stored === "dark") return true;
  if (stored === "light") return false;

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function setStoredDarkMode(darkMode: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(themeStorageKey, darkMode ? "dark" : "light");
}
