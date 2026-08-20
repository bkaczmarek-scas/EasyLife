import { useState } from 'react'
import { Tabs } from '../../components/ui/Tabs'
import { InvoicingContent } from '../invoicing/InvoicingContent'
import { HistoryContent } from '../history/HistoryContent'

type TabValue = 'invoicing' | 'history'

export function InvoicingHistoryPage() {
  const [tab, setTab] = useState<TabValue>('invoicing')

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Invoicing</h1>
      <p className="mt-1 text-sm text-text-secondary">Generate billing protocols and review previously issued documents.</p>

      <div className="mt-6">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'invoicing', label: 'Invoicing' },
            { value: 'history', label: 'History' },
          ]}
        />
      </div>

      {tab === 'invoicing' && <InvoicingContent />}
      {tab === 'history' && <HistoryContent />}
    </div>
  )
}
