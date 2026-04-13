'use client'

import Link from 'next/link'
import { useState } from 'react'

import type { GangSearchResult } from '@/lib/dal/admin/gangs'
import { cn } from '@/lib/utils'

interface GangSearchProps {
  initialResults: GangSearchResult[]
}

export function GangSearch({ initialResults }: GangSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(initialResults)
  const [isSearching, setIsSearching] = useState(false)

  const filtered = query.trim()
    ? results.filter(
        (g) =>
          g.name.toLowerCase().includes(query.toLowerCase()) ||
          g.inviteCode.toLowerCase().includes(query.toLowerCase()),
      )
    : results

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults(initialResults)
      return
    }
    setIsSearching(true)
    try {
      const res = await fetch(
        `/api/admin/gangs/search?q=${encodeURIComponent(query.trim())}`,
      )
      if (res.ok) {
        const data = (await res.json()) as GangSearchResult[]
        setResults(data)
      }
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="rounded-lg border border-wire bg-dark-concrete">
      <div className="border-b border-wire px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">Gang Search</h3>
      </div>
      <div className="p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              if (!e.target.value.trim()) {
                setResults(initialResults)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch()
            }}
            placeholder="Search by name or invite code..."
            className="flex-1 rounded-md border border-wire bg-mid-concrete px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-bragg-lime focus:outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="rounded-md bg-bragg-lime px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {filtered.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-wire text-left text-xs uppercase tracking-wider text-text-muted">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Invite Code</th>
                  <th className="px-3 py-2 text-right">Members</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((gang) => (
                  <tr
                    key={gang.id}
                    className="border-b border-mid-concrete last:border-b-0"
                  >
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/gangs/${gang.id}`}
                        className="text-bragg-lime hover:underline"
                      >
                        {gang.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 font-mono text-text-secondary">
                      {gang.inviteCode}
                    </td>
                    <td className="px-3 py-2 text-right text-text-primary">
                      {gang.memberCount}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          gang.isDeleted
                            ? 'bg-red-400/10 text-red-400'
                            : 'bg-green-400/10 text-green-400',
                        )}
                      >
                        {gang.isDeleted ? 'Deleted' : 'Active'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-text-muted">
                      {new Date(gang.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-text-muted">
            {query.trim() ? 'No gangs found.' : 'Enter a search term.'}
          </p>
        )}
      </div>
    </div>
  )
}
