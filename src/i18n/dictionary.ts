export type Locale = 'es' | 'en'

/**
 * `es` is the single source of the dictionary shape: `Dictionary` below is
 * derived from it, so the key set and value kinds are declared once. Without a
 * `const` assertion object properties widen to `string` / `string[]`, which is
 * the type every locale is checked against — a key missing from `en`, or
 * misspelled in it, is a compile error.
 */
export const es = {
  head: {
    title: 'RexiAI — software a precio fijo para negocios atrapados en Excel',
    description:
      'Sustituyo el Excel del que depende tu negocio por software que funciona solo. Precio fijo, alcance cerrado en una llamada, entregado en semanas. Primera hora gratis.',
    locale: 'es_ES',
    alternate: 'en_GB',
  },
  a11y: {
    skipToContent: 'Saltar al contenido',
  },
  nav: {
    services: 'Servicios',
    booking: 'Reservas',
    contact: 'Contacto',
    privacy: 'Privacidad',
  },
  switcher: {
    es: 'ES',
    en: 'EN',
  },
  hero: {
    catchphrase: 'Tu negocio funciona con una hoja de cálculo que solo una persona entiende.',
    subtext:
      'La sustituyo por software que funciona solo: herramientas internas, productos SaaS y aplicaciones web. Alcance en una llamada, precio fijo, entregado en semanas. El código es tuyo.',
    ctaBooking: 'Reserva una hora gratis',
    ctaMicrocopy: 'Te llevas un plan de una página y un precio fijo.',
    ctaContact: 'Escríbeme',
  },
  services: {
    title: 'Lo que construyo',
    items: [
      {
        id: 'internal-tools',
        title: 'Herramientas internas',
        description:
          'El proceso que vive en tres hojas de cálculo y en la cabeza de una persona, reconstruido como una sola herramienta que tu equipo abre de verdad.',
      },
      {
        id: 'saas-products',
        title: 'Productos SaaS',
        description:
          'Si lo que necesitas no existe, construyo la v1: autenticación, facturación, despliegues, las partes aburridas bien hechas.',
      },
      {
        id: 'websites-and-apps',
        title: 'Webs y aplicaciones',
        description: 'Rápidas, claras y convierten. Sin constructores de páginas, sin plantillas.',
      },
    ],
  },
  proof: {
    title: 'Código publicado, no presentaciones',
    intro:
      'Todavía no hay logos de clientes. Todo lo de abajo es código abierto, construido y mantenido por mí; cada enlace lleva al repositorio.',
    linkLabel: 'Ver código',
    items: [
      {
        name: 'tax-advisor',
        line: 'Asesoría fiscal con IA para autónomos en España.',
        href: 'https://github.com/RexiAI/tax-advisor',
      },
      {
        name: 'pensions-system',
        line: 'Cálculo de pensiones, de principio a fin.',
        href: 'https://github.com/RexiAI/pensions-system',
      },
      {
        name: 'my-engineering-standards',
        line: 'El estándar de ingeniería contra el que se construye todo lo anterior: pipeline de especificaciones, puertas de CI, con mutation testing.',
        href: 'https://github.com/RexiAI/my-engineering-standards',
      },
    ],
  },
  about: {
    title: 'Quién lo construye',
    name: 'Daniel Bueno',
    role: 'Fundador, RexiAI',
    location: 'En España (Europe/Madrid). Trabajo en español e inglés.',
    email: 'info@rexi-ai.com',
    githubLabel: 'github.com/RexiAI',
    githubUrl: 'https://github.com/RexiAI',
    // Empty until a real bio is supplied: a data edit, not a code change.
    bio: '',
  },
  booking: {
    title: 'Reserva tu sesión',
    narrativeFree:
      'La primera hora es gratis. Describes el proceso que te está comiendo la semana; te vas con un plan de una página y un precio fijo para la construcción. Sin cargo, sin compromiso, sin presentación.',
    narrativePaid:
      'Primera hora gratis. Después, 30 EUR por hora, prepagado — pagas el bloque que reservas, nada se factura después.',
    stepsFree: ['Elige un hueco', 'Cuéntame qué está roto', 'Recibe el plan y el precio'],
    stepsPaid: ['Elige un hueco', 'Elige tu bloque', 'Paga de forma segura con Stripe'],
    priceLine: '1h gratis · 2h 30 EUR · 3h 60 EUR · 4h 90 EUR',
    freeNote: 'Sesión gratuita: no se cobra nada ahora.',
    pending: 'Cargando la reserva…',
    form: {
      dateLabel: 'Fecha',
      dateHelper: 'Elige un día para ver los huecos disponibles (hora de Madrid)',
      dateSelected: 'Fecha elegida',
      slotLabel: 'Huecos disponibles',
      slotEmpty: 'Sin huecos ese día. Prueba otra fecha.',
      slotLoading: 'Cargando huecos...',
      durationLabel: 'Duración',
      emailLabel: 'Tu email',
      emailHelper: 'Usaremos este email para la confirmación',
      emailInvalid: 'Introduce un email válido',
      nameLabel: 'Tu nombre',
      nameHelper: 'Así sabremos con quién es la sesión',
      nameTooLong: 'El nombre es demasiado largo',
      submit: 'Reservar y pagar',
      submitFree: 'Reserva la hora gratis',
      pending: 'Cargando…',
      submitting: 'Redirigiendo a Stripe...',
      submittingDirect: 'Enviando tu reserva...',
      required: 'Este campo es obligatorio',
      conflict: 'Ese hueco ya no está disponible. Elige otro.',
    },
    confirmation: {
      title: 'Reserva confirmada',
      dateLabel: 'Fecha',
      timeLabel: 'Hora',
      note: 'Te hemos enviado la confirmación por email, con el enlace para unirte a la sesión.',
    },
  },
  contact: {
    title: 'Cuéntame qué está roto.',
    body: 'Un email, tres líneas: el proceso, cada cuánto duele y qué te cuesta.',
    cta: 'Escríbeme',
    email: 'info@rexi-ai.com',
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
    privacy: 'Política de privacidad',
  },
}

/**
 * The shared shape: `es`'s keys and value kinds, with each locale keeping its
 * own copy of the text. `en` is annotated with it, so a missing or misspelled
 * key is a compile error; a caller may also hand a component a dictionary whose
 * values differ from the committed copy (the review-time `about.bio`, and tests
 * that swap one string to prove a value is read rather than duplicated).
 */
export type Dictionary = typeof es

export const en: Dictionary = {
  head: {
    title: 'RexiAI — fixed-price software for teams stuck on spreadsheets',
    description:
      'I replace the spreadsheet your business depends on with software that runs itself. Fixed price, scoped in one call, shipped in weeks. First hour free.',
    locale: 'en_GB',
    alternate: 'es_ES',
  },
  a11y: {
    skipToContent: 'Skip to content',
  },
  nav: {
    services: 'Services',
    booking: 'Booking',
    contact: 'Contact',
    privacy: 'Privacy',
  },
  switcher: {
    es: 'ES',
    en: 'EN',
  },
  hero: {
    catchphrase: 'Your business runs on a spreadsheet only one person understands.',
    subtext:
      'I replace it with software that runs itself: internal tools, SaaS products and web apps. Scoped in one call, fixed price, shipped in weeks. You own the code.',
    ctaBooking: 'Book a free hour',
    ctaMicrocopy: 'You leave with a one-page plan and a fixed price.',
    ctaContact: 'Email me',
  },
  services: {
    title: 'What I build',
    items: [
      {
        id: 'internal-tools',
        title: 'Internal tools',
        description:
          "The process living in three spreadsheets and one person's head, rebuilt as one tool your team actually opens.",
      },
      {
        id: 'saas-products',
        title: 'SaaS products',
        description:
          'If the thing you need does not exist, I build v1: auth, billing, deploys, the boring parts done properly.',
      },
      {
        id: 'websites-and-apps',
        title: 'Websites and apps',
        description: 'Fast, clear, and it converts. No page builder, no template.',
      },
    ],
  },
  proof: {
    title: 'Shipped code, not slideshow',
    intro:
      'No client logos yet. Everything below is open source, built and run by me; each link goes to the repository.',
    linkLabel: 'View source',
    items: [
      {
        name: 'tax-advisor',
        line: 'AI tax guidance for Spanish freelancers.',
        href: 'https://github.com/RexiAI/tax-advisor',
      },
      {
        name: 'pensions-system',
        line: 'Pension calculation, end to end.',
        href: 'https://github.com/RexiAI/pensions-system',
      },
      {
        name: 'my-engineering-standards',
        line: 'The engineering standard everything above is built against: spec pipeline, CI gates, mutation-tested.',
        href: 'https://github.com/RexiAI/my-engineering-standards',
      },
    ],
  },
  about: {
    title: 'Who builds it',
    name: 'Daniel Bueno',
    role: 'Founder, RexiAI',
    location: 'Based in Spain (Europe/Madrid). Working in English and Spanish.',
    email: 'info@rexi-ai.com',
    githubLabel: 'github.com/RexiAI',
    githubUrl: 'https://github.com/RexiAI',
    bio: '',
  },
  booking: {
    title: 'Book your session',
    narrativeFree:
      'The first hour is free. You describe the process that is eating your week; you leave with a one-page plan and a fixed price for the build. No charge, no obligation, no slide deck.',
    narrativePaid:
      'First hour free. After that, 30 EUR per hour, prepaid — you pay for the block you book, nothing is metered afterwards.',
    stepsFree: ['Pick a slot', 'Tell me what is broken', 'Get the plan and the price'],
    stepsPaid: ['Pick a slot', 'Choose your block', 'Pay securely with Stripe'],
    priceLine: '1h free · 2h 30 EUR · 3h 60 EUR · 4h 90 EUR',
    freeNote: 'Free session: nothing is charged now.',
    pending: 'Loading booking…',
    form: {
      dateLabel: 'Date',
      dateHelper: 'Pick a day to see available slots (Madrid time)',
      dateSelected: 'Selected date',
      slotLabel: 'Available slots',
      slotEmpty: 'No slots that day. Try another date.',
      slotLoading: 'Loading slots...',
      durationLabel: 'Duration',
      emailLabel: 'Your email',
      emailHelper: 'We will use this email for confirmation',
      emailInvalid: 'Please enter a valid email',
      nameLabel: 'Your name',
      nameHelper: 'So we know who the session is for',
      nameTooLong: 'The name is too long',
      submit: 'Book and pay',
      submitFree: 'Book the free hour',
      pending: 'Loading…',
      submitting: 'Redirecting to Stripe...',
      submittingDirect: 'Sending your reservation...',
      required: 'This field is required',
      conflict: 'That slot is no longer available. Please choose another.',
    },
    confirmation: {
      title: 'Booking confirmed',
      dateLabel: 'Date',
      timeLabel: 'Time',
      note: 'We emailed your confirmation, including the link to join your session.',
    },
  },
  contact: {
    title: 'Tell me what is broken.',
    body: 'One email, three lines: the process, how often it hurts, what it costs you.',
    cta: 'Email me',
    email: 'info@rexi-ai.com',
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
    privacy: 'Privacy policy',
  },
}
