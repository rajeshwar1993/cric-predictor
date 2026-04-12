'use client'

import Link from 'next/link'
import { useState } from 'react'

import type { UserSearchResult } from '@/lib/dal/admin/users'
import { cn } from '@/lib/utils'

interface UserSearchProps {
  initialResults: UserSearchResult[]
}

export function UserSearch({ initialResults }: UserSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(initialResults)
  const [isSearching, setIsSearching] = useState(false)

  const filtered = query.trim()
    ? results.filter(
        (u) =>
          u.email.toLowerCase().includes(query.toLowerCase()) ||
          (u.displayName?.toLowerCase().includes(query.toLowerCase()) ?? false),
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
        `/api/admin/users/search?q=${encodeURIComponent(query.trim())}`,
      )
      if (res.ok) {
        const data = (await res.json()) as UserSearchResult[]
        setResults(data)
      }
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="rounded-lg border border-[#333333] bg-[#1a1a1a]">
      <div className="border-b border-[#333333] px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">
          User Search
        </h3>
      </div>
      <div className="p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              // Filter locally from initial results
              if (!e.target.value.trim()) {
                setResults(initialResults)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch()
            }}
            placeholder="Search by email or name..."
            className="flex-1 rounded-md border border-[#333333] bg-[#242424] px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-bragg-lime focus:outline-none"
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
                <tr className="border-b border-[#333333] text-left text-xs uppercase tracking-wider text-text-muted">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[#242424] last:border-b-0"
                  >
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="text-bragg-lime hover:underline"
                      >
                        {user.displayName ?? 'No name'}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-text-secondary">
                      {user.email}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          user.isDeleted
                            ? 'bg-red-400/10 text-red-400'
                            : user.onboardingCompleted
                              ? 'bg-green-400/10 text-green-400'
                              : 'bg-yellow-400/10 text-yellow-400',
                        )}
                      >
                        {user.isDeleted
                          ? 'Deleted'
                          : user.onboardingCompleted
                            ? 'Active'
                            : 'Not Onboarded'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-text-muted">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-text-muted">
            {query.trim() ? 'No users found.' : 'Enter a search term.'}
          </p>
        )}
      </div>
    </div>
  )
}
