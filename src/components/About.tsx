import type { Dictionary } from '../i18n/dictionary'

/**
 * `Who builds it` (spec 019 Task 6): a left-aligned identity block. Reads only
 * its `dict` prop so a non-empty `about.bio` can be supplied at review time
 * without a CMS or a code change.
 *
 * The bio is optional by contract: empty or whitespace-only renders nothing at
 * all — no empty paragraph standing in for it.
 */
export function About({ dict }: { dict: Dictionary }) {
  const bio = dict.about.bio.trim()
  return (
    <section id="about" className="about">
      <h2 className="section-title">{dict.about.title}</h2>
      <p className="about__name">{dict.about.name}</p>
      <p className="about__role">{dict.about.role}</p>
      <p className="about__location">{dict.about.location}</p>
      <div className="about__links">
        <a className="about__link" href={`mailto:${dict.about.email}`}>
          {dict.about.email}
        </a>
        <a className="about__link" href={dict.about.githubUrl}>
          {dict.about.githubLabel}
        </a>
      </div>
      {bio !== '' && <p className="about__bio">{bio}</p>}
    </section>
  )
}
