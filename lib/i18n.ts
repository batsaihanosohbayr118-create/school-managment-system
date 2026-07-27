/**
 * The translation tables live in shared/i18n-tables.ts so the Expo mobile
 * client can use the same strings. What stays here is web-only: it reads
 * window.localStorage, which the mobile client doesn't have.
 */
export {
  languages,
  translations,
  translateColumn,
  translateValue,
  type Language,
  type AppCopy
} from "@shared/i18n-tables";

export const languageStorageKey = "educore_language";

export function getInitialLanguage(): import("@shared/i18n-tables").Language {
  if (typeof window !== "undefined") {
    const stored = getStoredLanguage();
    if (stored) return stored;

    const browserLang = navigator.language.split("-")[0];
    if (browserLang === "mn") return "mn";
  }
  return "en";
}

export function getStoredLanguage(): import("@shared/i18n-tables").Language | null {
  if (typeof window === "undefined") return null;
  const storedLanguage = window.localStorage.getItem(languageStorageKey);
  return storedLanguage === "en" || storedLanguage === "mn" ? storedLanguage : null;
}
