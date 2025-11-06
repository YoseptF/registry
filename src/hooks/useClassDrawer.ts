import { useState } from 'react'
import type { Class } from '@/types'

/**
 * Custom hook for managing class drawer state
 * Handles opening/closing drawer and tracking selected class
 *
 * @returns Drawer state and control functions
 */
export function useClassDrawer() {
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const handleClassClick = (cls: Class) => {
    setSelectedClass(cls)
    setIsDrawerOpen(true)
  }

  const closeDrawer = () => {
    setIsDrawerOpen(false)
  }

  return {
    selectedClass,
    isDrawerOpen,
    handleClassClick,
    closeDrawer,
    setIsDrawerOpen,
  }
}
