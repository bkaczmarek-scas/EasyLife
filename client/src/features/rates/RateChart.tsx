import { Line } from 'react-chartjs-2'
import '../../lib/chartSetup'
import { chartColors } from '../../lib/chartSetup'
import type { Rate } from '../../api/resources/rates'

export function RateChart({ rates }: { rates: Rate[] }) {
  const sorted = [...rates].sort((a, b) => a.from.localeCompare(b.from))

  return (
    <Line
      data={{
        labels: sorted.map((r) => r.from),
        datasets: [
          {
            data: sorted.map((r) => r.rate),
            borderColor: chartColors.primary,
            backgroundColor: chartColors.primaryTint,
            pointBackgroundColor: chartColors.primary,
            pointRadius: 4,
            tension: 0.3,
            fill: true,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: chartColors.tick, font: { size: 11 } } },
          y: {
            grid: { color: chartColors.grid },
            ticks: { color: chartColors.tick, font: { size: 11 } },
            beginAtZero: false,
          },
        },
      }}
    />
  )
}
