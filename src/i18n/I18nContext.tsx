import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

import { es, en, type Locale, type Dictionary } from './dictionary'
import { applyDocumentHead } from './documentHead'

const dictionaries: Record<Locale, Dictionary> = { es, en }

const STORAGE_KEY = 'rexi-locale'

function readSearchParam(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return new URLSearchParams(window.location?.search ?? '').get(key)
  } catch {
    // A test stub may replace `window.location` with a plain object.
    return null
  }
}

/** `?lang=en` is the shareable English state; a valid query wins over storage. */
function localeFromUrl(): Locale | null {
  const value = readSearchParam('lang')
  if (value === 'es') return 'es'
  if (value === 'en') return 'en'
  return null
}

function getInitialLocale(): Locale {
  const fromUrl = localeFromUrl()
  if (fromUrl) return fromUrl
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

function buildLocaleSearch(locale: Locale, search: string): string {
  const params = new URLSearchParams(search)
  if (locale === 'es') {
    params.delete('lang')
  } else {
    params.set('lang', locale)
  }
  return params.toString()
}

function localeSuffix(locale: Locale, search: string): string {
  const next = buildLocaleSearch(locale, search)
  return next ? `?${next}` : ''
}

function replaceUrl(pathname: string, suffix: string): void {
  try {
    window.history.replaceState({}, '', `${pathname}${suffix}${window.location.hash ?? ''}`)
  } catch {
    // A test stub may not implement replaceState.
  }
}

/** Keep the URL shareable without adding a history entry per toggle. */
function writeLocaleToUrl(locale: Locale): void {
  if (typeof window === 'undefined') return
  const { history, location } = window
  if (!history || !history.replaceState) return
  if (!location || typeof location.pathname !== 'string') return
  replaceUrl(location.pathname, localeSuffix(locale, location.search))
}

// Apply synchronously at module init to avoid a language/head flash.
try {
  const initial = getInitialLocale()
  if (typeof document !== 'undefined') {
    document.documentElement.lang = initial
  }
  applyDocumentHead(dictionaries[initial].head)
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
    writeLocaleToUrl(l)
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
