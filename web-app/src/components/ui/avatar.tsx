'use client'

import * as React from 'react'
import { Avatar as AvatarPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

function Avatar({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: 'default' | 'sm' | 'lg'
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        'group/avatar relative flex shrink-0 overflow-hidden rounded-full select-none',
        'data-[size=sm]:size-8 data-[size=default]:size-10 data-[size=lg]:size-14',
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn('aspect-square size-full', className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        'flex size-full items-center justify-center rounded-full bg-bragg-lime font-display font-bold text-text-on-primary',
        'group-data-[size=sm]/avatar:text-xs',
        'group-data-[size=default]/avatar:text-sm',
        'group-data-[size=lg]/avatar:text-lg',
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
