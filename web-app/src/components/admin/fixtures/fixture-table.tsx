'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Minus,
  X,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import type {
  FixtureTableRow,
  MatchStatus,
} from '@/lib/dal/admin/fixtures'

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------

interface StatusBadgeConfig {
  label: string
  bgClass: string
  textClass: string
}

const STATUS_BADGE: Record<MatchStatus, StatusBadgeConfig> = {
  upcoming: { label: 'Upcoming', bgClass: 'bg-blue-500/20', textClass: 'text-blue-400' },
  live: { label: 'Live', bgClass: 'bg-green-500/20', textClass: 'text-green-400' },
  completed: { label: 'Completed', bgClass: 'bg-amber-500/20', textClass: 'text-amber-400' },
  resolved: { label: 'Resolved', bgClass: 'bg-neutral-500/20', textClass: 'text-neutral-400' },
  abandoned: { label: 'Abandoned', bgClass: 'bg-red-500/20', textClass: 'text-red-400' },
  no_result: { label: 'No Result', bgClass: 'bg-red-500/20', textClass: 'text-red-400' },
}

const ALL_STATUSES: MatchStatus[] = [
  'upcoming',
  'live',
  'completed',
  'resolved',
  'abandoned',
  'no_result',
]

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

type SortField =
  | 'matchNumber'
  | 'round'
  | 'startDatetime'
  | 'status'
  | 'predictionsCount'

type SortDirection = 'asc' | 'desc'

function comparePrimitive<T extends string | number>(
  a: T,
  b: T,
  dir: SortDirection,
): number {
  if (a < b) return dir === 'asc' ? -1 : 1
  if (a > b) return dir === 'asc' ? 1 : -1
  return 0
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDatetime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function timeInStatus(statusChangedAt: string): string {
  const diffMs = Date.now() - new Date(statusChangedAt).getTime()
  const minutes = Math.floor(diffMs / 60_000)

  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ${minutes % 60}m`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface FixtureTableProps {
  rows: FixtureTableRow[]
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
}

export function FixtureTable({ rows, selectedIds, onSelectionChange }: FixtureTableProps) {
  const router = useRouter()
  const [sortField, setSortField] = useState<SortField>('matchNumber')
  const [sortDir, setSortDir] = useState<SortDirection>('asc')
  const [statusFilter, setStatusFilter] = useState<MatchStatus | 'all'>('all')
  const [filterOpen, setFilterOpen] = useState(false)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const filteredAndSorted = useMemo(() => {
    let result = rows

    // Filter
    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter)
    }

    // Sort
    return [...result].sort((a, b) => {
      switch (sortField) {
        case 'matchNumber':
          return comparePrimitive(a.matchNumber, b.matchNumber, sortDir)
        case 'round':
          return comparePrimitive(a.round, b.round, sortDir)
        case 'startDatetime':
          return comparePrimitive(a.startDatetime, b.startDatetime, sortDir)
        case 'status':
          return comparePrimitive(a.status, b.status, sortDir)
        case 'predictionsCount':
          return comparePrimitive(
            a.predictionsCount,
            b.predictionsCount,
            sortDir,
          )
        default:
          return 0
      }
    })
  }, [rows, statusFilter, sortField, sortDir])

  const selectionEnabled = selectedIds !== undefined && onSelectionChange !== undefined

  const allFilteredSelected =
    selectionEnabled &&
    filteredAndSorted.length > 0 &&
    filteredAndSorted.every((r) => selectedIds.has(r.id))

  const someFilteredSelected =
    selectionEnabled &&
    !allFilteredSelected &&
    filteredAndSorted.some((r) => selectedIds.has(r.id))

  const handleSelectAll = () => {
    if (!onSelectionChange) return
    if (allFilteredSelected) {
      // Deselect all filtered rows (but keep other selections)
      const next = new Set(selectedIds)
      for (const r of filteredAndSorted) {
        next.delete(r.id)
      }
      onSelectionChange(next)
    } else {
      // Select all filtered rows
      const next = new Set(selectedIds)
      for (const r of filteredAndSorted) {
        next.add(r.id)
      }
      onSelectionChange(next)
    }
  }

  const handleSelectRow = (id: string) => {
    if (!onSelectionChange || !selectedIds) return
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onSelectionChange(next)
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {filteredAndSorted.length} fixture{filteredAndSorted.length === 1 ? '' : 's'}
          {statusFilter !== 'all' && (
            <span className="text-text-muted">
              {' '}
              (filtered: {STATUS_BADGE[statusFilter].label})
            </span>
          )}
        </p>

        {/* Status filter dropdown */}
        <div className="relative">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex items-center gap-1.5 rounded-md border border-wire bg-dark-concrete px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-mid-concrete"
          >
            Status: {statusFilter === 'all' ? 'All' : STATUS_BADGE[statusFilter].label}
            <ChevronDown size={14} />
          </button>
          {filterOpen && (
            <div className="absolute right-0 z-10 mt-1 w-40 rounded-md border border-wire bg-dark-concrete py-1 shadow-lg">
              <button
                onClick={() => {
                  setStatusFilter('all')
                  setFilterOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-mid-concrete',
                  statusFilter === 'all'
                    ? 'text-bragg-lime'
                    : 'text-text-secondary',
                )}
              >
                All
              </button>
              {ALL_STATUSES.map((s) => {
                const config = STATUS_BADGE[s]
                return (
                  <button
                    key={s}
                    onClick={() => {
                      setStatusFilter(s)
                      setFilterOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-mid-concrete',
                      statusFilter === s
                        ? 'text-bragg-lime'
                        : 'text-text-secondary',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-2 w-2 rounded-full',
                        config.bgClass,
                      )}
                    />
                    {config.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-wire">
        <table className="w-full">
          <thead>
            <tr className="bg-dark-concrete">
              {selectionEnabled && (
                <th className="w-10 px-3 py-2.5">
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center justify-center"
                    aria-label={allFilteredSelected ? 'Deselect all' : 'Select all'}
                  >
                    <span
                      className={cn(
                        'inline-flex h-4 w-4 items-center justify-center rounded border transition-colors',
                        allFilteredSelected
                          ? 'border-bragg-lime bg-bragg-lime'
                          : someFilteredSelected
                            ? 'border-bragg-lime bg-bragg-lime/30'
                            : 'border-wire bg-dark-concrete hover:border-text-secondary',
                      )}
                    >
                      {allFilteredSelected && (
                        <Check size={12} className="text-concrete-black" />
                      )}
                      {someFilteredSelected && !allFilteredSelected && (
                        <Minus size={12} className="text-concrete-black" />
                      )}
                    </span>
                  </button>
                </th>
              )}
              <SortableHeader
                label="Match #"
                field="matchNumber"
                currentField={sortField}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Round"
                field="round"
                currentField={sortField}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                Home
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                Away
              </th>
              <SortableHeader
                label="Start"
                field="startDatetime"
                currentField={sortField}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                Venue
              </th>
              <SortableHeader
                label="Status"
                field="status"
                currentField={sortField}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                Synced
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                Scenarios
              </th>
              <SortableHeader
                label="Predictions"
                field="predictionsCount"
                currentField={sortField}
                currentDir={sortDir}
                onSort={handleSort}
              />
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-widest text-text-secondary">
                In Status
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td
                  colSpan={selectionEnabled ? 12 : 11}
                  className="px-4 py-12 text-center text-sm text-text-muted"
                >
                  No fixtures found
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => router.push(`/admin/fixtures/${row.id}`)}
                  className={cn(
                    'cursor-pointer border-t border-wire transition-colors hover:bg-dark-concrete',
                    selectionEnabled && selectedIds.has(row.id)
                      ? 'bg-bragg-lime/5'
                      : 'bg-concrete-black',
                  )}
                >
                  {selectionEnabled && (
                    <td className="w-10 px-3 py-2.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectRow(row.id)
                        }}
                        className="flex items-center justify-center"
                        aria-label={
                          selectedIds.has(row.id)
                            ? `Deselect match ${row.matchNumber}`
                            : `Select match ${row.matchNumber}`
                        }
                      >
                        <span
                          className={cn(
                            'inline-flex h-4 w-4 items-center justify-center rounded border transition-colors',
                            selectedIds.has(row.id)
                              ? 'border-bragg-lime bg-bragg-lime'
                              : 'border-wire bg-dark-concrete hover:border-text-secondary',
                          )}
                        >
                          {selectedIds.has(row.id) && (
                            <Check size={12} className="text-concrete-black" />
                          )}
                        </span>
                      </button>
                    </td>
                  )}
                  <td className="px-4 py-2.5 text-sm font-medium tabular-nums text-text-primary">
                    {row.matchNumber}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-text-secondary">
                    {row.round}
                  </td>
                  <td className="px-4 py-2.5">
                    <TeamCell code={row.homeTeam.code} color={row.homeTeam.color} />
                  </td>
                  <td className="px-4 py-2.5">
                    <TeamCell code={row.awayTeam.code} color={row.awayTeam.color} />
                  </td>
                  <td className="px-4 py-2.5 text-sm text-text-secondary">
                    {formatDatetime(row.startDatetime)}
                  </td>
                  <td className="max-w-[160px] truncate px-4 py-2.5 text-sm text-text-secondary">
                    {row.venueName}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {row.preMatchSynced ? (
                      <Check size={16} className="inline text-green-400" />
                    ) : (
                      <X size={16} className="inline text-red-400" />
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-sm tabular-nums text-text-secondary">
                    {row.scenariosResolved}/{row.scenariosTotal}
                  </td>
                  <td className="px-4 py-2.5 text-sm tabular-nums text-text-secondary">
                    {row.predictionsCount}
                  </td>
                  <td className="px-4 py-2.5 text-sm tabular-nums text-text-muted">
                    {timeInStatus(row.statusChangedAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SortableHeaderProps {
  label: string
  field: SortField
  currentField: SortField
  currentDir: SortDirection
  onSort: (field: SortField) => void
}

function SortableHeader({
  label,
  field,
  currentField,
  currentDir,
  onSort,
}: SortableHeaderProps) {
  const isActive = currentField === field

  return (
    <th className="px-4 py-2.5 text-left">
      <button
        onClick={() => onSort(field)}
        className={cn(
          'flex items-center gap-1 text-xs font-medium uppercase tracking-widest transition-colors',
          isActive ? 'text-bragg-lime' : 'text-text-secondary hover:text-text-primary',
        )}
      >
        {label}
        <ArrowUpDown
          size={12}
          className={cn(
            'shrink-0',
            isActive && currentDir === 'desc' && 'rotate-180',
          )}
        />
      </button>
    </th>
  )
}

interface TeamCellProps {
  code: string
  color: string
}

function TeamCell({ code, color }: TeamCellProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-block h-3 w-3 rounded-full border border-wire"
        style={{ backgroundColor: color }}
      />
      <span className="text-sm font-medium text-text-primary">{code}</span>
    </div>
  )
}

interface StatusBadgeProps {
  status: MatchStatus
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_BADGE[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        config.bgClass,
        config.textClass,
      )}
    >
      {config.label}
    </span>
  )
}
