import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export function usePageTitle(titleKey: string, defaultTitle?: string) {
  const { t } = useTranslation()

  useEffect(() => {
    const appName = t('app.title')
    const pageTitle = defaultTitle || t(titleKey)
    document.title = pageTitle ? `${pageTitle} - ${appName}` : appName
  }, [t, titleKey, defaultTitle])
}
