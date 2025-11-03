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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Navigation } from '@/components/Navigation'
import { usePageTitle } from '@/hooks/usePageTitle'
import { Edit, Trash2, Plus, X, DollarSign, Calendar, Ticket } from 'lucide-react'
import type { DropInCreditPackage } from '@/types'

interface PackageFormData {
  name: string
  num_credits: number
  price: number
  description: string
  active: boolean
}

const defaultFormData: PackageFormData = {
  name: '',
  num_credits: 1,
  price: 0,
  description: '',
  active: true,
}

export function DropInCredits() {
  const { t } = useTranslation()
  usePageTitle('pages.dropInCredits')
  const [packages, setPackages] = useState<DropInCreditPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPackage, setEditingPackage] = useState<DropInCreditPackage | null>(null)
  const [formData, setFormData] = useState<PackageFormData>(defaultFormData)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data } = await supabase
        .from('drop_in_credit_packages')
        .select('*')
        .order('created_at', { ascending: false })

      setPackages(data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingPackage(null)
    setFormData(defaultFormData)
    setShowForm(true)
  }

  const handleEdit = (pkg: DropInCreditPackage) => {
    setEditingPackage(pkg)
    setFormData({
      name: pkg.name,
      num_credits: pkg.num_credits,
      price: pkg.price,
      description: pkg.description || '',
      active: pkg.active,
    })
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingPackage(null)
    setFormData(defaultFormData)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const packageData = {
        name: formData.name,
        credit_count: formData.credit_count,
        price: formData.price,
        description: formData.description || null,
        validity_days: formData.validity_days,
        active: formData.active,
      }

      if (editingPackage) {
        const { error } = await supabase
          .from('drop_in_credit_packages')
          .update(packageData)
          .eq('id', editingPackage.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('drop_in_credit_packages')
          .insert(packageData)

        if (error) throw error
      }

      await fetchData()
      handleCancel()
    } catch (error) {
      console.error('Error saving package:', error)
      alert(t('credits.errorSaving'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('credits.confirmDelete'))) return

    try {
      const { error } = await supabase
        .from('drop_in_credit_packages')
        .update({ active: false })
        .eq('id', id)

      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error('Error deleting package:', error)
      alert(t('credits.errorDeleting'))
    }
  }

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
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold bg-linear-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              {t('credits.title')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('credits.description')}
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            {t('credits.newPackage')}
          </Button>
        </div>

        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>
                {editingPackage ? t('credits.editPackage') : t('credits.createPackage')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('credits.packageName')}</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      placeholder={t('credits.packageNamePlaceholder')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="credit_count">{t('credits.creditCount')}</Label>
                    <Input
                      id="credit_count"
                      type="number"
                      min="1"
                      value={formData.credit_count}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          credit_count: parseInt(e.target.value) || 1,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">{t('credits.price')}</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="validity_days">
                      {t('credits.validityDays')}
                    </Label>
                    <Input
                      id="validity_days"
                      type="number"
                      min="1"
                      value={formData.validity_days || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          validity_days: e.target.value
                            ? parseInt(e.target.value)
                            : null,
                        })
                      }
                      placeholder={t('credits.validityDaysPlaceholder')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="active">{t('credits.status')}</Label>
                    <Select
                      value={formData.active ? 'active' : 'inactive'}
                      onValueChange={(value) =>
                        setFormData({ ...formData, active: value === 'active' })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">{t('credits.active')}</SelectItem>
                        <SelectItem value="inactive">
                          {t('credits.inactive')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t('credits.packageDescription')}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder={t('credits.descriptionPlaceholder')}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={submitting}
                  >
                    <X className="w-4 h-4 mr-2" />
                    {t('admin.cancel')}
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting
                      ? t('common.loading')
                      : editingPackage
                      ? t('credits.updatePackage')
                      : t('credits.createPackage')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">
                  {t('credits.noPackages')}
                </p>
              </CardContent>
            </Card>
          ) : (
            packages.map((pkg) => (
              <Card
                key={pkg.id}
                className={`${
                  !pkg.active ? 'opacity-60 border-dashed' : ''
                } transition-all hover:shadow-lg`}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {pkg.name}
                        {!pkg.active && (
                          <span className="text-xs font-normal px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                            {t('credits.inactive')}
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-1">
                        <Ticket className="w-4 h-4" />
                        {t('credits.flexibleCredits')}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pkg.description && (
                    <p className="text-sm text-muted-foreground">
                      {pkg.description}
                    </p>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t('credits.creditCount')}:
                      </span>
                      <span className="font-semibold">{pkg.credit_count}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        {t('credits.price')}:
                      </span>
                      <span className="text-2xl font-bold text-primary">
                        ${pkg.price.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t('credits.pricePerCredit')}:
                      </span>
                      <span className="font-semibold">
                        ${(pkg.price / pkg.credit_count).toFixed(2)}
                      </span>
                    </div>

                    {pkg.validity_days && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {t('credits.validFor')}:
                        </span>
                        <span className="font-semibold">
                          {pkg.validity_days} {t('user.days')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(pkg)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      {t('common.edit')}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(pkg.id)}
                      disabled={!pkg.active}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
