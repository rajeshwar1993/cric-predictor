import { Bell } from 'lucide-react'

import { NotificationTypeBreakdownTable } from '@/components/admin/notifications/notification-type-breakdown'
import { NotificationVolumeCards } from '@/components/admin/notifications/notification-volume'
import {
  getNotificationVolume,
  getNotificationsByType,
} from '@/lib/dal/admin/notifications'

/**
 * ADM-010: Notification Monitoring page.
 *
 * Shows notification volume and type breakdown.
 */
export default async function NotificationsPage() {
  const [volume, typeBreakdown] = await Promise.all([
    getNotificationVolume(),
    getNotificationsByType(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell size={24} className="text-bragg-lime" />
        <h1 className="text-2xl font-bold text-text-primary">
          Notification Monitoring
        </h1>
      </div>

      <NotificationVolumeCards volume={volume} />
      <NotificationTypeBreakdownTable types={typeBreakdown} />
    </div>
  )
}
