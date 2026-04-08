import type { ReactNode } from 'react'
import { GlobalNavBar } from '@/components/layout/global-nav-bar'
import { GlobalFooter } from '@/components/layout/global-footer'
import { PageWrapper } from '@/components/layout/page-wrapper'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <GlobalNavBar />
      <PageWrapper className="pt-[56px]">{children}</PageWrapper>
      <GlobalFooter />
    </>
  )
}
