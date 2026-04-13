import { Skeleton } from '@/components/ui/skeleton'
import { PageWrapper } from '@/components/layout/page-wrapper'

export default function ProfileLoading() {
  return (
    <PageWrapper className="py-8">
      {/* Page title */}
      <Skeleton variant="heading" className="mb-6 h-8 w-32" />

      {/* Account info section */}
      <section className="mt-6 rounded-lg border border-wire bg-dark-concrete p-6">
        <div className="flex items-center gap-4">
          <Skeleton variant="avatar" className="size-16" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton variant="heading" className="w-36" />
            <Skeleton variant="text" className="w-48" />
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-4">
          <Skeleton variant="text" className="w-full" />
          <Skeleton variant="text" className="w-3/4" />
        </div>
      </section>

      {/* Stats section */}
      <section className="mt-8 rounded-lg border border-wire bg-dark-concrete p-6">
        <Skeleton variant="heading" className="mb-4 w-24" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton variant="block" className="h-20 rounded-lg" />
          <Skeleton variant="block" className="h-20 rounded-lg" />
          <Skeleton variant="block" className="h-20 rounded-lg" />
          <Skeleton variant="block" className="h-20 rounded-lg" />
        </div>
      </section>

      {/* Account actions section */}
      <section className="mt-8 rounded-lg border border-wire bg-dark-concrete p-6">
        <Skeleton variant="heading" className="w-40" />
        <Skeleton variant="text" className="mt-4 w-32" />
      </section>
    </PageWrapper>
  )
}
