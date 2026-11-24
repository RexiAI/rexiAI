import type { Dictionary } from '../i18n/dictionary'

/**
 * `Who builds it` (spec 020 Task 6): a single readable column —heading, name,
 * role, bio, location, links. No portrait, no photo frame, no empty photo slot.
 *
 * Reads only its `dict` prop so the copy is data, not markup. The bio is still
 * optional by contract: empty or whitespace-only renders nothing at all, never
 * an empty paragraph (the committed copy fills it in both locales).
 */
export function About({ dict }: { dict: Dictionary }) {
  const bio = dict.about.bio.trim()
  return (
    <section id="about" className="about">
      <h2 className="section-title">{dict.about.title}</h2>
      <p className="about__name">{dict.about.name}</p>
      <p className="about__role">{dict.about.role}</p>
      {bio !== '' && <p className="about__bio">{bio}</p>}
      <p className="about__location">{dict.about.location}</p>
      <div className="about__links">
        <a className="about__link" href={`mailto:${dict.about.email}`}>
          {dict.about.email}
        </a>
        <a className="about__link" href={dict.about.githubUrl}>
          {dict.about.githubLabel}
        </a>
      </div>
    </section>
  )
}
