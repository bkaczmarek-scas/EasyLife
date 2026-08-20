import { useMemo } from 'react'
import { useVehicles } from '../../api/resources/vehicles'
import { useProperties } from '../../api/resources/properties'
import { useSubscriptions } from '../../api/resources/subscriptions'
import { useChores } from '../../api/resources/chores'
import type { BadgeTone } from '../../components/ui/Badge'

export interface AttentionItem {
  id: string
  tag: string
  tone: BadgeTone
  source: string
  title: string
  description: string
  dueLabel: string
  actionLabel: string
  actionTo?: string
  choreId?: string
}

function daysUntil(dateStr: string) {
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
}

export function useAttentionItems() {
  const vehicles = useVehicles()
  const properties = useProperties()
  const subscriptions = useSubscriptions()
  const chores = useChores()

  const isLoading = vehicles.isLoading || properties.isLoading || subscriptions.isLoading || chores.isLoading

  const items = useMemo<AttentionItem[]>(() => {
    const out: AttentionItem[] = []

    for (const v of vehicles.data ?? []) {
      if (v.nextServiceDate) {
        const days = daysUntil(v.nextServiceDate)
        if (days <= 30) {
          out.push({
            id: `veh-service-${v.id}`,
            tag: days < 0 ? 'OVERDUE' : 'EXPIRING',
            tone: days < 0 ? 'danger' : 'warning',
            source: v.name,
            title: 'Vehicle Service Due',
            description: days < 0 ? `Scheduled service is ${Math.abs(days)} day(s) overdue.` : `Service due in ${days} day(s).`,
            dueLabel: days < 0 ? 'Immediately' : `${days} Days Left`,
            actionLabel: 'View Vehicle',
            actionTo: '/garage',
          })
        }
      }
      if (v.insuranceExpiryDate) {
        const days = daysUntil(v.insuranceExpiryDate)
        if (days <= 30) {
          out.push({
            id: `veh-insurance-${v.id}`,
            tag: days < 0 ? 'OVERDUE' : 'EXPIRING',
            tone: days < 0 ? 'danger' : 'warning',
            source: v.name,
            title: 'Insurance Expiry',
            description: days < 0 ? 'Insurance has expired.' : `Insurance renews in ${days} day(s).`,
            dueLabel: days < 0 ? 'Immediately' : `${days} Days Left`,
            actionLabel: 'View Vehicle',
            actionTo: '/garage',
          })
        }
      }
    }

    for (const p of properties.data ?? []) {
      if (p.maintenanceDate) {
        const days = daysUntil(p.maintenanceDate)
        if (days <= 30) {
          out.push({
            id: `prop-maint-${p.id}`,
            tag: days < 0 ? 'OVERDUE' : 'REQUIRED',
            tone: days < 0 ? 'danger' : 'warning',
            source: p.name,
            title: p.maintenanceNote || 'Maintenance Required',
            description: days < 0 ? 'Maintenance is overdue.' : `Scheduled in ${days} day(s).`,
            dueLabel: days < 0 ? 'Immediately' : 'Due Soon',
            actionLabel: 'View Property',
            actionTo: '/properties',
          })
        }
      }
      if (p.tenant?.leaseEnd) {
        const days = daysUntil(p.tenant.leaseEnd)
        if (days <= 60 && days >= 0) {
          out.push({
            id: `prop-lease-${p.id}`,
            tag: 'INFO',
            tone: 'info',
            source: p.name,
            title: 'Lease Expiration',
            description: `Contract ending in ${days} days. Verify renewal or release preparation.`,
            dueLabel: `${days} Days Left`,
            actionLabel: 'Review',
            actionTo: '/properties',
          })
        }
      }
    }

    for (const s of subscriptions.data ?? []) {
      if (s.nextRenewalDate) {
        const days = daysUntil(s.nextRenewalDate)
        if (days <= 7 && days >= 0) {
          out.push({
            id: `sub-${s.id}`,
            tag: 'RENEWAL',
            tone: 'info',
            source: s.name,
            title: 'Subscription Auto-Renewal Pending',
            description: `Automatic charge of ${s.cost.toFixed(2)} PLN scheduled ${days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}.`,
            dueLabel: days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} Days Left`,
            actionLabel: 'Manage Sub',
            actionTo: '/subscriptions',
          })
        }
      }
    }

    for (const c of chores.data ?? []) {
      const isDueOnce = c.frequency === 'once' && !c.doneThisPeriod
      const isDueRecurring = c.frequency !== 'once' && !c.doneThisPeriod
      if (c.priority === 'P1' && (isDueOnce || isDueRecurring)) {
        out.push({
          id: `chore-${c.id}`,
          tag: 'HIGH PRIORITY',
          tone: 'danger',
          source: 'Home Task',
          title: `${c.name} (P1)`,
          description: c.notes || 'High priority task needs attention.',
          dueLabel: 'P1 Overdue',
          actionLabel: 'Complete Task',
          actionTo: '/chores',
          choreId: c.id,
        })
      }
    }

    return out
  }, [vehicles.data, properties.data, subscriptions.data, chores.data])

  const refetchAll = () => {
    vehicles.refetch()
    properties.refetch()
    subscriptions.refetch()
    chores.refetch()
  }

  return { items, isLoading, refetchAll }
}
