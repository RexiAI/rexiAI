import { I18nProvider } from './i18n/I18nContext'
import { Landing } from './pages/Landing'
import { Privacy } from './pages/Privacy'
import { isPrivacyPath } from './pages/routing'
import './App.css'

export { isCancelPath, isPrivacyPath, isSuccessPath } from './pages/routing'

function App() {
  return <I18nProvider>{isPrivacyPath() ? <Privacy /> : <Landing />}</I18nProvider>
}

export default App
