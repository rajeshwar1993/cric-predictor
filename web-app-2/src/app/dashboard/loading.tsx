import { Skeleton } from '@/components/ui/skeleton'
import { GlobalNavBar } from '@/components/layout/global-nav-bar'
import { GlobalFooter } from '@/components/layout/global-footer'
import { PageWrapper } from '@/components/layout/page-wrapper'

export default function DashboardLoading() {
  return (
    <>
      <GlobalNavBar />
      <PageWrapper className="pt-[56px]">
        <div className="flex flex-col gap-[var(--sp-6)]">
          {/* Page title skeleton */}
          <Skeleton className="h-8 w-40" />

          {/* Gang card skeletons */}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-[var(--sp-3)] rounded-[var(--radius-ds-lg)] border border-[var(--border-default)] p-[var(--sp-4)]"
              style={{ backgroundColor: 'var(--bg-raised)', minHeight: 80 }}
            >
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}

          {/* Create / Join skeleton */}
          <div
            className="flex flex-col gap-[var(--sp-6)] rounded-[var(--radius-ds-lg)] border border-[var(--border-default)] p-[var(--sp-4)]"
            style={{ backgroundColor: 'var(--bg-raised)' }}
          >
            <div className="flex flex-col gap-[var(--sp-3)]">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-12 w-full" />
            </div>
            <div className="border-t" style={{ borderColor: 'var(--border-default)' }} />
            <div className="flex flex-col gap-[var(--sp-3)]">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </PageWrapper>
      <GlobalFooter />
    </>
  )
}
