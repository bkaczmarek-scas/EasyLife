import { useState } from 'react'
import { IconCheck, IconDownload, IconChevronLeft, IconChevronRight, IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Select } from '../../components/ui/Select'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/Toast'
import { useFetchWorklogs, type WorklogsResponse } from '../../api/resources/worklogs'
import { useGenerateProtocols, type GenerateProtocolsResult } from '../../api/resources/protocolsHistory'
import { ApiError } from '../../api/client'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function downloadBase64(filename: string, base64: string) {
  const byteChars = atob(base64)
  const bytes = new Uint8Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function StepMarker({ n, state }: { n: number; state: 'done' | 'active' | 'pending' }) {
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
        state === 'done'
          ? 'bg-green-100 text-green-700'
          : state === 'active'
            ? 'bg-primary text-primary-contrast'
            : 'bg-canvas text-text-muted'
      }`}
    >
      {state === 'done' ? <IconCheck size={16} /> : n}
    </div>
  )
}

export function InvoicingContent() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [worklogs, setWorklogs] = useState<WorklogsResponse | null>(null)
  const [generated, setGenerated] = useState<GenerateProtocolsResult | null>(null)
  const [conflictConfirm, setConflictConfirm] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

  const fetchWorklogs = useFetchWorklogs()
  const generateProtocols = useGenerateProtocols()
  const toast = useToast()

  async function handleFetch() {
    try {
      const result = await fetchWorklogs.mutateAsync({ month, year })
      setWorklogs(result)
      setStep(2)
    } catch {
      toast.show('Failed to fetch worklogs', 'error')
    }
  }

  async function handleGenerate(force = false) {
    if (!worklogs) return
    try {
      const result = await generateProtocols.mutateAsync({
        month,
        year,
        projects: worklogs.projects,
        totalHours: worklogs.totalHours,
        force,
      })
      setGenerated(result)
      setStep(3)
      setConflictConfirm(false)
      toast.show('Documents generated')
    } catch (err) {
      if (err instanceof ApiError && err.body && typeof err.body === 'object' && (err.body as { code?: string }).code === 'ALREADY_GENERATED') {
        setConflictConfirm(true)
        return
      }
      toast.show('Failed to generate documents', 'error')
    }
  }

  return (
    <div className="mt-6">
      <Card className="flex items-center gap-6 !flex-row overflow-x-auto">
        <div className="flex items-center gap-2">
          <StepMarker n={1} state={step > 1 ? 'done' : 'active'} />
          <span className={step === 1 ? 'font-semibold text-text-primary' : 'text-text-secondary'}>Choose Period</span>
        </div>
        <div className="h-px w-8 bg-border" />
        <div className="flex items-center gap-2">
          <StepMarker n={2} state={step > 2 ? 'done' : step === 2 ? 'active' : 'pending'} />
          <span className={step === 2 ? 'font-semibold text-text-primary' : 'text-text-secondary'}>Fetch Worklogs</span>
        </div>
        <div className="h-px w-8 bg-border" />
        <div className="flex items-center gap-2">
          <StepMarker n={3} state={step === 3 ? 'active' : 'pending'} />
          <span className={step === 3 ? 'font-semibold text-text-primary' : 'text-text-secondary'}>Generate Documents</span>
        </div>
      </Card>

      <Card className="mt-4">
        <p className="mb-3 text-xs font-semibold uppercase text-text-muted">Billing Period</p>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setMonth((m) => (m === 1 ? 12 : m - 1))} className="rounded-md p-1.5 hover:bg-canvas">
            <IconChevronLeft size={16} />
          </button>
          <Select value={String(month)} onChange={(v) => setMonth(Number(v))} className="w-36" options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} />
          <Select value={String(year)} onChange={(v) => setYear(Number(v))} className="w-28" options={Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - 2 + i)).map((y) => ({ value: y, label: y }))} />
          <button type="button" onClick={() => setMonth((m) => (m === 12 ? 1 : m + 1))} className="rounded-md p-1.5 hover:bg-canvas">
            <IconChevronRight size={16} />
          </button>
          <Button disabled={fetchWorklogs.isPending} onClick={handleFetch} className="ml-auto">
            {fetchWorklogs.isPending ? 'Fetching…' : 'Fetch Worklogs'}
          </Button>
        </div>
      </Card>

      {worklogs && (
        <Card className="mt-4 !p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-semibold text-text-primary">Imported Worklogs</p>
            <Button variant="secondary" disabled={fetchWorklogs.isPending} onClick={handleFetch}>
              Re-fetch Logs
            </Button>
          </div>
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-border text-xs font-semibold uppercase text-text-muted">
                <th className="px-4 py-2">Project</th>
                <th className="py-2 pr-4 text-right">Total Hours</th>
              </tr>
            </thead>
            <tbody>
              {worklogs.projects.map((p) => {
                const isOpen = expandedProjects.has(p.name)
                return (
                  <>
                    <tr
                      key={p.name}
                      className="cursor-pointer border-b border-border hover:bg-canvas"
                      onClick={() =>
                        setExpandedProjects((prev) => {
                          const next = new Set(prev)
                          if (next.has(p.name)) next.delete(p.name)
                          else next.add(p.name)
                          return next
                        })
                      }
                    >
                      <td className="px-4 py-3 font-semibold text-text-primary">
                        <span className="mr-1 inline-flex align-middle text-text-muted">
                          {isOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                        </span>
                        {p.name}
                      </td>
                      <td className="py-3 pr-4 text-right text-text-secondary">{p.hours}h</td>
                    </tr>
                    {isOpen &&
                      p.items.map((item) => (
                        <tr key={item.key} className="border-b border-border bg-canvas/50 text-xs">
                          <td className="px-4 py-2 pl-10 text-text-secondary">
                            {item.key}: {item.summary}
                          </td>
                          <td className="py-2 pr-4 text-right text-text-muted">{item.hours}h</td>
                        </tr>
                      ))}
                  </>
                )
              })}
              <tr className="bg-canvas font-semibold text-text-primary">
                <td className="px-4 py-3">Grand Total</td>
                <td className="py-3 pr-4 text-right">{worklogs.totalHours}h</td>
              </tr>
            </tbody>
          </table>
          <div className="flex justify-end p-4">
            <Button disabled={generateProtocols.isPending} onClick={() => handleGenerate(false)}>
              {generateProtocols.isPending ? 'Generating…' : 'Save & Generate Documents'}
            </Button>
          </div>
        </Card>
      )}

      {generated && (
        <Card className="mt-4">
          <p className="mb-3 font-semibold text-text-primary">Generated PDF Documents</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold text-text-primary">{generated.zamowienie.filename}</p>
              <Button variant="secondary" className="mt-2" onClick={() => downloadBase64(generated.zamowienie.filename, generated.zamowienie.base64)}>
                <IconDownload size={14} /> Download
              </Button>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold text-text-primary">{generated.odbiorczy.filename}</p>
              <Button variant="secondary" className="mt-2" onClick={() => downloadBase64(generated.odbiorczy.filename, generated.odbiorczy.base64)}>
                <IconDownload size={14} /> Download
              </Button>
            </div>
          </div>

          <div className="mt-6 rounded-md border border-border bg-canvas p-4">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-text-primary">iFirma Accountancy API Sync</p>
              <span className="rounded-full bg-warning-bg px-2 py-0.5 text-[11px] font-bold text-warning-text">COMING SOON</span>
            </div>
            <p className="mt-1 text-sm text-text-secondary">Automatically issue and catalog invoices directly into the official Polish accounting system.</p>
            <p className="mt-3 text-xs text-text-muted">Connection Status: <span className="font-semibold">Unconfigured &amp; Inactive</span></p>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={conflictConfirm}
        onOpenChange={setConflictConfirm}
        title="Protocols already generated"
        description={`Documents for ${MONTHS[month - 1]} ${year} were already generated. Regenerating will overwrite them and reset export status.`}
        confirmLabel="Regenerate Anyway"
        onConfirm={() => handleGenerate(true)}
        pending={generateProtocols.isPending}
      />
    </div>
  )
}
