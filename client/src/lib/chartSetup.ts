import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend)

export const chartColors = {
  primary: '#0369a1',
  primaryTint: 'rgba(3, 105, 161, 0.12)',
  grid: '#e2e8f0',
  tick: '#64748b',
}
