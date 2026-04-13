'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

type ProgressState = 'idle' | 'loading' | 'completing'

/**
 * NavigationProgress — a thin lime progress bar fixed at the top of the
 * viewport. Provides immediate visual feedback when the user navigates
 * between pages.
 *
 * Detects navigation start via document-level click interception on `<a>`
 * tags and `popstate` events (browser back/forward). Detects navigation end
 * via `usePathname()` + `useSearchParams()` changes.
 *
 * @see docs/design-systems/electric-street.md — Motion tokens
 */
export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [state, setState] = useState<ProgressState>('idle')
  const completingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const urlKey = `${pathname}?${searchParams.toString()}`
  const [trackedUrl, setTrackedUrl] = useState(urlKey)

  // Detect navigation end during render — React "adjusting state" pattern.
  // When usePathname/useSearchParams change, the component re-renders.
  // We compare the new URL key with the tracked one to detect navigation end.
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  if (trackedUrl !== urlKey) {
    setTrackedUrl(urlKey)
    if (state !== 'idle') {
      setState('completing')
    }
  }

  // Handle completing → idle transition after animation finishes
  useEffect(() => {
    if (state !== 'completing') return

    completingTimer.current = setTimeout(() => {
      setState('idle')
    }, 500)

    return () => {
      if (completingTimer.current) {
        clearTimeout(completingTimer.current)
        completingTimer.current = null
      }
    }
  }, [state])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (completingTimer.current) clearTimeout(completingTimer.current)
    }
  }, [])

  // Navigation start: detect clicks on internal links + popstate
  const startNavigation = useCallback(() => {
    if (completingTimer.current) {
      clearTimeout(completingTimer.current)
      completingTimer.current = null
    }
    setState('loading')
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement)?.closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')

      // Filter out non-navigating clicks
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('http') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download') ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        e.button !== 0
      ) {
        return
      }

      // Don't trigger for same-page links
      const url = new URL(href, window.location.origin)
      const targetKey = `${url.pathname}?${url.searchParams.toString()}`
      if (targetKey === urlKey) return

      startNavigation()
    }

    function handlePopState() {
      startNavigation()
    }

    document.addEventListener('click', handleClick, true)
    window.addEventListener('popstate', handlePopState)

    return () => {
      document.removeEventListener('click', handleClick, true)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [urlKey, startNavigation])

  if (state === 'idle') return null

  return (
    <div
      role="progressbar"
      aria-label="Page loading"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={state === 'completing' ? 100 : undefined}
      className="fixed top-0 right-0 left-0 z-[9999] h-[3px]"
    >
      <div
        className="h-full bg-bragg-lime shadow-[0_0_8px_var(--color-bragg-lime)] motion-reduce:shadow-none"
        style={{
          width: state === 'loading' ? '90%' : '100%',
          opacity: state === 'completing' ? 0 : 1,
          transition:
            state === 'loading'
              ? 'width 8s cubic-bezier(0.23, 1, 0.32, 1)'
              : 'width 200ms ease-out, opacity 300ms ease-out 200ms',
        }}
      />
    </div>
  )
}
