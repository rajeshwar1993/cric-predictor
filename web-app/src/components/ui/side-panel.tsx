'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

interface SidePanelProps {
  /** Which edge the panel slides in from */
  side: 'left' | 'right'
  /** Title displayed in the panel header */
  title: string
  /** Whether the panel is open */
  open: boolean
  /** Callback when the open state changes */
  onOpenChange: (open: boolean) => void
  /** Panel content */
  children: React.ReactNode
  /** Additional class name for the content area */
  className?: string
}

function SidePanel({
  side,
  title,
  open,
  onOpenChange,
  children,
  className,
}: SidePanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {/* Visually hidden description for accessibility — screen readers
              will announce the title which is sufficient context */}
          <SheetDescription className="sr-only">
            {title} panel
          </SheetDescription>
        </SheetHeader>
        <div className={cn('flex-1 overflow-y-auto px-4 pb-4', className)}>{children}</div>
      </SheetContent>
    </Sheet>
  )
}

export { SidePanel }
export type { SidePanelProps }
