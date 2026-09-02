import { I18nProvider } from './i18n/I18nContext'
import { Landing } from './pages/Landing'
import './App.css'

export { isCancelPath, isSuccessPath } from './pages/routing'

function App() {
  return (
    <I18nProvider>
      <Landing />
    </I18nProvider>
  )
}

export default App
