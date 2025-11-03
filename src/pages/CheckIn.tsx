import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Navigation } from '@/components/Navigation'
import { QrCode, UserPlus, AlertCircle } from 'lucide-react'
import { usePageTitle } from '@/hooks/usePageTitle'
import type { Class, ClassSession } from '@/types'

export function CheckIn() {
  const { t } = useTranslation()
  usePageTitle('pages.checkIn')
  const { classId } = useParams<{ classId: string }>()
  const [classInfo, setClassInfo] = useState<Class | null>(null)
  const [currentSession, setCurrentSession] = useState<ClassSession | null>(null)
  const [scanning, setScanning] = useState(false)
  const [showTempUserForm, setShowTempUserForm] = useState(false)
  const [tempUserName, setTempUserName] = useState('')
  const [tempUserPhone, setTempUserPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [codeReader, setCodeReader] = useState<BrowserMultiFormatReader | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(false)

  useEffect(() => {
    let isMounted = true

    if (classId && isMounted) {
      fetchClassInfo()
    }

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchClassInfo is stable
  }, [classId])

  useEffect(() => {
    return () => {
      if (codeReader) {
        const videoElement = document.getElementById('video') as HTMLVideoElement
        if (videoElement && videoElement.srcObject) {
          const stream = videoElement.srcObject as MediaStream
          stream.getTracks().forEach((track) => track.stop())
        }
      }
    }
  }, [codeReader])

  const fetchClassInfo = async () => {
    if (!classId) return

    setIsLoadingSession(true)
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single()

      if (error) throw error
      setClassInfo(data)

      await getOrCreateTodaySession(data)
    } catch (err) {
      console.error('Error fetching class:', err)
      setError(t('errors.classNotFound'))
    } finally {
      setIsLoadingSession(false)
    }
  }

  const getOrCreateTodaySession = async (classData: Class) => {
    try {
      const today = new Date()
      const sessionDate = today.toISOString().split('T')[0]
      let sessionTime = classData.schedule_time || '18:00'

      if (sessionTime.split(':').length === 2) {
        sessionTime = sessionTime + ':00'
      }

      console.debug('Fetching session for:', { classId: classData.id, sessionDate, sessionTime })

      let { data: existingSessions, error: fetchError } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('class_id', classData.id)
        .eq('session_date', sessionDate)
        .eq('session_time', sessionTime)
        .limit(1)
        .returns<ClassSession[]>()

      if (fetchError) {
        console.error('Error fetching session:', fetchError)
        throw fetchError
      }

      if (existingSessions && existingSessions.length > 0) {
        console.debug('Found existing session:', existingSessions[0])
        setCurrentSession(existingSessions[0])
      } else {
        console.debug('Creating new session...')
        const { data: newSession, error: insertError } = await supabase
          .from('class_sessions')
          .insert({
            class_id: classData.id,
            session_date: sessionDate,
            session_time: sessionTime,
            created_from: 'manual' as 'enrollment' | 'dropin' | 'manual',
          })
          .select()
          .single()
          .returns<ClassSession>()

        if (insertError) {
          if (insertError.code === '23505') {
            console.debug('Session already exists (race condition), fetching it...')
            const { data: retrySession } = await supabase
              .from('class_sessions')
              .select('*')
              .eq('class_id', classData.id)
              .eq('session_date', sessionDate)
              .eq('session_time', sessionTime)
              .limit(1)
              .single()
              .returns<ClassSession>()

            if (retrySession) {
              setCurrentSession(retrySession)
              return
            }
          }

          console.error('Error inserting session:', insertError)
          console.error('Attempted to insert:', {
            class_id: classData.id,
            session_date: sessionDate,
            session_time: sessionTime,
            created_from: 'manual',
          })
          throw insertError
        }

        console.debug('Created new session:', newSession)
        setCurrentSession(newSession)
      }
    } catch (err) {
      console.error('Error getting/creating session:', err)
      if (err && typeof err === 'object' && 'message' in err) {
        toast.error(`Session error: ${(err as { message: string }).message}`)
      } else {
        toast.error(t('errors.sessionCreationFailed'))
      }
    }
  }

  const startScanning = async () => {
    setScanning(true)
    setError(null)

    const reader = new BrowserMultiFormatReader()
    setCodeReader(reader)

    try {
      console.debug('Requesting camera access...')

      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')

      console.debug('Available video devices:', videoDevices.length)

      if (videoDevices.length === 0) {
        throw new Error('No camera found')
      }

      let selectedDevice = videoDevices[0]

      const backCamera = videoDevices.find(device =>
        device.label.toLowerCase().includes('back') ||
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      )

      if (backCamera) {
        selectedDevice = backCamera
        console.debug('Using back camera:', backCamera.label)
      } else {
        console.debug('Using default camera:', selectedDevice.label || 'Default camera')
      }

      const videoElement = document.getElementById('video') as HTMLVideoElement
      if (!videoElement) {
        throw new Error('Video element not found')
      }

      console.debug('Starting scan...')
      const result = await reader.decodeOnceFromVideoDevice(selectedDevice.deviceId, videoElement)

      console.debug('QR code detected:', result.getText())
      const qrData = result.getText()

      stopScanning()
      await handleQRCode(qrData)

      console.debug('Scan completed successfully')
    } catch (err) {
      console.error('Error starting scanner:', err)

      let errorMessage = t('errors.cameraPermission')

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.message.includes('Permission denied')) {
          errorMessage = 'Camera permission denied. Please allow camera access and try again.'
        } else if (err.name === 'NotFoundError' || err.message === 'No camera found') {
          errorMessage = 'No camera found. Please connect a camera and try again.'
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Camera is already in use by another application.'
        } else if (err.name === 'SecurityError') {
          errorMessage = 'Camera access requires HTTPS. Please use HTTPS or localhost.'
        }
      }

      setError(errorMessage)
      setScanning(false)
    }
  }

  const stopScanning = () => {
    setScanning(false)

    const videoElement = document.getElementById('video') as HTMLVideoElement
    if (videoElement && videoElement.srcObject) {
      const stream = videoElement.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoElement.srcObject = null
    }

    if (codeReader) {
      setCodeReader(null)
    }
  }

  const handleQRCode = async (qrData: string) => {
    if (!classId || !currentSession || !classInfo) return

    try {
      const data = JSON.parse(qrData)
      const { userId, name } = data

      const { data: existingCheckIn } = await supabase
        .from('check_ins')
        .select('*')
        .eq('class_session_id', currentSession.id)
        .eq('user_id', userId)
        .single()

      if (existingCheckIn) {
        setError(`${name} ${t('checkIn.alreadyCheckedIn')}`)
        toast.error(`${name} ${t('checkIn.alreadyCheckedIn')}`)
        return
      }

      const { data: enrollment } = await supabase
        .from('class_enrollments')
        .select('*')
        .eq('class_session_id', currentSession.id)
        .eq('user_id', userId)
        .single()

      let paymentMethod: 'package' | 'credit' | null = null
      let enrollmentId: string | null = null
      let creditPurchaseId: string | null = null
      let amountPaid = 0
      let numClasses = 1

      if (enrollment) {
        paymentMethod = 'package'
        enrollmentId = enrollment.id

        const { data: packagePurchase } = await supabase
          .from('class_package_purchases')
          .select('amount_paid, num_classes')
          .eq('id', enrollment.package_purchase_id!)
          .single()

        if (packagePurchase) {
          amountPaid = packagePurchase.amount_paid
          numClasses = packagePurchase.num_classes
        }
      } else {
        const { data: creditPurchase } = await supabase
          .from('drop_in_credit_purchases')
          .select('*')
          .eq('user_id', userId)
          .gt('credits_remaining', 0)
          .order('purchase_date', { ascending: true })
          .limit(1)
          .single()

        if (!creditPurchase) {
          setError(`${name} ${t('checkIn.notEnrolledNoCredits')}`)
          console.debug(`User ${userId} not enrolled and has no credits`)
          return
        }

        const { error: creditError } = await supabase.rpc('use_drop_in_credit', {
          p_user_id: userId,
        })

        if (creditError) {
          console.error('Error using credit:', creditError)
          setError(t('errors.creditDeductionFailed'))
          return
        }

        paymentMethod = 'credit'
        creditPurchaseId = creditPurchase.id
        amountPaid = creditPurchase.amount_paid
        numClasses = creditPurchase.credits_total
      }

      const instructorPayment = await calculateInstructorPayment(
        classInfo,
        amountPaid,
        numClasses
      )

      const { error: checkInError } = await supabase.from('check_ins').insert({
        class_id: classId!,
        class_session_id: currentSession!.id,
        user_id: userId,
        enrollment_id: enrollmentId,
        credit_purchase_id: creditPurchaseId,
        payment_method: paymentMethod,
        payment_status: 'pending',
        instructor_payment_amount: instructorPayment,
        is_temporary_user: false,
      })

      if (checkInError) throw checkInError

      if (enrollment) {
        await supabase
          .from('class_enrollments')
          .update({ checked_in: true })
          .eq('id', enrollment.id)
      }

      const paymentBadge = paymentMethod === 'package'
        ? t('checkIn.usingPackage')
        : t('checkIn.usingCredit')

      toast.success(`✓ ${name} ${t('checkIn.checkedInSuccess')}`, {
        duration: 3000,
        description: `${t('checkIn.attendanceRecorded')} • ${paymentBadge}`,
      })
      setError(null)
    } catch (err) {
      console.error('Error processing QR code:', err)
      setError(t('errors.invalidQrCode'))
    }
  }

  const calculateInstructorPayment = async (
    classData: Class,
    amountPaid: number,
    numClasses: number
  ): Promise<number> => {
    const classValue = amountPaid / Math.max(numClasses, 1)

    if (classData.instructor_payment_type === 'flat') {
      return classData.instructor_payment_value || 0
    } else {
      const percentage = classData.instructor_payment_value || 70
      return Math.round((classValue * (percentage / 100)) * 100) / 100
    }
  }

  const handleTempUserCheckIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classId || !currentSession || !classInfo) return

    try {
      const { error: tempUserError } = await supabase
        .from('temporary_users')
        .insert({
          name: tempUserName,
          phone: tempUserPhone || null,
          class_id: classId,
        })

      if (tempUserError) throw tempUserError

      const instructorPayment = await calculateInstructorPayment(classInfo, 0, 1)

      const { error: checkInError } = await supabase.from('check_ins').insert({
        class_id: classId!,
        class_session_id: currentSession!.id,
        user_id: null,
        payment_method: null,
        payment_status: 'pending',
        instructor_payment_amount: instructorPayment,
        is_temporary_user: true,
      })

      if (checkInError) throw checkInError

      toast.success(`✓ ${tempUserName} ${t('checkIn.checkedInSuccess')}`, {
        duration: 3000,
        description: t('checkIn.attendanceRecorded'),
      })
      setTempUserName('')
      setTempUserPhone('')
      setShowTempUserForm(false)
      setError(null)
    } catch (err) {
      console.error('Error creating temporary user:', err)
      setError(t('errors.invalidQrCode'))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            {t('checkIn.checkIn')}
          </h1>
          {classInfo && (
            <div className="text-center mb-4">
              <h2 className="text-2xl font-semibold">{classInfo.name}</h2>
              {classInfo.instructor && (
                <p className="text-muted-foreground">{t('admin.instructor')}: {classInfo.instructor}</p>
              )}
            </div>
          )}

          {currentSession && (
            <Card className="mb-6 bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium">
                    {t('checkIn.sessionInfo')}: {new Date(currentSession.session_date).toLocaleDateString()} {t('checkIn.at')} {currentSession.session_time}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoadingSession && (
            <Card className="mb-6">
              <CardContent className="pt-6 text-center text-muted-foreground">
                {t('checkIn.loadingSession')}...
              </CardContent>
            </Card>
          )}

          {error && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center">
                  <QrCode className="w-8 h-8 text-pink-600" />
                </div>
                <CardTitle>{t('checkIn.scanQrCode')}</CardTitle>
                <CardDescription>{t('checkIn.scanDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative aspect-square max-w-md mx-auto bg-black rounded-lg overflow-hidden">
                  <video
                    id="video"
                    className="w-full h-full object-cover"
                    style={{ display: scanning ? 'block' : 'none' }}
                  />
                  {!scanning && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-white text-center">
                        <QrCode className="w-16 h-16 mx-auto mb-2 opacity-50" />
                        <p>{t('checkIn.clickStart')}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {!scanning ? (
                    <Button onClick={startScanning} className="flex-1">
                      {t('checkIn.startScanning')}
                    </Button>
                  ) : (
                    <Button onClick={stopScanning} variant="destructive" className="flex-1">
                      {t('checkIn.stopScanning')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                  <UserPlus className="w-8 h-8 text-purple-600" />
                </div>
                <CardTitle>{t('checkIn.guestCheckIn')}</CardTitle>
                <CardDescription>{t('checkIn.guestDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {!showTempUserForm ? (
                  <Button
                    onClick={() => setShowTempUserForm(true)}
                    variant="outline"
                    className="w-full"
                  >
                    {t('checkIn.addGuest')}
                  </Button>
                ) : (
                  <form onSubmit={handleTempUserCheckIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="guestName">{t('auth.name')} *</Label>
                      <Input
                        id="guestName"
                        value={tempUserName}
                        onChange={(e) => setTempUserName(e.target.value)}
                        placeholder={t('checkIn.guestName')}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guestPhone">{t('auth.phone')} ({t('auth.optional')})</Label>
                      <Input
                        id="guestPhone"
                        type="tel"
                        value={tempUserPhone}
                        onChange={(e) => setTempUserPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        {t('checkIn.checkInGuest')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowTempUserForm(false)}
                      >
                        {t('admin.cancel')}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
