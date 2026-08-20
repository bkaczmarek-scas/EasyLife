import { NavLink } from 'react-router-dom'
import {
  IconFolder,
  IconLayoutDashboard,
  IconReceipt2,
  IconClock,
  IconCar,
  IconHome,
  IconCalendar,
  IconCircleCheck,
  IconLogout,
} from '@tabler/icons-react'
import { cn } from '../../lib/cn'
import { useStatus } from '../../api/resources/status'

interface NavItemDef {
  to: string
  label: string
  icon: typeof IconHome
}

const careerItems: NavItemDef[] = [
  { to: '/invoicing', label: 'Invoicing', icon: IconReceipt2 },
  { to: '/work', label: 'Compensation', icon: IconClock },
]

const homeItems: NavItemDef[] = [
  { to: '/garage', label: 'Garage', icon: IconCar },
  { to: '/properties', label: 'Properties', icon: IconHome },
  { to: '/subscriptions', label: 'Subscriptions', icon: IconCalendar },
  { to: '/chores', label: 'Home Tasks', icon: IconCircleCheck },
]

function NavItem({ to, label, icon: Icon }: NavItemDef) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium text-text-secondary hover:bg-canvas',
          isActive && 'bg-primary/10 font-semibold text-primary hover:bg-primary/10'
        )
      }
    >
      <Icon size={16} stroke={1.75} />
      {label}
    </NavLink>
  )
}

export function Sidebar() {
  const { data: status } = useStatus()

  return (
    <aside className="flex h-screen w-[236px] shrink-0 flex-col border-r border-border bg-surface-0 px-5 pt-5">
      <div className="flex items-center gap-2">
        <IconFolder size={20} className="text-primary" />
        <span className="text-[20px] font-bold text-text-primary">EasyLife</span>
      </div>

      <nav className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto">
        <NavItem to="/overview" label="Overview" icon={IconLayoutDashboard} />

        <p className="mb-1 mt-5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          Career &amp; Income
        </p>
        {careerItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        <p className="mb-1 mt-5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          Home &amp; Real Estate
        </p>
        {homeItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      <div className="border-t border-border py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10" />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary" title={status?.email ?? undefined}>
            {status?.email ?? '…'}
          </p>
        </div>
        <div className="mt-3">
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
            onClick={async () => {
              await fetch('/api/logout', { method: 'POST' })
              window.location.href = '/login'
            }}
          >
            <IconLogout size={14} stroke={1.75} />
            Exit
          </button>
        </div>
      </div>
    </aside>
  )
}
