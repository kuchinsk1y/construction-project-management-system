import { useTranslation } from 'react-i18next'

export function CheckingScreen() {
  const { t } = useTranslation()

  return (
    <div className="auth-shell">
      <div className="auth-orb auth-orb-a" />
      <div className="auth-orb auth-orb-b" />
      <div className="auth-loader">{t('auth.checkingAuth')}</div>
    </div>
  )
}
