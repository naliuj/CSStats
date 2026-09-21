import { useEffect, useState } from 'react';

export type ThemePref = 'system' | 'light' | 'dark';

export interface Palette {
  dark: boolean;
  surface: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  grid: string;
  axis: string;
  /** Categorical slots in fixed order: blue, orange, aqua, yellow. */
  series: [string, string, string, string];
  /** Neutral for raw solve dots. */
  dots: string;
  /** Sequential blue ramp, "near zero" first. */
  seq: string[];
}

export const LIGHT: Palette = {
  dark: false,
  surface: '#fcfcfb',
  text: '#0b0b0b',
  textSecondary: '#52514e',
  textMuted: '#7a7975',
  grid: '#e8e7e3',
  axis: '#c9c8c3',
  series: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'],
  dots: 'rgba(82, 81, 78, 0.2)',
  seq: ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'],
};

export const DARK: Palette = {
  dark: true,
  surface: '#1a1a19',
  text: '#ffffff',
  textSecondary: '#c3c2b7',
  textMuted: '#8f8e86',
  grid: '#2c2c2a',
  axis: '#4a4a46',
  series: ['#3987e5', '#d95926', '#199e70', '#c98500'],
  dots: 'rgba(195, 194, 183, 0.25)',
  seq: ['#0d366b', '#184f95', '#256abf', '#3987e5', '#5598e7', '#86b6ef', '#b7d3f6'],
};

const PREF_KEY = 'csstats-theme';

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(PREF_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* storage unavailable */
  }
  return 'system';
}

export function useTheme(): [Palette, ThemePref, (p: ThemePref) => void] {
  const [pref, setPref] = useState<ThemePref>(readPref);
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (pref === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', pref);
    try {
      if (pref === 'system') localStorage.removeItem(PREF_KEY);
      else localStorage.setItem(PREF_KEY, pref);
    } catch {
      /* storage unavailable */
    }
  }, [pref]);

  const dark = pref === 'dark' || (pref === 'system' && systemDark);
  return [dark ? DARK : LIGHT, pref, setPref];
}
