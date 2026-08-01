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

/**
 * Mongolian is the school's working language, so it is the default for
 * everyone. Browser locale is deliberately ignored — English-locale Windows is
 * common here and would otherwise flip Mongolian users to English. Only an
 * explicit choice, saved from the language switcher, overrides it.
 */
export function getInitialLanguage(): import("@shared/i18n-tables").Language {
  return getStoredLanguage() ?? "mn";
}

export function getStoredLanguage(): import("@shared/i18n-tables").Language | null {
  if (typeof window === "undefined") return null;
  const storedLanguage = window.localStorage.getItem(languageStorageKey);
  return storedLanguage === "en" || storedLanguage === "mn" ? storedLanguage : null;
}
