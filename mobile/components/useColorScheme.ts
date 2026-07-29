import { useTheme } from '@/lib/theme-context';

/** The effective color scheme — system, or the user's override from Settings. */
export const useColorScheme = () => {
  return useTheme().colorScheme;
};
