'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { DEFAULT_THEME, isThemeKey, type ThemeKey } from '@/lib/themes'
import { safeStorage } from '@/lib/safe-storage'

const STORAGE_KEY = 'nc-theme'
const EVENT = 'nc-theme-change'

interface ThemeContextValue {
  theme: ThemeKey
  /** Persist + apply a theme everywhere (storage, <html data-theme>, other tabs). Accepts a raw string and validates it. */
  setTheme: (theme: string) => void
  /** Apply without persisting (used when hydrating from the profile). Accepts a raw string and validates it. */
  applyTheme: (theme: string) => void
  ready: boolean
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  applyTheme: () => {},
  ready: false,
})

function applyToDom(theme: ThemeKey) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeKey>(DEFAULT_THEME)
  const [ready, setReady] = useState(false)

  const applyTheme = useCallback((next: string) => {
    const key = isThemeKey(next) ? next : DEFAULT_THEME
    setThemeState(key)
    applyToDom(key)
  }, [])

  const setTheme = useCallback(
    (next: string) => {
      const key = isThemeKey(next) ? next : DEFAULT_THEME
      applyTheme(key)
      safeStorage.setItem(STORAGE_KEY, key)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(EVENT, { detail: key }))
      }
    },
    [applyTheme]
  )

  // Hydrate from storage on mount (instant, avoids palette flash).
  useEffect(() => {
    const stored = safeStorage.getItem(STORAGE_KEY)
    applyTheme(isThemeKey(stored) ? (stored as ThemeKey) : DEFAULT_THEME)
    setReady(true)

    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<ThemeKey>).detail
      if (detail) applyTheme(detail)
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue && isThemeKey(e.newValue)) {
        applyTheme(e.newValue as ThemeKey)
      }
    }
    window.addEventListener(EVENT, onCustom as EventListener)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(EVENT, onCustom as EventListener)
      window.removeEventListener('storage', onStorage)
    }
  }, [applyTheme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, applyTheme, ready }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
