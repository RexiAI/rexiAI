import type { Dictionary } from '../i18n/dictionary'

// Shown only when charging is disabled (BILLING_ENABLED=false → GET /api/config).
// Pattern: a struck-through original price next to a FREE badge + "limited time"
// urgency, with honest fine print that custom builds are still quoted (the talks
// and analysis are what's free, not development work).
export function FreeModeBanner({ dict }: { dict: Dictionary }) {
  return (
    <div className="free-banner" role="status">
      <span className="free-banner__badge">{dict.freeMode.badge}</span>
      <div className="free-banner__text">
        <p className="free-banner__title">
          <s className="free-banner__was">{dict.freeMode.priceWas}</s>
          <span> {dict.freeMode.bannerTitle}</span>
        </p>
        <p className="free-banner__body">{dict.freeMode.bannerBody}</p>
        <p className="free-banner__fineprint">{dict.freeMode.bannerFineprint}</p>
      </div>
    </div>
  )
}
