import { Toaster } from 'sonner'
import { PreferencesForm } from '../components/PreferencesForm'

export default function SettingsPage() {
  return (
    <>
      <PreferencesForm />
      <Toaster />
    </>
  )
}
