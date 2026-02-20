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

  if (saveToLocal) {
    localStorage.setItem('chatwoot_theme_color', palette.primary);
  }
};
