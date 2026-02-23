import { LocalStorage } from 'shared/helpers/localStorage';
import { LOCAL_STORAGE_KEYS } from 'dashboard/constants/localStorage';

export const setColorTheme = isOSOnDarkMode => {
  const selectedColorScheme =
    LocalStorage.get(LOCAL_STORAGE_KEYS.COLOR_SCHEME) || 'auto';
  if (
    (selectedColorScheme === 'auto' && isOSOnDarkMode) ||
    selectedColorScheme === 'dark'
  ) {
    document.body.classList.add('dark');
    document.documentElement.style.setProperty('color-scheme', 'dark');
  } else {
    document.body.classList.remove('dark');
    document.documentElement.style.setProperty('color-scheme', 'light');
  }
};

export const generatePalette = hex => {
  let r, g, b;

  if (hex.charAt(0) === '#') {
    hex = hex.substr(1);
  }
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map(char => char + char)
      .join('');
  }

  r = parseInt(hex.substring(0, 2), 16) / 255;
  g = parseInt(hex.substring(2, 4), 16) / 255;
  b = parseInt(hex.substring(4, 6), 16) / 255;

  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const textColor = lum > 0.5 ? '#000000' : '#ffffff';

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  const isLight = l > 0.6;

  const lightnessMap = {
    25: 97,
    50: 95,
    75: 90,
    100: 85,
    200: 75,
    300: 65,
    400: 55,
    500: Math.round(l * 100),
    600: isLight ? 40 : 45,
    700: isLight ? 30 : 35,
    800: isLight ? 20 : 25,
    900: isLight ? 10 : 15,
  };

  const palette = {
    textOnPrimary: textColor,
    primary: '#' + hex,
  };

  Object.keys(lightnessMap).forEach(key => {
    let light = lightnessMap[key];
    let sat = key >= 600 && isLight ? Math.min(100, s + 20) : s;
    palette[key] = `hsl(${h}, ${sat}%, ${light}%)`;
  });

  return palette;
};

export const applyThemeColor = (hex, saveToLocal = true) => {
  if (!hex) return;

  const palette = generatePalette(hex);
  const root = document.documentElement;

  root.style.setProperty('--color-woot', palette.primary);
  root.style.setProperty('--color-primary', palette.primary);
  root.style.setProperty('--w-text-on-primary', palette.textOnPrimary);

  Object.keys(palette).forEach(key => {
    if (key !== 'primary' && key !== 'textOnPrimary') {
      root.style.setProperty(`--w-${key}`, palette[key]);
    }
  });

  // Parse hex to RGB components
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // Generate light tint for --solid-blue (like original #daecff = very light blue)
  // Mix the color with white at ~85% to get a subtle background
  const solidR = Math.round(r + (255 - r) * 0.85);
  const solidG = Math.round(g + (255 - g) * 0.85);
  const solidB = Math.round(b + (255 - b) * 0.85);

  // Generate dark tint for --solid-blue in dark mode (like original 16 49 91)
  // Mix the color with black at ~65% to get a deep shade
  const solidDarkR = Math.round(r * 0.35);
  const solidDarkG = Math.round(g * 0.35);
  const solidDarkB = Math.round(b * 0.35);

  // --text-blue: the readable brand text color (like original 8 109 224)
  // For light mode, darken slightly for readability
  const textR = Math.round(r * 0.8);
  const textG = Math.round(g * 0.8);
  const textB = Math.round(b * 0.8);

  // For dark mode text, lighten for readability (like original 126 182 255)
  const textDarkR = Math.round(r + (255 - r) * 0.5);
  const textDarkG = Math.round(g + (255 - g) * 0.5);
  const textDarkB = Math.round(b + (255 - b) * 0.5);

  // --border-blue: border accent
  const borderR = Math.round(r + (255 - r) * 0.6);
  const borderG = Math.round(g + (255 - g) * 0.6);
  const borderB = Math.round(b + (255 - b) * 0.6);

  // Create high-specificity style tag to override theme configurations
  let styleEl = document.getElementById('custom-theme-colors');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'custom-theme-colors';
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = `
    :root,
    :root[data-theme="light"],
    [data-theme="light"],
    .light {
      --w-25: ${palette[25]} !important;
      --w-50: ${palette[50]} !important;
      --w-75: ${palette[75]} !important;
      --w-100: ${palette[100]} !important;
      --w-200: ${palette[200]} !important;
      --w-300: ${palette[300]} !important;
      --w-400: ${palette[400]} !important;
      --w-500: ${palette[500]} !important;
      --w-600: ${palette[600]} !important;
      --w-700: ${palette[700]} !important;
      --w-800: ${palette[800]} !important;
      --w-900: ${palette[900]} !important;
      --color-woot: ${palette.primary} !important;
      --color-primary: ${palette.primary} !important;
      --w-text-on-primary: ${palette.textOnPrimary} !important;
      --solid-blue: ${solidR} ${solidG} ${solidB} !important;
      --text-blue: ${textR} ${textG} ${textB} !important;
      --border-blue: ${borderR} ${borderG} ${borderB} !important;
    }
    :root[data-theme="dark"],
    [data-theme="dark"],
    .dark {
      --w-25: ${palette[25]} !important;
      --w-50: ${palette[50]} !important;
      --w-75: ${palette[75]} !important;
      --w-100: ${palette[100]} !important;
      --w-200: ${palette[200]} !important;
      --w-300: ${palette[300]} !important;
      --w-400: ${palette[400]} !important;
      --w-500: ${palette[500]} !important;
      --w-600: ${palette[600]} !important;
      --w-700: ${palette[700]} !important;
      --w-800: ${palette[800]} !important;
      --w-900: ${palette[900]} !important;
      --color-woot: ${palette.primary} !important;
      --color-primary: ${palette.primary} !important;
      --w-text-on-primary: ${palette.textOnPrimary} !important;
      --solid-blue: ${solidDarkR} ${solidDarkG} ${solidDarkB} !important;
      --text-blue: ${textDarkR} ${textDarkG} ${textDarkB} !important;
      --border-blue: ${borderR} ${borderG} ${borderB} !important;
    }
  `;

  if (saveToLocal) {
    localStorage.setItem('chatwoot_theme_color', palette.primary);
  }
};

