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

  // We are persisting in the system DOM as standard properties
  root.style.setProperty('--color-woot', palette.primary);
  root.style.setProperty('--color-primary', palette.primary);
  root.style.setProperty('--w-text-on-primary', palette.textOnPrimary);

  Object.keys(palette).forEach(key => {
    if (key !== 'primary' && key !== 'textOnPrimary') {
      root.style.setProperty(`--w-${key}`, palette[key]);
    }
  });

  // Create a high-specificity style tag to override any nested theme configurations like [data-theme]
  let styleEl = document.getElementById('custom-theme-colors');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'custom-theme-colors';
    document.head.appendChild(styleEl);
  }

  // Calculate RGB values for rgba() override injections with safety checks
  let cleanHex = hex ? String(hex).replace('#', '') : '1F93FF'; // Default to Woot Blue
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) || 31;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 147;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 255;
  const rgbValue = `${r}, ${g}, ${b}`;

  styleEl.textContent = `
    :root,
    :root[data-theme="light"],
    :root[data-theme="dark"],
    [data-theme="light"],
    [data-theme="dark"],
    .dark,
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
    }

    /* Message Bubbles */
    .bg-n-solid-blue {
      background-color: rgb(${rgbValue}) !important;
      color: #ffffff !important;
    }

    /* Active Links / Text */
    .text-n-blue-text, .text-woot-500 {
      color: rgb(${rgbValue}) !important;
    }

    /* Active Menu Backgrounds */
    .bg-n-alpha-1, .bg-n-alpha-2, .bg-n-solid-blue\\/10 {
      background-color: rgba(${rgbValue}, 0.1) !important;
    }
  `;

  console.log('[THEME/DEBUG] Injected Style Element:', styleEl.textContent);
  setTimeout(() => {
    console.log('[THEME/DEBUG] Computed --w-500 exists:', getComputedStyle(document.documentElement).getPropertyValue('--w-500'));
  }, 500);

  if (saveToLocal) {
    localStorage.setItem('chatwoot_theme_color', palette.primary);
  }
};
