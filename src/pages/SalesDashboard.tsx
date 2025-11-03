import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Navigation } from '@/components/Navigation'
import { usePageTitle } from '@/hooks/usePageTitle'
import { generateSessionsFromSchedule } from '@/lib/classSessionUtils'
import { ShoppingCart, Package, Ticket, Calendar as CalendarIcon, User as UserIcon, DollarSign } from 'lucide-react'
import type { User, ClassPackage, DropInCreditPackage, Class, ClassSession } from '@/types'

type SaleType = 'class_package' | 'drop_in_credits' | null

export function SalesDashboard() {
  const { t } = useTranslation()
  usePageTitle('pages.salesDashboard')

  const [users, setUsers] = useState<User[]>([])
  const [classPackages, setClassPackages] = useState<ClassPackage[]>([])
  const [creditPackages, setCreditPackages] = useState<DropInCreditPackage[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [selectedUserId, setSelectedUserId] = useState('')
  const [saleType, setSaleType] = useState<SaleType>(null)
  const [selectedPackageId, setSelectedPackageId] = useState('')
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [availableSessions, setAvailableSessions] = useState<ClassSession[]>([])
  const [paymentAmount, setPaymentAmount] = useState(0)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [usersResult, classPackagesResult, creditPackagesResult, classesResult] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('*')
            .order('name', { ascending: true }),
          supabase
            .from('class_packages')
            .select('*')
            .eq('active', true)
            .order('name', { ascending: true }),
          supabase
            .from('drop_in_credit_packages')
            .select('*')
            .eq('active', true)
            .order('name', { ascending: true }),
          supabase.from('classes').select('*').order('name', { ascending: true }),
        ])

      setUsers((usersResult.data as User[]) || [])
      setClassPackages(classPackagesResult.data || [])
      setCreditPackages(creditPackagesResult.data || [])
      setClasses(classesResult.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (saleType === 'class_package' && selectedPackageId) {
      loadAvailableSessions()
      const pkg = classPackages.find((p) => p.id === selectedPackageId)
      setPaymentAmount(pkg?.price || 0)
    } else if (saleType === 'drop_in_credits' && selectedPackageId) {
      const pkg = creditPackages.find((p) => p.id === selectedPackageId)
      setPaymentAmount(pkg?.price || 0)
    } else {
      setPaymentAmount(0)
    }
  }, [saleType, selectedPackageId, classPackages, creditPackages])

  const loadAvailableSessions = async () => {
    if (!selectedPackageId) return

    const pkg = classPackages.find((p) => p.id === selectedPackageId)
    if (!pkg) return

    const classData = classes.find((c) => c.id === pkg.class_id)
    if (!classData) return

    try {
      const today = new Date()
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 6)

      const { data: existingSessions } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('class_id', pkg.class_id)
        .gte('session_date', today.toISOString().split('T')[0])
        .lte('session_date', endDate.toISOString().split('T')[0])
        .order('session_date', { ascending: true })

      setAvailableSessions(existingSessions || [])
    } catch (error) {
      console.error('Error loading sessions:', error)
    }
  }

  const handleReset = () => {
    setSelectedUserId('')
    setSaleType(null)
    setSelectedPackageId('')
    setSelectedDates([])
    setPaymentAmount(0)
    setAvailableSessions([])
  }

  const handleSell = async () => {
    if (!selectedUserId || !selectedPackageId) {
      alert(t('sales.missingFields'))
      return
    }

    if (saleType === 'class_package' && selectedDates.length === 0) {
      alert(t('sales.selectDates'))
      return
    }

    const pkg = saleType === 'class_package'
      ? classPackages.find((p) => p.id === selectedPackageId)
      : creditPackages.find((p) => p.id === selectedPackageId)

    if (!pkg) return

    if (saleType === 'class_package') {
      const classPackage = pkg as ClassPackage
      if (selectedDates.length !== classPackage.class_count) {
        alert(t('sales.wrongDateCount', { count: classPackage.class_count }))
        return
      }
    }

    setSubmitting(true)

    try {
      if (saleType === 'class_package') {
        await sellClassPackage(pkg as ClassPackage)
      } else {
        await sellCreditPackage(pkg as DropInCreditPackage)
      }

      alert(t('sales.saleSuccess'))
      handleReset()
      await fetchData()
    } catch (error) {
      console.error('Error processing sale:', error)
      alert(t('sales.saleError'))
    } finally {
      setSubmitting(false)
    }
  }

  const sellClassPackage = async (pkg: ClassPackage) => {
    const validityDate = pkg.validity_days
      ? new Date(Date.now() + pkg.validity_days * 24 * 60 * 60 * 1000).toISOString()
      : null

    const { data: purchase, error: purchaseError } = await supabase
      .from('class_package_purchases')
      .insert({
        user_id: selectedUserId,
        package_id: pkg.id,
        purchase_date: new Date().toISOString(),
        expiration_date: validityDate,
        payment_amount: paymentAmount,
      })
      .select()
      .single()

    if (purchaseError) throw purchaseError

    for (const date of selectedDates) {
      const dateStr = date.toISOString().split('T')[0]

      const classData = classes.find((c) => c.id === pkg.class_id)
      if (!classData) continue

      let sessionTime = classData.schedule_time || '09:00'
      if (sessionTime.split(':').length === 2) {
        sessionTime = sessionTime + ':00'
      }

      let session = availableSessions.find(
        (s) => s.session_date === dateStr && s.session_time === sessionTime
      )

      if (!session) {
        const { data: newSession, error: sessionError } = await supabase
          .from('class_sessions')
          .insert({
            class_id: pkg.class_id,
            session_date: dateStr,
            session_time: sessionTime,
            duration_minutes: classData.duration_minutes || 60,
          })
          .select()
          .single()

        if (sessionError) {
          if (sessionError.code === '23505') {
            const { data: retrySession } = await supabase
              .from('class_sessions')
              .select('*')
              .eq('class_id', pkg.class_id)
              .eq('session_date', dateStr)
              .eq('session_time', sessionTime)
              .single()

            if (retrySession) {
              session = retrySession
            }
          } else {
            throw sessionError
          }
        } else {
          session = newSession
        }
      }

      if (session) {
        const { error: enrollmentError } = await supabase
          .from('class_enrollments')
          .insert({
            user_id: selectedUserId,
            class_session_id: session.id,
            package_purchase_id: purchase.id,
          })

        if (enrollmentError) throw enrollmentError
      }
    }
  }

  const sellCreditPackage = async (pkg: DropInCreditPackage) => {
    const validityDate = pkg.validity_days
      ? new Date(Date.now() + pkg.validity_days * 24 * 60 * 60 * 1000).toISOString()
      : null

    const { error } = await supabase.from('drop_in_credit_purchases').insert({
      user_id: selectedUserId,
      package_id: pkg.id,
      purchase_date: new Date().toISOString(),
      credits_remaining: pkg.credit_count,
      expiration_date: validityDate,
      payment_amount: paymentAmount,
    })

    if (error) throw error
  }

  const getClassName = (classId: string) => {
    return classes.find((c) => c.id === classId)?.name || t('common.unknown')
  }

  const selectedUser = users.find((u) => u.id === selectedUserId)
  const selectedPackage = saleType === 'class_package'
    ? classPackages.find((p) => p.id === selectedPackageId)
    : creditPackages.find((p) => p.id === selectedPackageId)

  const requiredDates = saleType === 'class_package' && selectedPackage
    ? (selectedPackage as ClassPackage).class_count
    : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-pink-50 to-white dark:from-gray-900 dark:to-gray-800">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-linear-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            {t('sales.title')}
          </h1>
          <p className="text-muted-foreground mt-2">{t('sales.description')}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="w-5 h-5" />
                  {t('sales.selectUser')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('sales.chooseUser')} />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('sales.selectProductType')}</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setSaleType('class_package')
                    setSelectedPackageId('')
                    setSelectedDates([])
                  }}
                  className={`p-6 border-2 rounded-lg transition-all ${
                    saleType === 'class_package'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Package className="w-8 h-8 mx-auto mb-2" />
                  <p className="font-semibold">{t('sales.classPackage')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('sales.classPackageDesc')}
                  </p>
                </button>

                <button
                  onClick={() => {
                    setSaleType('drop_in_credits')
                    setSelectedPackageId('')
                    setSelectedDates([])
                  }}
                  className={`p-6 border-2 rounded-lg transition-all ${
                    saleType === 'drop_in_credits'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Ticket className="w-8 h-8 mx-auto mb-2" />
                  <p className="font-semibold">{t('sales.dropInCredits')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('sales.dropInCreditsDesc')}
                  </p>
                </button>
              </CardContent>
            </Card>

            {saleType && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('sales.selectPackage')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={selectedPackageId}
                    onValueChange={setSelectedPackageId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('sales.choosePackage')} />
                    </SelectTrigger>
                    <SelectContent>
                      {saleType === 'class_package'
                        ? classPackages.map((pkg) => (
                            <SelectItem key={pkg.id} value={pkg.id}>
                              {pkg.name} - {getClassName(pkg.class_id)} (
                              {pkg.class_count} {t('packages.classCount')}) - $
                              {pkg.price.toFixed(2)}
                            </SelectItem>
                          ))
                        : creditPackages.map((pkg) => (
                            <SelectItem key={pkg.id} value={pkg.id}>
                              {pkg.name} ({pkg.credit_count}{' '}
                              {t('credits.creditCount')}) - $
                              {pkg.price.toFixed(2)}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}

            {saleType === 'class_package' && selectedPackageId && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5" />
                    {t('sales.selectDates')}
                  </CardTitle>
                  <CardDescription>
                    {t('sales.selectDatesDesc', { count: requiredDates })}
                    <br />
                    {t('sales.selectedCount', { selected: selectedDates.length, total: requiredDates })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="multiple"
                    selected={selectedDates}
                    onSelect={(dates) => {
                      if (dates && dates.length <= requiredDates) {
                        setSelectedDates(dates)
                      }
                    }}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    className="rounded-md border"
                  />
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  {t('sales.orderSummary')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedUser ? (
                  <div className="pb-4 border-b">
                    <p className="text-sm text-muted-foreground mb-1">
                      {t('sales.customer')}
                    </p>
                    <p className="font-semibold">{selectedUser.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('sales.noUserSelected')}
                  </p>
                )}

                {selectedPackage ? (
                  <div className="pb-4 border-b">
                    <p className="text-sm text-muted-foreground mb-1">
                      {t('sales.product')}
                    </p>
                    <p className="font-semibold">{selectedPackage.name}</p>
                    {saleType === 'class_package' && (
                      <p className="text-xs text-muted-foreground">
                        {getClassName((selectedPackage as ClassPackage).class_id)}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('sales.noPackageSelected')}
                  </p>
                )}

                {saleType === 'class_package' && selectedDates.length > 0 && (
                  <div className="pb-4 border-b">
                    <p className="text-sm text-muted-foreground mb-2">
                      {t('sales.selectedDates')}:
                    </p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {selectedDates.map((date, index) => (
                        <p key={index} className="text-xs">
                          {date.toLocaleDateString()}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground">
                      {t('sales.paymentAmount')}:
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) =>
                        setPaymentAmount(parseFloat(e.target.value) || 0)
                      }
                      className="w-32 text-right"
                    />
                  </div>
                  <div className="flex justify-between items-center text-xl font-bold">
                    <span>{t('sales.total')}:</span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-5 h-5" />
                      {paymentAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSell}
                  disabled={
                    submitting ||
                    !selectedUserId ||
                    !selectedPackageId ||
                    (saleType === 'class_package' &&
                      selectedDates.length !== requiredDates)
                  }
                >
                  {submitting ? t('common.loading') : t('sales.completeSale')}
                </Button>

                {selectedUserId && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleReset}
                    disabled={submitting}
                  >
                    {t('sales.reset')}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
