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
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { QrCode, UserPlus } from 'lucide-react'
import type { Class } from '@/types'

export function CheckIn() {
  const { t } = useTranslation()
  const { classId } = useParams<{ classId: string }>()
  const [classInfo, setClassInfo] = useState<Class | null>(null)
  const [scanning, setScanning] = useState(false)
  const [showTempUserForm, setShowTempUserForm] = useState(false)
  const [tempUserName, setTempUserName] = useState('')
  const [tempUserPhone, setTempUserPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [codeReader, setCodeReader] = useState<BrowserMultiFormatReader | null>(null)

  useEffect(() => {
    if (classId) {
      fetchClassInfo()
    }
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

    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single()

      if (error) throw error
      setClassInfo(data)
    } catch (err) {
      console.error('Error fetching class:', err)
      setError(t('errors.classNotFound'))
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

      await reader.decodeFromVideoDevice(
        selectedDevice.deviceId,
        videoElement,
        async (result, error) => {
          if (result) {
            console.debug('QR code detected:', result.getText())
            const qrData = result.getText()
            await handleQRCode(qrData)
            stopScanning()
          }
          if (error && !(error.name === 'NotFoundException')) {
            console.debug('Scanner error:', error.name, error.message)
          }
        }
      )

      console.debug('Camera started successfully')
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
    if (!classId) return

    try {
      const data = JSON.parse(qrData)
      const { userId, name } = data

      const { data: membership } = await supabase
        .from('class_memberships')
        .select('*')
        .eq('class_id', classId)
        .eq('user_id', userId)
        .single()

      if (!membership) {
        setError(t('errors.notEnrolled'))
        return
      }

      const { error: checkInError } = await supabase.from('check_ins').insert({
        class_id: classId,
        user_id: userId,
        is_temporary_user: false,
      })

      if (checkInError) throw checkInError

      toast.success(`${name} ${t('checkIn.checkedInSuccess')}`, {
        duration: 3000,
      })
      setError(null)
    } catch (err) {
      console.error('Error processing QR code:', err)
      setError(t('errors.invalidQrCode'))
    }
  }

  const handleTempUserCheckIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classId) return

    try {
      const { error: tempUserError } = await supabase
        .from('temporary_users')
        .insert({
          name: tempUserName,
          phone: tempUserPhone || null,
          class_id: classId,
        })

      if (tempUserError) throw tempUserError

      const { error: checkInError } = await supabase.from('check_ins').insert({
        class_id: classId,
        user_id: null,
        is_temporary_user: true,
      })

      if (checkInError) throw checkInError

      toast.success(`${tempUserName} ${t('checkIn.checkedInSuccess')}`, {
        duration: 3000,
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
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white dark:from-gray-900 dark:to-gray-800">
      <LanguageSwitcher />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            {t('checkIn.checkIn')}
          </h1>
          {classInfo && (
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold">{classInfo.name}</h2>
              {classInfo.instructor && (
                <p className="text-muted-foreground">{t('admin.instructor')}: {classInfo.instructor}</p>
              )}
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 bg-pink-100 dark:bg-pink-900 rounded-full flex items-center justify-center">
                  <QrCode className="w-8 h-8 text-pink-600 dark:text-pink-400" />
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
                <div className="mx-auto mb-4 w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                  <UserPlus className="w-8 h-8 text-purple-600 dark:text-purple-400" />
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
