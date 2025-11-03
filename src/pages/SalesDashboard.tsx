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
import { ShoppingCart, Package, Ticket, Calendar as CalendarIcon, User as UserIcon, DollarSign } from 'lucide-react'
import type { User, ClassPackage, DropInCreditPackage, Class, ClassSession } from '@/types'

type SaleType = 'class_package' | 'drop_in_credits' | null

interface SessionSelection {
  classId: string
  date: Date | null
}

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
  const [sessionSelections, setSessionSelections] = useState<SessionSelection[]>([])
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
            .order('name', { ascending: true })
            .returns<DropInCreditPackage[]>(),
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
      const pkg = classPackages.find((p) => p.id === selectedPackageId)
      if (pkg) {
        setPaymentAmount(pkg.price)
        setSessionSelections(
          Array(pkg.num_classes)
            .fill(null)
            .map(() => ({ classId: '', date: null }))
        )
      }
    } else if (saleType === 'drop_in_credits' && selectedPackageId) {
      const pkg = creditPackages.find((p) => p.id === selectedPackageId)
      setPaymentAmount(pkg?.price || 0)
      setSessionSelections([])
    } else {
      setPaymentAmount(0)
      setSessionSelections([])
    }
  }, [saleType, selectedPackageId, classPackages, creditPackages])

  const handleReset = () => {
    setSelectedUserId('')
    setSaleType(null)
    setSelectedPackageId('')
    setSessionSelections([])
    setPaymentAmount(0)
  }

  const handleSell = async () => {
    if (!selectedUserId || !selectedPackageId) {
      alert(t('sales.missingFields'))
      return
    }

    if (saleType === 'class_package') {
      for (const selection of sessionSelections) {
        if (!selection.classId || !selection.date) {
          alert(t('sales.completeAllSelections'))
          return
        }
      }
    }

    const pkg = saleType === 'class_package'
      ? classPackages.find((p) => p.id === selectedPackageId)
      : creditPackages.find((p) => p.id === selectedPackageId)

    if (!pkg) return

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
    const currentUser = (await supabase.auth.getUser()).data.user;

    const { data: purchase, error: purchaseError } = await supabase
      .from('class_package_purchases')
      .insert({
        user_id: selectedUserId,
        package_id: pkg.id,
        package_name: pkg.name,
        num_classes: pkg.num_classes,
        purchase_date: new Date().toISOString(),
        amount_paid: paymentAmount,
        assigned_by: currentUser!.id,
      })
      .select()
      .single()

    if (purchaseError) throw purchaseError

    for (const selection of sessionSelections) {
      const dateStr = selection.date!.toISOString().split('T')[0]
      const classData = classes.find((c) => c.id === selection.classId)
      if (!classData) continue

      let sessionTime = classData.schedule_time || '09:00'
      if (sessionTime.split(':').length === 2) {
        sessionTime = sessionTime + ':00'
      }

      let session: ClassSession | null = null
      const { data: existingSession } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('class_id', selection.classId)
        .eq('session_date', dateStr)
        .eq('session_time', sessionTime)
        .maybeSingle()
        .returns<ClassSession>()

      if (existingSession) {
        session = existingSession
      } else {
        const { data: newSession, error: sessionError } = await supabase
          .from('class_sessions')
          .insert({
            class_id: selection.classId,
            session_date: dateStr,
            session_time: sessionTime,
            created_from: 'enrollment' as 'enrollment' | 'dropin' | 'manual',
          })
          .select()
          .single()
          .returns<ClassSession>()

        if (sessionError) {
          if (sessionError.code === '23505') {
            const { data: retrySession } = await supabase
              .from('class_sessions')
              .select('*')
              .eq('class_id', selection.classId)
              .eq('session_date', dateStr)
              .eq('session_time', sessionTime)
              .single()
              .returns<ClassSession>()

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
    const currentUser = (await supabase.auth.getUser()).data.user;

    const { error } = await supabase.from('drop_in_credit_purchases').insert({
      user_id: selectedUserId,
      package_id: pkg.id,
      package_name: pkg.name,
      credits_total: pkg.num_credits,
      credits_remaining: pkg.num_credits,
      purchase_date: new Date().toISOString(),
      amount_paid: paymentAmount,
      assigned_by: currentUser!.id,
      payment_type: (pkg.payment_type || 'percentage') as 'flat' | 'percentage',
      payment_value: pkg.payment_value || 70,
    })

    if (error) throw error
  }

  const updateSessionSelection = (index: number, field: 'classId' | 'date', value: string | Date | null) => {
    const newSelections = [...sessionSelections]
    if (field === 'classId') {
      newSelections[index].classId = value as string
    } else {
      newSelections[index].date = value as Date | null
    }
    setSessionSelections(newSelections)
  }

  const selectedUser = users.find((u) => u.id === selectedUserId)
  const selectedPackage = saleType === 'class_package'
    ? classPackages.find((p) => p.id === selectedPackageId)
    : creditPackages.find((p) => p.id === selectedPackageId)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-pink-50 to-white">
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
                    setSessionSelections([])
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
                    setSessionSelections([])
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
                              {pkg.name} ({pkg.num_classes}{' '}
                              {t('packages.classCount')}) - ${pkg.price.toFixed(2)}
                            </SelectItem>
                          ))
                        : creditPackages.map((pkg) => (
                            <SelectItem key={pkg.id} value={pkg.id}>
                              {pkg.name} ({pkg.num_credits}{' '}
                              {t('credits.creditCount')}) - ${pkg.price.toFixed(2)}
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
                    {t('sales.selectClassesAndDates')}
                  </CardTitle>
                  <CardDescription>
                    {t('sales.selectClassAndDateForEach')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {sessionSelections.map((selection, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold">
                          {t('sales.session')} {index + 1}
                        </h4>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`class-${index}`}>
                          {t('sales.selectClass')}
                        </Label>
                        <Select
                          value={selection.classId}
                          onValueChange={(value) =>
                            updateSessionSelection(index, 'classId', value)
                          }
                        >
                          <SelectTrigger id={`class-${index}`}>
                            <SelectValue placeholder={t('sales.chooseClass')} />
                          </SelectTrigger>
                          <SelectContent>
                            {classes.map((cls) => (
                              <SelectItem key={cls.id} value={cls.id}>
                                {cls.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>{t('sales.selectDate')}</Label>
                        {selection.classId && (() => {
                          const selectedClass = classes.find(c => c.id === selection.classId)
                          const scheduleDays = selectedClass?.schedule_days || []

                          const dayMap: Record<string, number> = {
                            'sunday': 0,
                            'monday': 1,
                            'tuesday': 2,
                            'wednesday': 3,
                            'thursday': 4,
                            'friday': 5,
                            'saturday': 6
                          }

                          const scheduleDayNumbers = scheduleDays.map(day => dayMap[day.toLowerCase()]).filter(n => n !== undefined)

                          const isScheduledDay = (date: Date) => {
                            return scheduleDayNumbers.includes(date.getDay())
                          }

                          return (
                            <>
                              <div className="text-xs text-muted-foreground mb-2">
                                {selectedClass && scheduleDays.length > 0 && (
                                  <span className="inline-flex items-center gap-1">
                                    <span className="inline-block w-3 h-3 rounded-full bg-gradient-to-r from-pink-500 to-purple-500"></span>
                                    Scheduled days: {scheduleDays.join(', ')}
                                  </span>
                                )}
                              </div>
                              <Calendar
                                mode="single"
                                selected={selection.date || undefined}
                                onSelect={(date) =>
                                  updateSessionSelection(index, 'date', date || null)
                                }
                                disabled={(date) =>
                                  date < new Date(new Date().setHours(0, 0, 0, 0))
                                }
                                modifiers={{
                                  scheduled: (date) => scheduleDayNumbers.length > 0 && isScheduledDay(date)
                                }}
                                modifiersClassNames={{
                                  scheduled: "bg-gradient-to-r from-pink-100 to-purple-100 font-semibold"
                                }}
                                className="rounded-md border"
                              />
                            </>
                          )
                        })()}
                        {!selection.classId && (
                          <div className="text-sm text-muted-foreground border rounded-md p-4 text-center">
                            {t('sales.selectClass')} first to see scheduled dates
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
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
                        {(selectedPackage as ClassPackage).num_classes} {t('packages.classCount')}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('sales.noPackageSelected')}
                  </p>
                )}

                {saleType === 'class_package' && sessionSelections.length > 0 && (
                  <div className="pb-4 border-b">
                    <p className="text-sm text-muted-foreground mb-2">
                      {t('sales.selections')}:
                    </p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {sessionSelections.map((sel, index) => {
                        const cls = classes.find((c) => c.id === sel.classId)
                        return (
                          <p key={index} className="text-xs">
                            {index + 1}. {cls?.name || '—'}{' '}
                            {sel.date ? `- ${sel.date.toLocaleDateString()}` : ''}
                          </p>
                        )
                      })}
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
                      sessionSelections.some((s) => !s.classId || !s.date))
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
