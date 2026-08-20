import { useRef, useState } from 'react'
import { IconUpload, IconFileText, IconTrash, IconDownload } from '@tabler/icons-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Select } from '../../components/ui/Select'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../components/ui/Toast'
import {
  useProtocolsHistory,
  useDownloadProtocolFile,
  useDownloadManualFile,
  useUploadManualFile,
  useDeleteHistoryEntry,
  type ProtocolHistoryEntry,
} from '../../api/resources/protocolsHistory'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function HistoryContent() {
  const { data: history, isLoading } = useProtocolsHistory()
  const downloadProtocolFile = useDownloadProtocolFile()
  const downloadManualFile = useDownloadManualFile()
  const uploadFile = useUploadManualFile()
  const deleteEntry = useDeleteHistoryEntry()
  const toast = useToast()

  const now = new Date()
  const [month, setMonth] = useState(String(now.getMonth() + 1))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [deleting, setDeleting] = useState<ProtocolHistoryEntry | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleUpload() {
    if (!selectedFile) return
    try {
      const base64 = await fileToBase64(selectedFile)
      await uploadFile.mutateAsync({ month: Number(month), year: Number(year), filename: selectedFile.name, base64 })
      toast.show('File uploaded')
      setSelectedFile(null)
    } catch {
      toast.show('Failed to upload file', 'error')
    }
  }

  async function handleDelete() {
    if (!deleting) return
    try {
      await deleteEntry.mutateAsync(deleting.id)
      toast.show('Entry deleted')
      setDeleting(null)
    } catch {
      toast.show('Failed to delete entry', 'error')
    }
  }

  return (
    <div className="mt-6">
      <Card>
        <p className="mb-4 font-semibold text-text-primary">Upload New Protocol / Invoice</p>
        <div className="flex gap-3">
          <Select
            value={month}
            onChange={setMonth}
            className="w-40"
            options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
          />
          <Select
            value={year}
            onChange={setYear}
            className="w-28"
            options={Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - 2 + i)).map((y) => ({ value: y, label: y }))}
          />
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file) setSelectedFile(file)
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed py-10 text-center ${
            dragOver ? 'border-primary bg-primary/5' : 'border-border'
          }`}
        >
          <IconUpload size={28} className="text-primary" />
          <p className="text-sm font-semibold text-primary">Drag &amp; drop a PDF here, or click to choose a file</p>
          <p className="text-xs text-text-muted">Supports PDF up to 15MB</p>
          {selectedFile && <p className="text-sm font-semibold text-text-primary">Selected: {selectedFile.name}</p>}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <Button className="mt-4" disabled={!selectedFile || uploadFile.isPending} onClick={handleUpload}>
          {uploadFile.isPending ? 'Uploading…' : 'Upload'}
        </Button>
      </Card>

      <Card className="mt-6 !p-0">
        <p className="border-b border-border px-4 py-3 font-semibold text-text-primary">Historical Protocols &amp; Billing Files Registry</p>
        {isLoading ? (
          <p className="p-4 text-sm text-text-secondary">Loading…</p>
        ) : !history || history.length === 0 ? (
          <p className="p-4 text-sm text-text-secondary">No issued protocols yet.</p>
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-border text-xs font-semibold uppercase text-text-muted">
                <th className="px-4 py-2">Period</th>
                <th className="py-2">Order #</th>
                <th className="py-2">Hours</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Files</th>
                <th className="py-2">Status</th>
                <th className="w-10 py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr key={entry.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-semibold text-text-primary">
                    {MONTHS[entry.month - 1]} {entry.year}
                  </td>
                  <td className="py-3 text-text-secondary">{entry.orderNumber ?? '—'}</td>
                  <td className="py-3 text-text-secondary">{entry.totalHours ?? '—'}</td>
                  <td className="py-3 text-text-secondary">{entry.amount != null ? `${entry.amount.toFixed(2)} PLN` : '—'}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {entry.files.zamowienie && (
                        <button
                          type="button"
                          onClick={() => downloadProtocolFile.mutate({ id: entry.id, kind: 'zamowienie' })}
                          className="flex items-center gap-1 text-xs font-semibold text-primary"
                        >
                          <IconFileText size={14} /> Order
                        </button>
                      )}
                      {entry.files.odbiorczy && (
                        <button
                          type="button"
                          onClick={() => downloadProtocolFile.mutate({ id: entry.id, kind: 'odbiorczy' })}
                          className="flex items-center gap-1 text-xs font-semibold text-primary"
                        >
                          <IconFileText size={14} /> Acceptance
                        </button>
                      )}
                      {entry.manualFiles.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => downloadManualFile.mutate({ id: entry.id, fileId: f.id })}
                          className="flex items-center gap-1 text-xs font-semibold text-text-secondary"
                          title={f.filename}
                        >
                          <IconDownload size={14} /> {f.filename.length > 16 ? f.filename.slice(0, 16) + '…' : f.filename}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="py-3">
                    {entry.exported ? <Badge tone="success">Exported</Badge> : <Badge tone="warning">Pending</Badge>}
                  </td>
                  <td className="py-3 pr-4">
                    <button
                      type="button"
                      aria-label="Delete"
                      onClick={() => setDeleting(entry)}
                      className="rounded-md p-1.5 text-text-muted hover:bg-danger-bg hover:text-danger-text"
                    >
                      <IconTrash size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete history entry?"
        description={deleting ? `All files for ${MONTHS[deleting.month - 1]} ${deleting.year} will be permanently removed.` : undefined}
        onConfirm={handleDelete}
        pending={deleteEntry.isPending}
      />
    </div>
  )
}
