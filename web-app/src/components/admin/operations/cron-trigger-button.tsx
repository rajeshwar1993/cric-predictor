'use client'

import { useState } from 'react'
import { Play, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  triggerCronFunction,
  type TriggerResult,
} from '@/lib/actions/admin/trigger-cron'

interface CronTriggerButtonProps {
  cronKey: string
}

export function CronTriggerButton({ cronKey }: CronTriggerButtonProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<TriggerResult | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const handleTrigger = async () => {
    setIsRunning(true)
    setResult(null)
    setShowDetails(false)

    try {
      const res = await triggerCronFunction(cronKey)
      setResult(res)
      if (res.success && res.data) {
        setShowDetails(true)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setResult({ success: false, error: message })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleTrigger}
          disabled={isRunning}
          className="h-7 text-xs"
        >
          {isRunning ? (
            <Loader2 size={12} className="mr-1.5 animate-spin" />
          ) : (
            <Play size={12} className="mr-1.5" />
          )}
          {isRunning ? 'Running...' : 'Run Now'}
        </Button>

        {result && (
          <div className="flex items-center gap-1.5">
            {result.success ? (
              <CheckCircle2 size={14} className="text-green-400" />
            ) : (
              <XCircle size={14} className="text-red-400" />
            )}
            <span
              className={cn(
                'text-xs',
                result.success ? 'text-green-400' : 'text-red-400'
              )}
            >
              {result.success
                ? `Done${result.durationMs ? ` (${(result.durationMs / 1000).toFixed(1)}s)` : ''}`
                : 'Failed'}
            </span>
            {result.data && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="ml-1 text-text-muted hover:text-text-secondary"
              >
                {showDetails ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {result && !result.success && result.error && (
        <p className="text-xs text-red-300">{result.error}</p>
      )}

      {/* Response details */}
      {showDetails && result?.data && (
        <pre className="max-h-40 overflow-auto rounded-md border border-wire bg-concrete-black p-2 text-[11px] text-text-secondary">
          {JSON.stringify(result.data, null, 2)}
        </pre>
      )}
    </div>
  )
}
