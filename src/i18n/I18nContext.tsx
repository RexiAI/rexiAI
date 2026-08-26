import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { es, en, type Locale, type Dictionary } from './dictionary'

const dictionaries: Record<Locale, Dictionary> = { es, en: en as unknown as Dictionary }

const STORAGE_KEY = 'rexi-locale'

function getInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'es' || stored === 'en') return stored
  } catch {
    // ignore
  }
  return 'es'
}

// Apply synchronously at module init to avoid flash
try {
  const initial = getInitialLocale()
  if (typeof document !== 'undefined') {
    document.documentElement.lang = initial
  }
} catch {
  // ignore
}

interface I18nCtx {
  locale: Locale
  dict: Dictionary
  setLocale: (l: Locale) => void
}

const Ctx = createContext<I18nCtx>({
  locale: 'es',
  dict: es,
  setLocale: () => {},
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => getInitialLocale())

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      // ignore
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = l
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const dict = dictionaries[locale]
  return <Ctx.Provider value={{ locale, dict, setLocale }}>{children}</Ctx.Provider>
}

export function useI18n() {
  return useContext(Ctx)
}
