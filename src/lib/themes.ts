/**
 * Theme metadata for the "Make it yours" picker.
 *
 * The actual CSS variable values live in src/app/globals.css under
 * `[data-theme="<key>"]` rules. This file is the display data the picker renders
 * (name, emoji, vibe, swatches) plus validation helpers. Keeping them separate
 * avoids duplicating palette values in two places that can drift.
 */

export type ThemeKey = 'volt' | 'sunset' | 'mint' | 'mono' | 'bloom';

export interface ThemeMeta {
  key: ThemeKey;
  name: string;
  emoji: string;
  blurb: string;
  /** Representative swatch colors shown in the picker (hex). */
  swatch: { primary: string; accent: string; bg: string };
}

export const DEFAULT_THEME: ThemeKey = 'volt';

export const THEMES: ThemeMeta[] = [
  {
    key: 'volt',
    name: 'Volt',
    emoji: '⚡',
    blurb: 'Electric violet + neon lime. Bold, sporty, high-energy.',
    swatch: { primary: '#7C3AED', accent: '#A3E635', bg: '#FAFAFB' },
  },
  {
    key: 'sunset',
    name: 'Sunset',
    emoji: '🌅',
    blurb: 'Warm coral and tangerine. Golden-hour, feel-good vibes.',
    swatch: { primary: '#FB7185', accent: '#FB923C', bg: '#FFF7ED' },
  },
  {
    key: 'bloom',
    name: 'Bloom',
    emoji: '🌸',
    blurb: 'Hot pink and magenta. Playful, expressive, loud.',
    swatch: { primary: '#EC4899', accent: '#D946EF', bg: '#FDF2F8' },
  },
  {
    key: 'mint',
    name: 'Mint',
    emoji: '🌿',
    blurb: 'Fresh emerald and teal. Clean, calm, classic wellness.',
    swatch: { primary: '#10B981', accent: '#06B6D4', bg: '#F0FDF4' },
  },
  {
    key: 'mono',
    name: 'Mono',
    emoji: '🖤',
    blurb: 'High-contrast black & white with a single lime pop.',
    swatch: { primary: '#171717', accent: '#A3E635', bg: '#FFFFFF' },
  },
];

const KEYS = new Set<ThemeKey>(THEMES.map((t) => t.key));

export function isThemeKey(value: unknown): value is ThemeKey {
  return typeof value === 'string' && KEYS.has(value as ThemeKey);
}

export function getThemeMeta(key: string | null | undefined): ThemeMeta {
  if (key && isThemeKey(key)) {
    return THEMES.find((t) => t.key === key) ?? THEMES[0];
  }
  return THEMES[0];
}

export const COACH_PERSONAS: { key: string; name: string; emoji: string; blurb: string }[] = [
  { key: 'hype', name: 'Hype Coach', emoji: '🔥', blurb: 'Loud, energetic, celebrates every win.' },
  { key: 'bestie', name: 'Bestie', emoji: '💜', blurb: 'Warm, chatty, zero judgment.' },
  { key: 'coach', name: 'Pro Coach', emoji: '📋', blurb: 'Calm, structured, evidence-led.' },
  { key: 'chill', name: 'Chill Guide', emoji: '🌊', blurb: 'Low-pressure, relaxed, steady.' },
];

export const AVATAR_OPTIONS = [
  '🔥', '⚡', '🦊', '🐱', '🐺', '🦁', '🐯', '🐸', '🦄', '🐲',
  '👾', '🤖', '💀', '🌸', '🌈', '⚡', '💪', '🏃', '🥑', '🥦',
];
