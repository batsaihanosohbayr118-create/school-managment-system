export type Gradient = readonly [string, string, ...string[]];

export type Palette = {
  background: Gradient;
  orbA: string;
  orbB: string;
  card: Gradient;
  cardBorder: string;
  glow: string;
  iconBg: string;
  iconBorder: string;
  icon: string;
  text: string;
  meta: string;
  divider: string;
  button: Gradient;
};

/** The payment screens' palette: a deep navy "glass" look in dark mode, a soft blue one in light. */
export const paymentPalettes: Record<'dark' | 'light', Palette> = {
  dark: {
    background: ['#0d1f6b', '#070d3d', '#040727'],
    orbA: 'rgba(59,130,246,0.22)',
    orbB: 'rgba(37,99,235,0.16)',
    card: ['rgba(40,78,210,0.32)', 'rgba(14,24,88,0.62)'],
    cardBorder: 'rgba(96,140,255,0.45)',
    glow: '#2f6bff',
    iconBg: 'rgba(59,130,246,0.2)',
    iconBorder: 'rgba(96,140,255,0.35)',
    icon: '#5b9bff',
    text: '#ffffff',
    meta: '#8fb3ff',
    divider: 'rgba(143,179,255,0.3)',
    button: ['#3d8bff', '#1f5bff']
  },
  light: {
    background: ['#dfe9ff', '#eef3ff', '#f4f6fb'],
    orbA: 'rgba(59,130,246,0.14)',
    orbB: 'rgba(124,58,237,0.08)',
    card: ['rgba(255,255,255,0.96)', 'rgba(238,243,255,0.96)'],
    cardBorder: 'rgba(37,99,235,0.22)',
    glow: '#2563eb',
    iconBg: 'rgba(37,99,235,0.1)',
    iconBorder: 'transparent',
    icon: '#2563eb',
    text: '#11181c',
    meta: '#4c6db5',
    divider: 'rgba(76,109,181,0.25)',
    button: ['#3b82f6', '#1d4ed8']
  }
};
