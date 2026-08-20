import { NavLink } from 'react-router-dom'
import {
  IconFolder,
  IconLayoutDashboard,
  IconReceipt2,
  IconClock,
  IconPercentage,
  IconWallet,
  IconHistory,
  IconCar,
  IconHome,
  IconCalendar,
  IconCircleCheck,
  IconSun,
  IconMoon,
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
  { to: '/hours', label: 'Hours & Vacations', icon: IconClock },
  { to: '/rates', label: 'Rates', icon: IconPercentage },
  { to: '/income', label: 'Income', icon: IconWallet },
  { to: '/history', label: 'History', icon: IconHistory },
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
          <div className="h-8 w-8 rounded-full bg-primary/10" />
          <div>
            <p className="text-sm font-semibold text-text-primary">{status?.email ?? '…'}</p>
            <p className="flex items-center gap-1 text-xs text-text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Connected
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1">
            {/* Theme toggle is visual-only for now — dark mode is out of scope for this pass. */}
            <button type="button" className="flex h-[26px] w-[26px] items-center justify-center rounded-md hover:bg-canvas" aria-label="Light theme">
              <IconSun size={14} stroke={1.75} />
            </button>
            <button type="button" className="flex h-[26px] w-[26px] items-center justify-center rounded-md hover:bg-canvas" aria-label="Dark theme">
              <IconMoon size={14} stroke={1.75} />
            </button>
          </div>
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
