import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Menu, Home, GraduationCap, User, LayoutDashboard, LogOut, History } from 'lucide-react'
import { useState } from 'react'

export function Navigation() {
  const { t } = useTranslation()
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)

  if (!profile) return null

  const isAdmin = profile.role === 'admin'
  const isInstructor = profile.role === 'instructor'
  const isActive = (path: string) => location.pathname === path

  const navLinks = isAdmin
    ? [
        { path: '/admin', label: t('admin.dashboard'), icon: LayoutDashboard },
        { path: '/instructors', label: t('instructor.instructors'), icon: GraduationCap },
        { path: '/', label: t('common.home'), icon: Home },
      ]
    : isInstructor
    ? [
        { path: '/instructor', label: t('instructor.dashboard'), icon: LayoutDashboard },
        { path: '/check-ins-history', label: t('user.checkInHistory'), icon: History },
        { path: '/instructors', label: t('instructor.instructors'), icon: GraduationCap },
        { path: '/', label: t('common.home'), icon: Home },
      ]
    : [
        { path: '/user', label: t('user.dashboard'), icon: User },
        { path: '/check-ins-history', label: t('user.checkInHistory'), icon: History },
        { path: '/classes', label: t('landing.ourClasses'), icon: GraduationCap },
        { path: '/instructors', label: t('instructor.instructors'), icon: User },
        { path: '/', label: t('common.home'), icon: Home },
      ]

  const handleSignOut = async () => {
    await signOut()
  }

  const NavLink = ({ path, label, icon: Icon, onClick }: { path: string; label: string; icon: typeof Home; onClick?: () => void }) => (
    <Link
      to={path}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
        isActive(path)
          ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-foreground'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </Link>
  )

  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-white dark:bg-gray-900 shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              {t('app.title')}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2">
              {navLinks.map((link) => (
                <NavLink key={link.path} {...link} />
              ))}
            </div>

            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />

            {/* Profile Section */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {profile.name || profile.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isAdmin ? t('admin.dashboard') : isInstructor ? t('instructor.dashboard') : t('user.dashboard')}
                </p>
              </div>
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                {t('auth.signOut')}
              </Button>
            </div>

            <LanguageSwitcher inline />
          </div>

          {/* Mobile Menu */}
          <div className="flex md:hidden items-center gap-2">
            <LanguageSwitcher inline />
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="border-2">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                      {t('app.title')}
                    </span>
                  </SheetTitle>
                </SheetHeader>

                <div className="mt-8 space-y-6">
                  {/* User Info */}
                  <div className="p-4 rounded-lg bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 border border-pink-200 dark:border-pink-800">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {profile.name || profile.email}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {profile.email}
                        </p>
                        <p className="text-xs text-pink-600 dark:text-pink-400 font-medium mt-1">
                          {isAdmin ? t('admin.dashboard') : isInstructor ? t('instructor.dashboard') : t('user.dashboard')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="space-y-2">
                    {navLinks.map((link) => (
                      <NavLink
                        key={link.path}
                        {...link}
                        onClick={() => setIsOpen(false)}
                      />
                    ))}
                  </div>

                  {/* Sign Out Button */}
                  <div className="pt-4 border-t">
                    <Button
                      onClick={() => {
                        setIsOpen(false)
                        handleSignOut()
                      }}
                      variant="outline"
                      className="w-full gap-2 border-2 border-pink-600 text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-900/20"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('auth.signOut')}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
}
