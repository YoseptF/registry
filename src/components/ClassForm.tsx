import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, X } from 'lucide-react'
import type { Class, User } from '@/types'
import { getErrorMessage } from '@/utils/errorHandling'
import { fetchInstructors as fetchInstructorsUtil } from '@/utils/instructorQueries'
import { ErrorMessage } from '@/components/ErrorMessage'
import { useFileUpload } from '@/hooks/useFileUpload'

interface ClassFormProps {
  initialData?: Class | null
  onSuccess: () => void
  onCancel: () => void
}

const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0')
  return { value: `${hour}:00`, label: `${hour}:00` }
})

export function ClassForm({ initialData, onSuccess, onCancel }: ClassFormProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [instructors, setInstructors] = useState<User[]>([])

  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [instructorId, setInstructorId] = useState(initialData?.instructor_id || '')
  const [instructorPaymentType, setInstructorPaymentType] = useState<'flat' | 'percentage'>(
    initialData?.instructor_payment_type || 'percentage'
  )
  const [instructorPaymentValue, setInstructorPaymentValue] = useState(
    initialData?.instructor_payment_value?.toString() || '70'
  )
  const [selectedDays, setSelectedDays] = useState<string[]>(initialData?.schedule_days || [])
  const [selectedTime, setSelectedTime] = useState(initialData?.schedule_time || '18:00')
  const [duration, setDuration] = useState(initialData?.duration_minutes?.toString() || '60')

  const banner = useFileUpload({
    bucket: 'class-banners',
    maxSizeMB: 5,
  })

  useEffect(() => {
    if (initialData?.banner_url) {
      banner.setInitialPreview(initialData.banner_url)
    }
  }, [initialData])

  useEffect(() => {
    loadInstructors()
  }, [])

  const loadInstructors = async () => {
    try {
      const data = await fetchInstructorsUtil()
      setInstructors(data)
    } catch (err) {
      console.error('Error fetching instructors:', err)
    }
  }

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let bannerUrl = banner.preview
      if (banner.file) {
        bannerUrl = await banner.upload()
      }

      const classData = {
        name,
        description: description || null,
        instructor_id: instructorId && instructorId !== 'none' ? instructorId : null,
        instructor_payment_type: instructorPaymentType,
        instructor_payment_value: parseFloat(instructorPaymentValue) || 70,
        schedule_days: selectedDays.length > 0 ? selectedDays : null,
        schedule_time: selectedTime || null,
        duration_minutes: duration ? parseInt(duration) : null,
        banner_url: bannerUrl,
      }

      if (initialData) {
        const { error: updateError } = await supabase
          .from('classes')
          .update(classData)
          .eq('id', initialData.id)

        if (updateError) throw updateError
      } else {
        const { error: createError } = await supabase
          .from('classes')
          .insert({
            ...classData,
            created_by: user.id,
          })

        if (createError) throw createError
      }

      onSuccess()
    } catch (err) {
      console.error('Error saving class:', err)
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="banner">{t('admin.classBanner')}</Label>
        {banner.preview ? (
          <div className="relative">
            <img
              src={banner.preview}
              alt="Banner preview"
              className="w-full h-48 object-cover rounded-lg"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={banner.remove}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <Label
              htmlFor="banner"
              className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
            >
              {t('admin.uploadBanner')}
            </Label>
            <Input
              id="banner"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={banner.handleChange}
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">{t('admin.className')} *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Yoga, Pilates, etc."
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t('admin.description')}</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('admin.descriptionPlaceholder')}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructor">{t('admin.instructor')}</Label>
        <Select value={instructorId || 'none'} onValueChange={setInstructorId}>
          <SelectTrigger>
            <SelectValue placeholder={t('admin.selectInstructor')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('admin.noInstructor')}</SelectItem>
            {instructors.map((instructor) => (
              <SelectItem key={instructor.id} value={instructor.id}>
                {instructor.name} ({instructor.role})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
        <div className="space-y-2">
          <Label>{t('admin.instructorPaymentType')}</Label>
          <Select value={instructorPaymentType} onValueChange={(value: 'flat' | 'percentage') => setInstructorPaymentType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">{t('admin.percentage')}</SelectItem>
              <SelectItem value="flat">{t('admin.flatRate')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentValue">
            {instructorPaymentType === 'percentage'
              ? t('admin.instructorPercentage')
              : t('admin.instructorFlatRate')}
          </Label>
          <div className="flex items-center gap-2">
            {instructorPaymentType === 'flat' && <span className="text-muted-foreground">$</span>}
            <Input
              id="paymentValue"
              type="number"
              min="0"
              max={instructorPaymentType === 'percentage' ? '100' : undefined}
              step={instructorPaymentType === 'percentage' ? '1' : '0.01'}
              value={instructorPaymentValue}
              onChange={(e) => setInstructorPaymentValue(e.target.value)}
              required
            />
            {instructorPaymentType === 'percentage' && <span className="text-muted-foreground">%</span>}
          </div>
          <p className="text-xs text-muted-foreground">
            {instructorPaymentType === 'percentage'
              ? t('admin.instructorPaymentHelp', { value: instructorPaymentValue, admin: 100 - parseFloat(instructorPaymentValue || '0') })
              : t('admin.instructorPaymentHelpFlat', { value: instructorPaymentValue })}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('admin.scheduleDays')}</Label>
        <div className="grid grid-cols-2 gap-3">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="flex items-center space-x-2">
              <Checkbox
                id={day}
                checked={selectedDays.includes(day)}
                onCheckedChange={() => handleDayToggle(day)}
              />
              <Label
                htmlFor={day}
                className="text-sm font-normal cursor-pointer"
              >
                {t(`admin.${day}`)}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="time">{t('admin.scheduleTime')}</Label>
        <Select value={selectedTime} onValueChange={setSelectedTime}>
          <SelectTrigger>
            <SelectValue placeholder={t('admin.selectTime')} />
          </SelectTrigger>
          <SelectContent>
            {HOURS.map((hour) => (
              <SelectItem key={hour.value} value={hour.value}>
                {hour.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration">{t('admin.duration')}</Label>
        <Select value={duration} onValueChange={setDuration}>
          <SelectTrigger>
            <SelectValue placeholder={t('admin.selectDuration')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30 {t('admin.minutes')}</SelectItem>
            <SelectItem value="45">45 {t('admin.minutes')}</SelectItem>
            <SelectItem value="60">60 {t('admin.minutes')}</SelectItem>
            <SelectItem value="75">75 {t('admin.minutes')}</SelectItem>
            <SelectItem value="90">90 {t('admin.minutes')}</SelectItem>
            <SelectItem value="120">120 {t('admin.minutes')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ErrorMessage message={error} />

      <div className="flex gap-3 pt-4">
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading
            ? t('common.loading')
            : initialData
            ? t('admin.updateClass')
            : t('admin.createClass')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          {t('admin.cancel')}
        </Button>
      </div>
    </form>
  )
}
