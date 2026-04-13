import { Skeleton } from '@/components/ui/skeleton'
import { PageWrapper } from '@/components/layout/page-wrapper'

export default function SettingsLoading() {
  return (
    <PageWrapper className="py-8">
      <Skeleton variant="heading" className="mb-6 h-8 w-32" />

      {/* Settings form fields */}
      <div className="flex flex-col gap-6">
        <div className="rounded-lg border border-wire bg-dark-concrete p-6">
          <Skeleton variant="text" className="mb-2 h-4 w-24" />
          <Skeleton variant="block" className="h-12 w-full rounded-md" />
        </div>
        <div className="rounded-lg border border-wire bg-dark-concrete p-6">
          <Skeleton variant="text" className="mb-2 h-4 w-32" />
          <Skeleton variant="block" className="h-12 w-full rounded-md" />
        </div>
        <div className="rounded-lg border border-wire bg-dark-concrete p-6">
          <Skeleton variant="text" className="mb-2 h-4 w-40" />
          <Skeleton variant="block" className="h-12 w-full rounded-md" />
        </div>
      </div>
    </PageWrapper>
  )
}
