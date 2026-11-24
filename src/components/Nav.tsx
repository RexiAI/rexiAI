import { NavLinks } from './NavLinks'
import { NavMeta } from './NavMeta'

export function Nav() {
  return (
    <nav className="nav">
      <NavLinks />
      <NavMeta />
    </nav>
  )
}
