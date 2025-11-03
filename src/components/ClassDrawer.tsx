import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { Avatar } from '@/components/ui/avatar'
import { ClassForm } from '@/components/ClassForm'
import {
  Trash2,
  ChevronRight,
  Edit,
  QrCode,
  ArrowRight,
  Clock,
} from 'lucide-react'
import type { Class, User as UserType } from '@/types'

interface ClassDrawerProps {
  open: boolean
  onClose: () => void
  classInfo: Class | null
  mode: 'admin' | 'instructor' | 'user' | 'public'
  users?: UserType[]
  onClassUpdated?: () => void
}

export function ClassDrawer({
  open,
  onClose,
  classInfo,
  mode,
  users = [],
  onClassUpdated,
}: ClassDrawerProps) {
  const { t } = useTranslation()
  const [members, setMembers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [instructor, setInstructor] = useState<UserType | null>(null)
  const [loadingInstructor, setLoadingInstructor] = useState(false)

  const canManageMembers = false
  const canEdit = mode === 'admin'
  const showInstructorProfile = mode === 'user' || mode === 'public'
  const showInstructor = mode === 'admin' || mode === 'user' || mode === 'public'
  const showCheckInButton = mode === 'admin' || mode === 'instructor'
  const showAuthCTA = mode === 'public'

  useEffect(() => {
    if (classInfo && open) {
      if (canManageMembers) {
        fetchMembers()
      }
      if (showInstructor && classInfo.instructor_id) {
        fetchInstructor()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classInfo?.id, open])

  const fetchMembers = async () => {
    if (!classInfo) return

    setLoading(true)
    try {
      const { data } = await supabase
        .from('class_memberships')
        .select('user_id')
        .eq('class_id', classInfo.id)

      setMembers(data?.map((m) => m.user_id) || [])
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchInstructor = async () => {
    if (!classInfo?.instructor_id) return

    setLoadingInstructor(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url, role, created_at')
        .eq('id', classInfo.instructor_id)
        .single()

      if (error) throw error
      setInstructor(data as UserType)
    } catch (error) {
      console.error('Error fetching instructor:', error)
    } finally {
      setLoadingInstructor(false)
    }
  }

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classInfo || !selectedUserId) return

    try {
      const { error } = await supabase.from('class_memberships').insert({
        class_id: classInfo.id,
        user_id: selectedUserId,
      })

      if (error) throw error

      setSelectedUserId('')
      fetchMembers()
    } catch (error) {
      console.error('Error adding user:', error)
    }
  }

  const removeMember = async (userId: string) => {
    if (!classInfo || !confirm('Remove this user from the class?')) return

    try {
      const { error } = await supabase
        .from('class_memberships')
        .delete()
        .eq('class_id', classInfo.id)
        .eq('user_id', userId)

      if (error) throw error
      fetchMembers()
    } catch (error) {
      console.error('Error removing member:', error)
    }
  }

  const deleteClass = async () => {
    if (!classInfo || !onClassUpdated) return

    if (!confirm(t('admin.confirmDeleteClass'))) return

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classInfo.id)

      if (error) throw error

      onClose()
      onClassUpdated()
    } catch (error) {
      console.error('Error deleting class:', error)
      alert(t('admin.errorDeletingClass'))
    } finally {
      setIsDeleting(false)
    }
  }

  if (!classInfo) return null

  const enrolledUsers = users.filter((u) => members.includes(u.id))
  const availableUsers = users.filter(
    (u) => !members.includes(u.id) && (mode === 'admin' ? u.role !== 'admin' : u.role === 'user')
  )

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEditing ? t('admin.editClass') : classInfo.name}
    >
      {isEditing ? (
        <div className="space-y-6">
          <ClassForm
            initialData={classInfo}
            onSuccess={() => {
              setIsEditing(false)
              if (onClassUpdated) onClassUpdated()
            }}
            onCancel={() => setIsEditing(false)}
          />
          <div className="border-t pt-4">
            <Button
              variant="destructive"
              className="w-full"
              onClick={deleteClass}
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeleting ? t('common.loading') : t('admin.deleteClass')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {canEdit && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="w-4 h-4 mr-2" />
                {t('admin.editClass')}
              </Button>
            </div>
          )}

          {(classInfo.banner_url || mode === 'public') && (
            <div>
              <img
                src={classInfo.banner_url || '/class-default.jpg'}
                alt={classInfo.name}
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
          )}

          {classInfo.description && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                {t('admin.description')}
              </h3>
              <p className={showInstructorProfile ? 'text-base leading-relaxed' : 'text-sm'}>
                {classInfo.description}
              </p>
            </div>
          )}

          {(instructor || classInfo.instructor) && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                {t('admin.instructor')}
              </h3>
              {instructor ? (
                showInstructorProfile ? (
                  <Link to={`/instructor/${instructor.id}`} onClick={onClose}>
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer group">
                      <Avatar
                        src={instructor.avatar_url}
                        alt={instructor.name}
                        fallbackText={instructor.name}
                        size="md"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-base group-hover:text-primary transition-colors">
                          {instructor.name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {instructor.role}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 text-sm">
                    <Avatar
                      src={instructor.avatar_url}
                      alt={instructor.name}
                      fallbackText={instructor.name}
                      size="sm"
                    />
                    <div>
                      <p className="font-medium">{instructor.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{instructor.role}</p>
                    </div>
                  </div>
                )
              ) : loadingInstructor ? (
                <div className="text-sm text-muted-foreground">
                  {t('common.loading')}
                </div>
              ) : classInfo.instructor ? (
                <p className="text-sm">{classInfo.instructor}</p>
              ) : null}
            </div>
          )}

          {((classInfo.schedule_days && classInfo.schedule_days.length > 0) ||
            classInfo.schedule_time ||
            classInfo.duration_minutes ||
            classInfo.schedule) && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                {t('admin.schedule')}
              </h3>
              {showInstructorProfile ? (
                <div className="flex items-center gap-3 text-base">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="font-medium">
                    {(classInfo.schedule_days && classInfo.schedule_days.length > 0) ||
                    classInfo.schedule_time ? (
                      <>
                        {classInfo.schedule_days &&
                          classInfo.schedule_days.length > 0 && (
                            <>
                              {classInfo.schedule_days
                                .map((day) => t(`admin.${day}`))
                                .join(', ')}
                              {classInfo.schedule_time && ' '}
                            </>
                          )}
                        {classInfo.schedule_time &&
                          `${
                            classInfo.schedule_days &&
                            classInfo.schedule_days.length > 0
                              ? t('admin.at') + ' '
                              : ''
                          }${classInfo.schedule_time}`}
                        {classInfo.duration_minutes &&
                          ` (${classInfo.duration_minutes} ${t('admin.minutes')})`}
                      </>
                    ) : (
                      classInfo.schedule
                    )}
                  </span>
                </div>
              ) : (
                <p className="text-sm">
                  {(classInfo.schedule_days && classInfo.schedule_days.length > 0) ||
                  classInfo.schedule_time ||
                  classInfo.duration_minutes ? (
                    <>
                      {classInfo.schedule_days &&
                        classInfo.schedule_days.length > 0 && (
                          <span>
                            {classInfo.schedule_days
                              .map((day) => t(`admin.${day}`))
                              .join(', ')}
                          </span>
                        )}
                      {classInfo.schedule_time && (
                        <span>
                          {' '}
                          {t('admin.at')} {classInfo.schedule_time}
                        </span>
                      )}
                      {classInfo.duration_minutes && (
                        <span>
                          {' '}
                          ({classInfo.duration_minutes} {t('admin.minutes')})
                        </span>
                      )}
                    </>
                  ) : (
                    classInfo.schedule
                  )}
                </p>
              )}
            </div>
          )}

          {showCheckInButton && (
            <div className="border-t pt-6 pb-6">
              <Link to={`/checkin/${classInfo.id}`} onClick={onClose}>
                <Button className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white rounded-full py-6 text-lg font-semibold shadow-lg group">
                  <QrCode className="mr-2 w-5 h-5" />
                  {t('admin.startCheckIn')}
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Button>
              </Link>
            </div>
          )}

          {canManageMembers && (
            <>
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">
                  {t('admin.addUserToClass')}
                </h3>
                <form onSubmit={addMember} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="selectUser">{t('admin.selectUser')}</Label>
                    <select
                      id="selectUser"
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      required
                    >
                      <option value="">{t('admin.chooseUser')}</option>
                      {availableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" className="w-full">
                    {t('admin.addUser')}
                  </Button>
                </form>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">
                  {t('admin.enrolledUsers')} ({enrolledUsers.length})
                </h3>
                {loading ? (
                  <div className="text-sm text-muted-foreground">
                    {t('common.loading')}
                  </div>
                ) : enrolledUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t('admin.noUsersEnrolled')}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {enrolledUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                      >
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                        <button
                          onClick={() => removeMember(user.id)}
                          className="text-destructive hover:text-destructive/80 p-2 rounded-md hover:bg-destructive/10"
                          title={t('admin.removeFromClass')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {showAuthCTA && (
            <div className="border-t pt-6 mt-8 space-y-3">
              <Link to="/register" className="block">
                <Button className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white rounded-full py-6 text-lg font-semibold shadow-lg group">
                  {t('landing.signUpToJoin')}
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Button>
              </Link>
              <Link to="/login" className="block">
                <Button
                  variant="outline"
                  className="w-full border-2 border-pink-600 text-pink-600 hover:bg-pink-50 rounded-full py-6 text-lg font-semibold"
                >
                  {t('landing.alreadyMember')}
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </Drawer>
  )
}
