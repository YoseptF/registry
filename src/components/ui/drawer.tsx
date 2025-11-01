import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

interface DrawerProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}

export function Drawer({ open, onClose, children, title }: DrawerProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed right-0 top-0 bottom-0 w-full max-w-md bg-background z-50 shadow-xl",
          "transform transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 hover:bg-accent transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>
        </div>
      </div>
    </>
  )
}
