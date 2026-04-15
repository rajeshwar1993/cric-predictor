'use client'

import { useState, useCallback } from 'react'

import type { FixtureTableRow } from '@/lib/dal/admin/fixtures'
import { FixtureTable } from '@/components/admin/fixtures/fixture-table'
import { FixtureBulkActions } from '@/components/admin/fixtures/fixture-bulk-actions'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface FixtureTableWithActionsProps {
  rows: FixtureTableRow[]
}

export function FixtureTableWithActions({ rows }: FixtureTableWithActionsProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  return (
    <div className="space-y-3">
      <FixtureBulkActions
        selectedIds={selectedIds}
        rows={rows}
        onClearSelection={handleClearSelection}
      />
      <FixtureTable
        rows={rows}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />
    </div>
  )
}
