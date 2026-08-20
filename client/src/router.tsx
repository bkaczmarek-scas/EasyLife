import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { RequireAuth } from './features/auth/RequireAuth'
import { LoginPage } from './features/auth/LoginPage'
import { OverviewPage } from './features/overview/OverviewPage'
import { InvoicingPage } from './features/invoicing/InvoicingPage'
import { HoursPage } from './features/hours/HoursPage'
import { RatesPage } from './features/rates/RatesPage'
import { IncomePage } from './features/income/IncomePage'
import { HistoryPage } from './features/history/HistoryPage'
import { GaragePage } from './features/garage/GaragePage'
import { PropertiesPage } from './features/properties/PropertiesPage'
import { SubscriptionsPage } from './features/subscriptions/SubscriptionsPage'
import { ChoresPage } from './features/chores/ChoresPage'

import { Navigate } from 'react-router-dom'

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
      { path: 'invoicing', element: <InvoicingPage /> },
      { path: 'hours', element: <HoursPage /> },
      { path: 'rates', element: <RatesPage /> },
      { path: 'income', element: <IncomePage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'garage', element: <GaragePage /> },
      { path: 'properties', element: <PropertiesPage /> },
      { path: 'subscriptions', element: <SubscriptionsPage /> },
      { path: 'chores', element: <ChoresPage /> },
    ],
  },
])
