import { redirect } from 'next/navigation'

/** Bare `/admin` redirects to the overview page. */
export default function AdminRootPage() {
  redirect('/admin/overview')
}
