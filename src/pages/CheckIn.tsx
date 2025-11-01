import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QrCode, UserPlus, CheckCircle } from 'lucide-react'
import type { Class, User } from '@/types'

export function CheckIn() {
  const { classId } = useParams<{ classId: string }>()
  const [classInfo, setClassInfo] = useState<Class | null>(null)
  const [scanning, setScanning] = useState(false)
  const [showTempUserForm, setShowTempUserForm] = useState(false)
  const [tempUserName, setTempUserName] = useState('')
  const [tempUserPhone, setTempUserPhone] = useState('')
  const [lastCheckIn, setLastCheckIn] = useState<{ name: string; time: Date } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (classId) {
      fetchClassInfo()
    }
  }, [classId])

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
      setError('Class not found')
    }
  }

  const startScanning = async () => {
    setScanning(true)
    setError(null)

    const codeReader = new BrowserMultiFormatReader()

    try {
      const videoElement = document.getElementById('video') as HTMLVideoElement

      await codeReader.decodeFromVideoDevice(
        undefined,
        videoElement,
        async (result, error) => {
          if (result) {
            const qrData = result.getText()
            await handleQRCode(qrData)
            codeReader.reset()
            setScanning(false)
          }
          if (error && !(error.name === 'NotFoundException')) {
            console.error(error)
          }
        }
      )
    } catch (err) {
      console.error('Error starting scanner:', err)
      setError('Failed to start camera. Please check permissions.')
      setScanning(false)
    }
  }

  const stopScanning = () => {
    setScanning(false)
    const videoElement = document.getElementById('video') as HTMLVideoElement
    if (videoElement && videoElement.srcObject) {
      const stream = videoElement.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
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
        setError('User is not enrolled in this class')
        return
      }

      const { error: checkInError } = await supabase.from('check_ins').insert({
        class_id: classId,
        user_id: userId,
        is_temporary_user: false,
      })

      if (checkInError) throw checkInError

      setLastCheckIn({ name, time: new Date() })
      setError(null)
    } catch (err) {
      console.error('Error processing QR code:', err)
      setError('Invalid QR code or check-in failed')
    }
  }

  const handleTempUserCheckIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classId) return

    try {
      const { data: tempUser, error: tempUserError } = await supabase
        .from('temporary_users')
        .insert({
          name: tempUserName,
          phone: tempUserPhone || null,
          class_id: classId,
        })
        .select()
        .single()

      if (tempUserError) throw tempUserError

      const { error: checkInError } = await supabase.from('check_ins').insert({
        class_id: classId,
        user_id: null,
        is_temporary_user: true,
      })

      if (checkInError) throw checkInError

      setLastCheckIn({ name: tempUserName, time: new Date() })
      setTempUserName('')
      setTempUserPhone('')
      setShowTempUserForm(false)
      setError(null)
    } catch (err) {
      console.error('Error creating temporary user:', err)
      setError('Failed to check in guest user')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Check-In
          </h1>
          {classInfo && (
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold">{classInfo.name}</h2>
              {classInfo.instructor && (
                <p className="text-muted-foreground">Instructor: {classInfo.instructor}</p>
              )}
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg text-center">
              {error}
            </div>
          )}

          {lastCheckIn && (
            <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-lg flex items-center gap-2 justify-center">
              <CheckCircle className="w-5 h-5" />
              <span>
                <strong>{lastCheckIn.name}</strong> checked in successfully!
              </span>
            </div>
          )}

          <div className="space-y-4">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 bg-pink-100 dark:bg-pink-900 rounded-full flex items-center justify-center">
                  <QrCode className="w-8 h-8 text-pink-600 dark:text-pink-400" />
                </div>
                <CardTitle>Scan QR Code</CardTitle>
                <CardDescription>Position the QR code within the camera frame</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    id="video"
                    className="w-full h-full object-cover"
                    style={{ display: scanning ? 'block' : 'none' }}
                  />
                  {!scanning && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-white text-center">
                        <QrCode className="w-16 h-16 mx-auto mb-2 opacity-50" />
                        <p>Click Start Scanning to begin</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {!scanning ? (
                    <Button onClick={startScanning} className="flex-1">
                      Start Scanning
                    </Button>
                  ) : (
                    <Button onClick={stopScanning} variant="destructive" className="flex-1">
                      Stop Scanning
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
                <CardTitle>Guest Check-In</CardTitle>
                <CardDescription>For walk-in attendees without an account</CardDescription>
              </CardHeader>
              <CardContent>
                {!showTempUserForm ? (
                  <Button
                    onClick={() => setShowTempUserForm(true)}
                    variant="outline"
                    className="w-full"
                  >
                    Add Guest User
                  </Button>
                ) : (
                  <form onSubmit={handleTempUserCheckIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="guestName">Name *</Label>
                      <Input
                        id="guestName"
                        value={tempUserName}
                        onChange={(e) => setTempUserName(e.target.value)}
                        placeholder="Guest name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guestPhone">Phone (optional)</Label>
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
                        Check In Guest
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowTempUserForm(false)}
                      >
                        Cancel
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
