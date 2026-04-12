import { notFound } from 'next/navigation'

import { getFixtureDetail } from '@/lib/dal/admin/fixtures'
import { FixtureDetail } from '@/components/admin/fixtures/fixture-detail'

interface FixtureDetailPageProps {
  params: Promise<{ fixtureId: string }>
}

export default async function FixtureDetailPage({
  params,
}: FixtureDetailPageProps) {
  const { fixtureId } = await params

  const data = await getFixtureDetail(fixtureId)

  if (!data) {
    notFound()
  }

  return <FixtureDetail data={data} />
}
