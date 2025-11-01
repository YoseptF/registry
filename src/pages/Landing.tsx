import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { QrCode, Users, Calendar } from 'lucide-react'

export function Landing() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white dark:from-gray-900 dark:to-gray-800">
      <LanguageSwitcher />
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            {t('app.welcome')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            {t('app.subtitle')}
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/login">
              <Button size="lg" variant="default">
                {t('auth.signIn')}
              </Button>
            </Link>
            <Link to="/register">
              <Button size="lg" variant="outline">
                {t('auth.register')}
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4 w-12 h-12 bg-pink-100 dark:bg-pink-900 rounded-full flex items-center justify-center">
                <QrCode className="w-6 h-6 text-pink-600 dark:text-pink-400" />
              </div>
              <CardTitle>{t('landing.qrCheckIn')}</CardTitle>
              <CardDescription>
                {t('landing.qrCheckInDesc')}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4 w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle>{t('landing.userManagement')}</CardTitle>
              <CardDescription>
                {t('landing.userManagementDesc')}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4 w-12 h-12 bg-pink-100 dark:bg-pink-900 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-pink-600 dark:text-pink-400" />
              </div>
              <CardTitle>{t('landing.classScheduling')}</CardTitle>
              <CardDescription>
                {t('landing.classSchedulingDesc')}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  )
}
