import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { RequireAuth } from './features/auth/RequireAuth'
import { LoginPage } from './features/auth/LoginPage'
import { OverviewPage } from './features/overview/OverviewPage'
import { InvoicingHistoryPage } from './features/invoicingHistory/InvoicingHistoryPage'
import { WorkCompensationPage } from './features/workCompensation/WorkCompensationPage'
import { GaragePage } from './features/garage/GaragePage'
import { PropertiesPage } from './features/properties/PropertiesPage'
import { SubscriptionsPage } from './features/subscriptions/SubscriptionsPage'
import { ChoresPage } from './features/chores/ChoresPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: 'overview', element: <OverviewPage /> },
      { path: 'invoicing', element: <InvoicingHistoryPage /> },
      { path: 'work', element: <WorkCompensationPage /> },
      // Old routes from before Hours/Rates/Income were merged into one "Work & Compensation"
      // section — kept as redirects so existing bookmarks/muscle memory still land somewhere.
      { path: 'hours', element: <Navigate to="/work" replace /> },
      { path: 'rates', element: <Navigate to="/work" replace /> },
      { path: 'income', element: <Navigate to="/work" replace /> },
      // History was merged into the Invoicing page as a tab — redirect old bookmarks.
      { path: 'history', element: <Navigate to="/invoicing" replace /> },
      { path: 'garage', element: <GaragePage /> },
      { path: 'properties', element: <PropertiesPage /> },
      { path: 'subscriptions', element: <SubscriptionsPage /> },
      { path: 'chores', element: <ChoresPage /> },
    ],
  },
])
