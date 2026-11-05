// Privacy policy content (RGPD / LOPDGDD / LSSI-CE), served at /privacy.
//
// The Spanish text is the authoritative version; the English one is a
// translation. Keep the two structurally identical — the `Record<Locale, …>`
// type only guarantees that, not that the prose says the same thing, so edit
// both when a fact changes.
//
// Every fact below was read off the code, not invented: the booking fields come
// from api/bookings/checkout.ts, the recording chain from
// docs/recording-pipeline.md, the processors from api/*.ts, and the "no cookies"
// claim from the absence of any cookie/analytics call in src/.
import type { Locale } from '../i18n/dictionary'

import { LEGAL_ENTITY } from './legalEntity'

export { LEGAL_ENTITY }

/**
 * Last substantive change. Update when the treatment or the processors change.
 */
export const PRIVACY_UPDATED = {
  es: '5 de noviembre de 2026',
  en: '5 November 2026',
} as const

export interface PrivacyTable {
  headers: readonly [string, string]
  rows: readonly (readonly [string, string])[]
}

export interface PrivacySection {
  id: string
  heading: string
  paragraphs?: readonly string[]
  list?: readonly string[]
  table?: PrivacyTable
}

export interface PrivacyDoc {
  title: string
  updated: string
  intro: readonly string[]
  sections: readonly PrivacySection[]
  backHome: string
}

const es: PrivacyDoc = {
  title: 'Política de Privacidad',
  updated: `Última actualización: ${PRIVACY_UPDATED.es}`,
  intro: [
    'Esta Política de Privacidad explica qué datos personales trata RexiAI, para qué los usa, con quién los comparte y cómo puedes ejercer tus derechos. Se aplica al sitio web www.rexi-ai.com, al sistema de reservas y a las sesiones que se celebran a través de él.',
    'El tratamiento se rige por el Reglamento (UE) 2016/679 (RGPD), la Ley Orgánica 3/2018 (LOPDGDD) y, en lo relativo a la información y a los servicios de la sociedad de la información, la Ley 34/2002 (LSSI-CE).',
  ],
  sections: [
    {
      id: 'responsable',
      heading: '1. Responsable del tratamiento',
      paragraphs: [
        `Titular y responsable: ${LEGAL_ENTITY.name} (en adelante, «RexiAI»), con NIF ${LEGAL_ENTITY.nif}, domicilio en ${LEGAL_ENTITY.address} y correo electrónico ${LEGAL_ENTITY.email}.`,
        `Esta información cumple el deber de identificación del artículo 10 de la LSSI-CE.`,
        'No se ha designado Delegado de Protección de Datos (DPD) porque no concurre ninguno de los supuestos del artículo 37 del RGPD.',
      ],
    },
    {
      id: 'datos',
      heading: '2. Qué datos personales tratamos',
      paragraphs: ['Los datos proceden de ti, del formulario de reserva y del uso del sitio:'],
      list: [
        'Datos identificativos y de contacto: nombre y dirección de correo electrónico.',
        'Datos de la reserva: fecha, hora, duración, idioma y enlace de la reunión.',
        'Datos de pago: el pago se realiza en la pasarela de Stripe. No almacenamos ni vemos el número de tarjeta; Stripe nos comunica únicamente el resultado de la operación y el importe.',
        'Datos de la reunión, si consientes la grabación: grabación de audio y vídeo, transcripción automática y resumen generado a partir de ella.',
        'Datos técnicos: dirección IP y registros del servidor generados por el proveedor de alojamiento, necesarios para servir la web y protegerla.',
      ],
    },
    {
      id: 'finalidades',
      heading: '3. Para qué tratamos tus datos y con qué base jurídica',
      table: {
        headers: ['Finalidad', 'Base jurídica'],
        rows: [
          [
            'Gestionar tu reserva, crear el evento en el calendario y enviarte la confirmación',
            'Ejecución de un contrato o medidas precontractuales (art. 6.1.b RGPD)',
          ],
          [
            'Enviarte el enlace de la reunión y el enlace para reagendar',
            'Ejecución de un contrato (art. 6.1.b RGPD)',
          ],
          [
            'Emitir la factura, aplicar el IVA y conservar los registros contables',
            'Obligación legal (art. 6.1.c RGPD)',
          ],
          ['Grabar, transcribir y resumir la sesión', 'Tu consentimiento (art. 6.1.a RGPD)'],
          [
            'Atender solicitudes de derechos, reclamaciones e incidencias',
            'Obligación legal e interés legítimo (art. 6.1.c y 6.1.f RGPD)',
          ],
          [
            'Mantener la seguridad del sitio y prevenir abusos',
            'Interés legítimo (art. 6.1.f RGPD)',
          ],
        ],
      },
    },
    {
      id: 'grabacion',
      heading: '4. Grabación de las sesiones',
      paragraphs: [
        'Las sesiones que se celebran a través de los enlaces de RexiAI se graban en audio y vídeo. El aviso de grabación aparece en el correo de confirmación, antes del enlace de acceso, para que puedas decidir antes de conectarte.',
        'La base jurídica es tu consentimiento (art. 6.1.a RGPD). Prestar el servicio no depende de que consientas la grabación: si no quieres que se grabe, escríbenos antes de la reunión a ' +
          LEGAL_ENTITY.email +
          ' y la sesión se celebrará sin grabación.',
        'Las grabaciones se procesan en equipos propios. La transcripción se genera con un modelo de reconocimiento de voz que se ejecuta en local y el resumen con un modelo de lenguaje que también se ejecuta en local: el contenido de la sesión no se envía a servicios de inteligencia artificial de terceros.',
        'Puedes retirar el consentimiento en cualquier momento, sin que ello afecte a la licitud del tratamiento realizado antes de retirarlo.',
      ],
    },
    {
      id: 'destinatarios',
      heading: '5. Con quién compartimos tus datos',
      paragraphs: [
        'No vendemos datos personales ni los cedemos con fines publicitarios. Para prestar el servicio usamos los siguientes proveedores, que actúan como encargados del tratamiento por cuenta de RexiAI:',
      ],
      table: {
        headers: ['Proveedor', 'Para qué'],
        rows: [
          [
            'Stripe Payments Europe, Ltd. (Irlanda)',
            'Procesamiento del pago, facturación y cálculo de IVA',
          ],
          ['Resend, Inc. (EE. UU.)', 'Envío de los correos de confirmación y avisos'],
          [
            'Microsoft Corporation (EE. UU.)',
            'Creación del evento en el calendario y envío de la invitación',
          ],
          ['Vercel Inc. (EE. UU.)', 'Alojamiento del sitio web y de las funciones del servidor'],
          ['8x8, Inc. / Jitsi (EE. UU.)', 'Sala de videollamada'],
          [
            'GitHub, Inc. (EE. UU.)',
            'Almacenamiento interno de los resúmenes de sesión, con acceso restringido a RexiAI',
          ],
        ],
      },
    },
    {
      id: 'transferencias',
      heading: '6. Transferencias internacionales',
      paragraphs: [
        'Algunos de los proveedores anteriores están establecidos en Estados Unidos. Cuando el proveedor está certificado, la transferencia se ampara en la decisión de adecuación de la Comisión Europea para el Marco de Privacidad de Datos UE-EE. UU. (Decisión de Ejecución (UE) 2023/1795). En el resto de casos se aplican Cláusulas Contractuales Tipo aprobadas por la Comisión Europea (art. 46.2.c RGPD) junto con las medidas complementarias necesarias.',
        `Puedes solicitar más información sobre estas garantías escribiendo a ${LEGAL_ENTITY.email}.`,
      ],
    },
    {
      id: 'conservacion',
      heading: '7. Cuánto tiempo conservamos los datos',
      list: [
        'Datos de reserva y de contacto: durante la relación y hasta un año después de la última interacción.',
        'Facturas y registros contables: seis años (art. 30 del Código de Comercio).',
        'Grabaciones, transcripciones y resúmenes: seis meses desde la sesión.',
        'Registros técnicos del alojamiento: el tiempo mínimo necesario para la seguridad, según la retención del proveedor.',
        'Cuando termina el plazo, los datos se eliminan o se bloquean y quedan a disposición únicamente de las autoridades competentes.',
      ],
    },
    {
      id: 'derechos',
      heading: '8. Tus derechos',
      paragraphs: ['Puedes ejercer los siguientes derechos:'],
      list: [
        'Acceso: saber qué datos tratamos sobre ti.',
        'Rectificación: corregir datos inexactos o incompletos.',
        'Supresión: pedir que eliminemos tus datos cuando ya no sean necesarios.',
        'Limitación: pedir que suspendamos el tratamiento en los supuestos legales.',
        'Portabilidad: recibir tus datos en un formato estructurado y de uso común.',
        'Oposición: oponerte al tratamiento basado en interés legítimo.',
        'Retirada del consentimiento: dejar sin efecto el consentimiento para la grabación.',
      ],
    },
    {
      id: 'ejercicio',
      heading: '9. Cómo ejercerlos y cómo reclamar',
      paragraphs: [
        `Para ejercerlos, escribe a ${LEGAL_ENTITY.email} indicando el derecho que ejerces. Si existe duda razonable sobre tu identidad, podemos pedirte un documento que la acredite. Responderemos en el plazo máximo de un mes (art. 12.3 RGPD), prorrogable dos meses más cuando la solicitud sea compleja.`,
        'Si consideras que no hemos atendido correctamente tu solicitud, puedes reclamar ante la Agencia Española de Protección de Datos (AEPD), C/ Jorge Juan 6, 28001 Madrid, www.aepd.es, o ante la autoridad de control de tu país de residencia (art. 77 RGPD).',
        'Ninguna decisión sobre ti se basa únicamente en un tratamiento automatizado que produzca efectos jurídicos o te afecte significativamente (art. 22 RGPD). El resumen automático de una sesión es una nota interna y no produce ese tipo de efectos.',
      ],
    },
    {
      id: 'cookies',
      heading: '10. Cookies y almacenamiento local',
      paragraphs: [
        'Este sitio no utiliza cookies propias ni de terceros, ni herramientas de analítica o de publicidad.',
        'Guardamos una única entrada en el almacenamiento local del navegador, rexi-locale, para recordar el idioma que eliges. Es un almacenamiento técnico necesario para prestarte el servicio que solicitas, por lo que está exento del consentimiento del art. 22.2 de la LSSI-CE. Puedes borrarla desde la configuración de tu navegador.',
        'Cuando te redirigimos a la pasarela de pago de Stripe o entras en la sala de Jitsi, esos servicios pueden usar sus propias cookies; se rigen por sus propias políticas.',
      ],
    },
    {
      id: 'seguridad',
      heading: '11. Seguridad',
      paragraphs: [
        'Todas las comunicaciones viajan cifradas mediante HTTPS/TLS. El acceso a los sistemas y a los resúmenes está restringido al responsable, y las credenciales de los proveedores se guardan como variables de entorno, nunca en el código.',
        'Si se produce una brecha de seguridad con riesgo para tus derechos, la notificaremos a la AEPD en el plazo de 72 horas y, cuando proceda, también a ti (arts. 33 y 34 RGPD).',
      ],
    },
    {
      id: 'menores',
      heading: '12. Menores de edad',
      paragraphs: [
        'El servicio se dirige a mayores de 18 años. No tratamos conscientemente datos de menores. Si detectamos que hemos recibido datos de un menor sin autorización de su tutor, los eliminaremos.',
      ],
    },
    {
      id: 'cambios',
      heading: '13. Cambios en esta política',
      paragraphs: [
        'Podemos actualizar esta política para adaptarla a cambios normativos o del servicio. La versión vigente es siempre la publicada en esta página, con la fecha de actualización indicada al principio.',
      ],
    },
  ],
  backHome: 'Volver al inicio',
}

const en: PrivacyDoc = {
  title: 'Privacy Policy',
  updated: `Last updated: ${PRIVACY_UPDATED.en}`,
  intro: [
    'This Privacy Policy explains what personal data RexiAI processes, why, who it is shared with, and how you can exercise your rights. It applies to the website www.rexi-ai.com, the booking system and the sessions held through it.',
    'Processing is governed by Regulation (EU) 2016/679 (GDPR), Spanish Organic Law 3/2018 (LOPDGDD) and, as regards information-society services, Spanish Law 34/2002 (LSSI-CE).',
  ],
  sections: [
    {
      id: 'responsable',
      heading: '1. Data controller',
      paragraphs: [
        `Owner and controller: ${LEGAL_ENTITY.name} ("RexiAI"), tax ID ${LEGAL_ENTITY.nif}, registered address ${LEGAL_ENTITY.address}, email ${LEGAL_ENTITY.email}.`,
        'This information fulfils the identification duty in article 10 of the LSSI-CE.',
        'No Data Protection Officer has been appointed because none of the cases in article 37 GDPR applies.',
      ],
    },
    {
      id: 'datos',
      heading: '2. What personal data we process',
      paragraphs: ['The data comes from you, from the booking form and from your use of the site:'],
      list: [
        'Identification and contact data: name and email address.',
        'Booking data: date, time, duration, language and the meeting link.',
        'Payment data: payment is handled by the Stripe gateway. We never store or see your card number; Stripe only tells us the result of the transaction and the amount.',
        'Meeting data, if you consent to recording: audio and video recording, an automatic transcript and a summary generated from it.',
        'Technical data: IP address and server logs produced by the hosting provider, needed to serve and protect the site.',
      ],
    },
    {
      id: 'finalidades',
      heading: '3. Why we process your data and on what legal basis',
      table: {
        headers: ['Purpose', 'Legal basis'],
        rows: [
          [
            'Managing your booking, creating the calendar event and sending your confirmation',
            'Performance of a contract or pre-contractual steps (art. 6.1.b GDPR)',
          ],
          [
            'Sending you the meeting link and the reschedule link',
            'Performance of a contract (art. 6.1.b GDPR)',
          ],
          [
            'Issuing the invoice, applying VAT and keeping accounting records',
            'Legal obligation (art. 6.1.c GDPR)',
          ],
          ['Recording, transcribing and summarising the session', 'Your consent (art. 6.1.a GDPR)'],
          [
            'Handling rights requests, complaints and incidents',
            'Legal obligation and legitimate interest (art. 6.1.c and 6.1.f GDPR)',
          ],
          ['Keeping the site secure and preventing abuse', 'Legitimate interest (art. 6.1.f GDPR)'],
        ],
      },
    },
    {
      id: 'grabacion',
      heading: '4. Recording of sessions',
      paragraphs: [
        'Sessions held through RexiAI links are recorded in audio and video. The recording notice appears in the confirmation email, before the join link, so you can decide before connecting.',
        'The legal basis is your consent (art. 6.1.a GDPR). The service does not depend on that consent: if you do not want the session recorded, email us at ' +
          LEGAL_ENTITY.email +
          ' before the meeting and the session will be held without recording.',
        'Recordings are processed on our own equipment. The transcript is produced by a speech-recognition model running locally and the summary by a language model that also runs locally: session content is not sent to third-party artificial-intelligence services.',
        'You may withdraw consent at any time, without affecting the lawfulness of the processing carried out before you withdrew it.',
      ],
    },
    {
      id: 'destinatarios',
      heading: '5. Who we share your data with',
      paragraphs: [
        'We do not sell personal data or share it for advertising. To provide the service we use the following providers, acting as processors on behalf of RexiAI:',
      ],
      table: {
        headers: ['Provider', 'Purpose'],
        rows: [
          [
            'Stripe Payments Europe, Ltd. (Ireland)',
            'Payment processing, invoicing and VAT calculation',
          ],
          ['Resend, Inc. (USA)', 'Sending confirmation and notification emails'],
          ['Microsoft Corporation (USA)', 'Creating the calendar event and sending the invitation'],
          ['Vercel Inc. (USA)', 'Hosting the website and the server functions'],
          ['8x8, Inc. / Jitsi (USA)', 'Video-call room'],
          [
            'GitHub, Inc. (USA)',
            'Internal storage of session summaries, access restricted to RexiAI',
          ],
        ],
      },
    },
    {
      id: 'transferencias',
      heading: '6. International transfers',
      paragraphs: [
        'Some of the providers above are established in the United States. Where the provider is certified, the transfer relies on the European Commission adequacy decision for the EU-US Data Privacy Framework (Implementing Decision (EU) 2023/1795). In all other cases the Standard Contractual Clauses approved by the European Commission apply (art. 46.2.c GDPR), together with the necessary supplementary measures.',
        `You can request more information about these safeguards by writing to ${LEGAL_ENTITY.email}.`,
      ],
    },
    {
      id: 'conservacion',
      heading: '7. How long we keep data',
      list: [
        'Booking and contact data: for the duration of the relationship and up to one year after the last interaction.',
        'Invoices and accounting records: six years (art. 30 of the Spanish Commercial Code).',
        'Recordings, transcripts and summaries: six months from the session.',
        'Technical hosting logs: the minimum needed for security, according to the provider retention period.',
        'Once the period ends, data is deleted or blocked and kept only at the disposal of the competent authorities.',
      ],
    },
    {
      id: 'derechos',
      heading: '8. Your rights',
      paragraphs: ['You may exercise the following rights:'],
      list: [
        'Access: to know what data we process about you.',
        'Rectification: to correct inaccurate or incomplete data.',
        'Erasure: to have your data deleted when it is no longer necessary.',
        'Restriction: to have processing suspended in the cases provided by law.',
        'Portability: to receive your data in a structured, commonly used format.',
        'Objection: to object to processing based on legitimate interest.',
        'Withdrawal of consent: to revoke your consent to recording.',
      ],
    },
    {
      id: 'ejercicio',
      heading: '9. How to exercise them and how to complain',
      paragraphs: [
        `To exercise them, write to ${LEGAL_ENTITY.email} stating which right you are exercising. If there is reasonable doubt about your identity we may ask for a document proving it. We reply within one month (art. 12.3 GDPR), extendable by two further months where the request is complex.`,
        'If you believe your request has not been handled correctly, you may complain to the Spanish Data Protection Agency (AEPD), C/ Jorge Juan 6, 28001 Madrid, www.aepd.es, or to the supervisory authority of your country of residence (art. 77 GDPR).',
        'No decision about you is based solely on automated processing that produces legal effects or significantly affects you (art. 22 GDPR). The automatic summary of a session is an internal note and produces no such effects.',
      ],
    },
    {
      id: 'cookies',
      heading: '10. Cookies and local storage',
      paragraphs: [
        'This site uses no first-party or third-party cookies, and no analytics or advertising tools.',
        'We store a single entry in the browser local storage, rexi-locale, to remember the language you choose. It is technical storage necessary to provide the service you request, so it is exempt from consent under art. 22.2 LSSI-CE. You can delete it from your browser settings.',
        'When we redirect you to the Stripe payment gateway or you enter a Jitsi room, those services may use their own cookies, governed by their own policies.',
      ],
    },
    {
      id: 'seguridad',
      heading: '11. Security',
      paragraphs: [
        'All traffic is encrypted with HTTPS/TLS. Access to systems and to summaries is restricted to the controller, and provider credentials are held as environment variables, never in the code.',
        'If a security breach puts your rights at risk, we will notify the AEPD within 72 hours and, where required, notify you too (arts. 33 and 34 GDPR).',
      ],
    },
    {
      id: 'menores',
      heading: '12. Minors',
      paragraphs: [
        'The service is aimed at people over 18. We do not knowingly process minors’ data. If we learn that we have received a minor’s data without their guardian’s authorisation, we will delete it.',
      ],
    },
    {
      id: 'cambios',
      heading: '13. Changes to this policy',
      paragraphs: [
        'We may update this policy to reflect legal or service changes. The version in force is always the one published on this page, with the update date shown at the top.',
      ],
    },
  ],
  backHome: 'Back to home',
}

export const privacy: Record<Locale, PrivacyDoc> = { es, en }
