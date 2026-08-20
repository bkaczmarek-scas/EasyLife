// Builds a ';'-separated CSV with a decimal comma and a UTF-8 BOM, matching the format the
// existing app's yearly income export already uses for Polish Excel (accounting handoff).
export function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const formatCell = (cell: string | number) => {
    if (typeof cell === 'number') return cell.toFixed(2).replace('.', ',')
    return /[;"\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell
  }
  const csv = rows.map((row) => row.map(formatCell).join(';')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
