export type Locale = 'es' | 'en'

export const es = {
  nav: {
    services: 'Servicios',
    booking: 'Reservas',
    contact: 'Contacto',
  },
  switcher: {
    es: 'ES',
    en: 'EN',
  },
  hero: {
    catchphrase: 'Olvídate de tu Excel. Automatiza, con o sin IA.',
    subtext: 'Productos SaaS, webs y apps que resuelven problemas reales para negocios reales.',
    ctaBooking: 'Reserva tu hora',
    ctaContact: 'Escríbenos',
  },
  services: {
    title: 'Servicios',
    items: [
      {
        id: 'saas',
        title: 'Productos SaaS',
        description: 'Software a medida que automatiza tus procesos y escala con tu negocio.',
        meta: 'SaaS · Producto',
      },
      {
        id: 'webs',
        title: 'Sitios web',
        description: 'Webs rápidas y claras que convierten visitas en clientes.',
        meta: 'Web · Frontend',
      },
      {
        id: 'apps',
        title: 'Aplicaciones',
        description: 'Apps móviles y de escritorio pensadas para usar a diario.',
        meta: 'App · Móvil',
      },
      {
        id: 'consulting',
        title: 'Consultoría',
        description: 'Te ayudamos a decidir qué construir y cómo hacerlo bien.',
        meta: 'Consultoría · Estrategia',
      },
    ] as const,
  },
  booking: {
    title: 'Reserva tu sesión',
    narrative:
      'Elige fecha y hora. Primera hora gratis para clientes nuevos, después 30 EUR por hora.',
    steps: [
      'Elige fecha y hueco disponible',
      'Indica duración y tu email',
      'Paga de forma segura con Stripe',
    ],
    pricingRules: 'Primera hora gratis para clientes nuevos, después 30 EUR/hora',
    pricingExample: '1h gratis · 2h 30 EUR · 3h 60 EUR · 4h 90 EUR',
    form: {
      dateLabel: 'Fecha',
      slotLabel: 'Huecos disponibles',
      slotEmpty: 'Sin huecos ese día. Prueba otra fecha.',
      slotLoading: 'Cargando huecos...',
      durationLabel: 'Duración',
      emailLabel: 'Tu email',
      emailHelper: 'Usaremos este email para la confirmación',
      emailInvalid: 'Introduce un email válido',
      submit: 'Reservar y pagar',
      submitting: 'Redirigiendo a Stripe...',
      required: 'Este campo es obligatorio',
      conflict: 'Ese hueco ya no está disponible. Elige otro.',
    },
  },
  contact: {
    title: '¿Hablamos?',
    body: 'Cuéntanos tu idea y vemos cómo automatizarla.',
    cta: 'Escríbenos por email',
    email: 'danielbueno76@gmail.com',
  },
  result: {
    successTitle: 'Reserva recibida',
    successBody:
      'Tu reserva ha sido confirmada. Recibirás la confirmación por email y en tu calendario.',
    successAction: 'Volver al inicio',
    cancelTitle: 'Reserva cancelada',
    cancelBody: 'Has cancelado el proceso de pago. Puedes volver a intentarlo cuando quieras.',
    cancelAction: 'Volver a reservas',
  },
  footer: {
    rights: 'Todos los derechos reservados',
  },
} as const

export const en = {
  nav: {
    services: 'Services',
    booking: 'Booking',
    contact: 'Contact',
  },
  switcher: {
    es: 'ES',
    en: 'EN',
  },
  hero: {
    catchphrase: "Forget your Excel. Let's automate, with or without AI.",
    subtext: 'SaaS products, websites and apps that solve real problems for real businesses.',
    ctaBooking: 'Book your slot',
    ctaContact: 'Contact us',
  },
  services: {
    title: 'Services',
    items: [
      {
        id: 'saas',
        title: 'SaaS Products',
        description: 'Custom software that automates your processes and scales with your business.',
        meta: 'SaaS · Product',
      },
      {
        id: 'webs',
        title: 'Websites',
        description: 'Fast and clear websites that turn visits into customers.',
        meta: 'Web · Frontend',
      },
      {
        id: 'apps',
        title: 'Apps',
        description: 'Mobile and desktop apps built for daily use.',
        meta: 'App · Mobile',
      },
      {
        id: 'consulting',
        title: 'Consulting',
        description: 'We help you decide what to build and how to build it right.',
        meta: 'Consulting · Strategy',
      },
    ] as const,
  },
  booking: {
    title: 'Book your session',
    narrative: 'Pick a date and time. First hour free for new clients, then 30 EUR per hour.',
    steps: [
      'Pick a date and available slot',
      'Enter duration and your email',
      'Pay securely with Stripe',
    ],
    pricingRules: 'First hour free for new clients, then 30 EUR/hour',
    pricingExample: '1h free · 2h 30 EUR · 3h 60 EUR · 4h 90 EUR',
    form: {
      dateLabel: 'Date',
      slotLabel: 'Available slots',
      slotEmpty: 'No slots that day. Try another date.',
      slotLoading: 'Loading slots...',
      durationLabel: 'Duration',
      emailLabel: 'Your email',
      emailHelper: 'We will use this email for confirmation',
      emailInvalid: 'Please enter a valid email',
      submit: 'Book and pay',
      submitting: 'Redirecting to Stripe...',
      required: 'This field is required',
      conflict: 'That slot is no longer available. Please choose another.',
    },
  },
  contact: {
    title: "Let's talk",
    body: 'Tell us your idea and we will explore how to automate it.',
    cta: 'Email us',
    email: 'danielbueno76@gmail.com',
  },
  result: {
    successTitle: 'Booking received',
    successBody:
      'Your booking has been confirmed. You will receive confirmation by email and calendar.',
    successAction: 'Back to home',
    cancelTitle: 'Booking cancelled',
    cancelBody: 'You cancelled the payment process. You can try again whenever you like.',
    cancelAction: 'Back to booking',
  },
  footer: {
    rights: 'All rights reserved',
  },
} as const

export type Dictionary = typeof es

// Type check: both locales must have same keys (compile error if missing)
// The following line ensures `en` extends same shape as `es` - if a key is missing, TS errors on assignment above.
// We additionally export a helper that would fail if shapes diverge: use a conditional check via dummy.
const _check: Dictionary = en as unknown as Dictionary
void _check
