import { Bar } from 'react-chartjs-2'
import '../../lib/chartSetup'
import { chartColors } from '../../lib/chartSetup'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function HoursChart({ capacity, logged }: { capacity: number[]; logged: number[] }) {
  return (
    <Bar
      data={{
        labels: MONTH_NAMES,
        datasets: [
          { label: 'Working hours', data: capacity, backgroundColor: '#94a3b8', borderRadius: 3, maxBarThickness: 18 },
          { label: 'Logged hours', data: logged, backgroundColor: chartColors.primary, borderRadius: 3, maxBarThickness: 18 },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top', align: 'start', labels: { boxWidth: 10, color: chartColors.tick, font: { size: 12 } } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: chartColors.tick, font: { size: 11 } } },
          y: { grid: { color: chartColors.grid }, ticks: { color: chartColors.tick, font: { size: 11 } } },
        },
      }}
    />
  )
}
