import { es } from './locales/es'

export type Locale = 'es' | 'en'

/** The shared shape: `es`'s keys and value kinds; `en` is annotated with it so a missing or misspelled key is a compile error. */
export type Dictionary = typeof es

export { en } from './locales/en'
export { es }
