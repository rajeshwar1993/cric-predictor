import { Skeleton } from '@/components/ui/skeleton'
import { PageWrapper } from '@/components/layout/page-wrapper'

export default function DeleteAccountLoading() {
  return (
    <PageWrapper className="py-8" maxWidth="sm">
      <Skeleton variant="heading" className="mb-4 h-8 w-48" />
      <Skeleton variant="text" className="mb-2 w-full" />
      <Skeleton variant="text" className="mb-6 w-3/4" />
      <Skeleton variant="block" className="h-12 w-full rounded-md" />
    </PageWrapper>
  )
}
