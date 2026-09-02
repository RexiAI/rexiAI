import { CancelView } from './CancelView'
import { isCancelPath, isSuccessPath } from './routing'
import { SuccessView } from './SuccessView'

export function ResultViews() {
  if (isSuccessPath()) return <SuccessView />
  if (isCancelPath()) return <CancelView />
  return null
}
