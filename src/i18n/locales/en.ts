import type { Dictionary } from '../dictionary'

export const en: Dictionary = {
  head: {
    title: 'RexiAI: custom apps for plumbers and shops in Miami',
    description:
      'Custom apps for plumbers, shops and clinics in Miami: quotes, appointments and orders in one tool your team opens on the phone. In person in Miami, or by video call.',
    locale: 'en_US',
    alternate: 'es_US',
  },
  a11y: {
    skipToContent: 'Skip to content',
  },
  nav: {
    services: 'Services',
    booking: "Let's talk",
    contact: 'Contact',
    privacy: 'Privacy',
  },
  switcher: {
    es: 'ES',
    en: 'EN',
  },
  hero: {
    eyebrow: 'Custom apps for your business',
    headline: 'You tell me. I build it.',
    subtext:
      'I listen, then build exactly what you described: quotes for plumbers and contractors, appointments for clinics and salons, orders for shops. In person in Miami, or by video call wherever you are. First call free, and you own the code.',
    ctaBooking: 'Book your free call',
    ctaWhatsApp: 'Message me on WhatsApp',
    whatsappUrl: 'https://wa.me/34644409229',
  },
  services: {
    title: 'What I build',
    offer: {
      title: 'One app instead of paper, spreadsheets and WhatsApp',
      description:
        'We go through the process that lives in spreadsheets, paper notes and chat messages today, and I turn it into one simple tool your team opens on the phone. One app built for you, doing the work on its own.',
    },
    beforeLabel: 'before',
    afterLabel: 'after',
    examples: [
      {
        id: 'plumber',
        trade: 'Plumbers',
        before: 'Quotes written by hand on paper.',
        after: 'A quote sent from the phone in a couple of minutes.',
      },
      {
        id: 'shop',
        trade: 'Shops',
        before: 'Stock counted in a spreadsheet.',
        after: 'An automatic alert before something runs out.',
      },
      {
        id: 'salon',
        trade: 'Salons and clinics',
        before: 'Appointments booked over WhatsApp.',
        after: 'A calendar with automatic reminders.',
      },
    ],
  },
  pricing: {
    title: 'Clear pricing',
    setup: {
      label: 'Setup',
      figure: 'from $1,200',
      note: 'Design, build and delivery of your app.',
    },
    monthly: {
      label: 'Hosting, maintenance and changes',
      figure: 'from $600/month',
      note: 'The app keeps running and I keep it up to date.',
    },
    note: 'The final price depends on the project and we settle it on the free first call. Nothing is charged before you see it clearly.',
  },
  proof: {
    title: 'Real work, real code',
    intro:
      'No client logos yet: I would rather show you the code. Everything below I built and maintain myself, and each link goes to the repository.',
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
    ],
  },
  about: {
    title: 'Who builds it',
    name: 'Daniel Bueno',
    role: 'Founder, RexiAI',
    location: 'I live in Salamanca, Spain; my clients are in Miami and I work with them remotely.',
    email: 'info@rexi-ai.com',
    githubLabel: 'github.com/RexiAI',
    githubUrl: 'https://github.com/RexiAI',
    bio: 'I am the founder of Rexi AI, where I designed and shipped a full-stack CRM end to end. I spent more than 10 years building software at Verisure España, Open Digital Services (Santander) and Grupo BME; I hold a Telecommunications Engineering degree from the Universidad de Valladolid and I work in native Spanish and fluent English. I live in Salamanca and work remotely with clients in Miami; away from work, I am an amateur padel addict.',
  },
  faq: {
    title: 'Frequently asked questions',
    items: [
      {
        id: 'maintenance-cost',
        question: 'How much does maintenance cost?',
        answer:
          'Maintenance is part of the monthly fee from $600/month: hosting, backups and the small changes you need along the way. If a month brings no changes, the fee still keeps everything running. I put it in writing before we start.',
      },
      {
        id: 'what-if-it-breaks',
        question: 'What if something breaks?',
        answer:
          'You message me and I fix it. If something stops working, I answer, not an anonymous support desk.',
      },
      {
        id: 'data-ownership',
        question: 'Who owns the data?',
        answer:
          'You do. The app connects to your own accounts and the data stays there; I only have access while I am working on it, and that access can be removed whenever you want.',
      },
      {
        id: 'mobile',
        question: 'Does it work on mobile?',
        answer:
          'Yes. I build it mobile first, because that is where your team will actually use it, and it opens properly on a laptop too.',
      },
    ],
  },
  booking: {
    title: 'Book your session',
    narrativeFree:
      'The first hour is free. You describe the process that is eating your week; you leave with a one-page plan and a fixed price for the build. No charge, no obligation, no slide deck.',
    narrativePaid:
      'First call free. After that we agree the project: setup from $1,200 and maintenance from $600/month.',
    stepsFree: ['Pick a slot', 'Tell me what is broken', 'Get the plan and the price'],
    stepsPaid: ['Pick a slot', 'Choose your block', 'Pay securely with Stripe'],
    priceLine: 'You choose how long the session runs.',
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
