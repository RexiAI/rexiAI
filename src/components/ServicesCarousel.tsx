import { useCallback, useEffect, useRef, useState } from 'react'

import { useI18n } from '../i18n/I18nContext'

import './ServicesCarousel.css'

const GAP_PX = 16

function perViewFor(width: number): number {
  if (width >= 1024) return 3
  if (width >= 768) return 2
  return 1
}

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

// Chromium cancels a programmatic smooth scrollTo inside a mandatory
// scroll-snap container (snap re-assertion wins, scrollLeft never moves).
// Suspending snap for the duration of the animated scroll is the workaround;
// 'scrollend' fires when the animation settles, timeout covers old engines.
function releaseSnapLater(track: HTMLElement) {
  const done = () => {
    track.classList.remove('services-carousel__track--no-snap')
    track.removeEventListener('scrollend', done)
  }
  track.addEventListener('scrollend', done)
  window.setTimeout(done, 800)
}

function Chevron({ left }: { left: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M7.5 4.5 13 10l-5.5 5.5"
        transform={left ? 'rotate(180 10 10)' : undefined}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ServicesCarousel() {
  const { dict } = useI18n()
  const trackRef = useRef<HTMLDivElement>(null)
  const items = dict.services.items
  const [perView, setPerView] = useState(() =>
    typeof window === 'undefined' ? 1 : perViewFor(window.innerWidth)
  )
  const [position, setPosition] = useState(0)

  const positions = items.length - perView + 1
  const active = Math.min(position, positions - 1)

  useEffect(() => {
    const onResize = () => setPerView(perViewFor(window.innerWidth))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const stepWidth = useCallback(() => {
    const first = trackRef.current?.firstElementChild as HTMLElement | null
    return first ? first.offsetWidth + GAP_PX : 0
  }, [])

  const goTo = useCallback(
    (pos: number) => {
      const track = trackRef.current
      const step = stepWidth()
      if (!track || step <= 0) return
      const clamped = Math.max(0, Math.min(pos, positions - 1))
      const smooth = scrollBehavior() === 'smooth'
      if (smooth) track.classList.add('services-carousel__track--no-snap')
      track.scrollTo({ left: clamped * step, behavior: smooth ? 'smooth' : 'auto' })
      if (smooth) releaseSnapLater(track)
    },
    [positions, stepWidth]
  )

  const handleScroll = useCallback(() => {
    const track = trackRef.current
    const step = stepWidth()
    if (!track || step <= 0) return
    setPosition(Math.round(track.scrollLeft / step))
  }, [stepWidth])

  return (
    <section id="services" className="services">
      <div className="services-header">
        <h2 className="section-title">{dict.services.title}</h2>
        <div className="services-carousel__controls">
          <button
            type="button"
            className="services-carousel__arrow"
            onClick={() => goTo(active - 1)}
            disabled={active === 0}
            aria-label={dict.services.carouselPrev}
          >
            <Chevron left />
          </button>
          <button
            type="button"
            className="services-carousel__arrow"
            onClick={() => goTo(active + 1)}
            disabled={active >= positions - 1}
            aria-label={dict.services.carouselNext}
          >
            <Chevron left={false} />
          </button>
        </div>
      </div>

      <div
        className="services-carousel__track"
        ref={trackRef}
        onScroll={handleScroll}
        role="group"
        aria-roledescription={dict.services.carouselRole}
        aria-label={dict.services.title}
      >
        {items.map((s) => (
          <article key={s.id} className="service-card">
            <div className="service-card__media">
              <img src={`/services/${s.id}.svg`} alt="" className="service-card__image" />
            </div>
            <div className="service-card__body">
              <h3 className="service-card__title">{s.title}</h3>
              <p className="service-card__desc">{s.description}</p>
              <p className="service-card__meta">{s.meta}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="services-carousel__dots">
        {Array.from({ length: positions }, (_, i) => (
          <button
            key={i}
            type="button"
            className={`services-carousel__dot${i === active ? ' services-carousel__dot--active' : ''}`}
            onClick={() => goTo(i)}
            aria-label={`${dict.services.carouselPosition} ${i + 1}`}
            aria-current={i === active}
          />
        ))}
      </div>
    </section>
  )
}
