import { Line } from 'react-chartjs-2'
import type { Chart } from 'chart.js'
import '../../lib/chartSetup'
import { chartColors } from '../../lib/chartSetup'

const pointLabelPlugin = {
  id: 'mileagePointLabels',
  afterDatasetsDraw(chart: Chart<'line'>) {
    const { ctx } = chart
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex)
      meta.data.forEach((point, index) => {
        const value = dataset.data[index]
        if (value == null || typeof value !== 'number') return
        ctx.save()
        ctx.fillStyle = chartColors.primary
        ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(`${Math.round(value / 1000)}k`, point.x, point.y - 10)
        ctx.restore()
      })
    })
  },
}

export function MileageChart({ labels, values }: { labels: string[]; values: number[] }) {
  return (
    <Line
      data={{
        labels,
        datasets: [
          {
            data: values,
            borderColor: chartColors.primary,
            backgroundColor: chartColors.primaryTint,
            pointBackgroundColor: chartColors.primary,
            pointRadius: 4,
            tension: 0.3,
            fill: false,
          },
        ],
      }}
      plugins={[pointLabelPlugin]}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 20 } },
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: chartColors.tick, font: { size: 11 } } },
          y: {
            grid: { color: chartColors.grid },
            ticks: {
              color: chartColors.tick,
              font: { size: 11 },
              callback: (value) => `${Math.round(Number(value) / 1000)}k`,
            },
          },
        },
      }}
    />
  )
}
