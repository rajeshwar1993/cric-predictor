import { CheckCircle } from 'lucide-react'

import { IntegrityDashboard } from '@/components/admin/integrity/integrity-dashboard'
import {
  runBusinessLogicChecks,
  runReferentialChecks,
  runScenarioChecks,
} from '@/lib/dal/admin/integrity'

/**
 * ADM-012: Data Integrity page.
 *
 * Runs referential, business logic, and scenario consistency checks.
 */
export default async function IntegrityPage() {
  const [referentialChecks, businessChecks, scenarioChecks] =
    await Promise.all([
      runReferentialChecks(),
      runBusinessLogicChecks(),
      runScenarioChecks(),
    ])

  const allChecks = [...referentialChecks, ...businessChecks, ...scenarioChecks]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CheckCircle size={24} className="text-bragg-lime" />
        <h1 className="text-2xl font-bold text-text-primary">
          Data Integrity
        </h1>
      </div>

      <IntegrityDashboard initialChecks={allChecks} />
    </div>
  )
}
