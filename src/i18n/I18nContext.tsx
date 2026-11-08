import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

import { es, en, type Locale, type Dictionary } from './dictionary'

const dictionaries: Record<Locale, Dictionary> = { es, en }

const STORAGE_KEY = 'rexi-locale'

function getInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'es' || stored === 'en') return stored
  } catch {
    // ignore
  }
  // Spanish is the default for a first-time visitor (spec 020 Task 1): the
  // buyer is a Spanish SMB, and the copy is authored in Spanish first. No
  // navigator.language detection: "no stored preference" means `es`, full stop.
  // English stays available through the switcher and is what the head metadata's
  // `og:locale:alternate` advertises.
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
  // Mirrors getInitialLocale(): anything rendered outside the provider must get
  // the same language as the page around it, not the minority locale.
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
