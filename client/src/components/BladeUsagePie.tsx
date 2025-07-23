import { Pie } from "react-chartjs-2"
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js"
import ChartDataLabels from "chartjs-plugin-datalabels"
import { useMemo } from "react"

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels)

const COLORS = [
  "#4F46E5", "#DC2626", "#F59E0B", "#10B981",
  "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"
]

export default function BladeUsagePie({ players }: { players: any[] }) {
  if (!players || players.length === 0) return null

  const bladeCounts: Record<string, number> = {}

  players.forEach(player => {
    player.combos.forEach((combo: any) => {
      const blade = combo.blade
      if (!blade) return
      bladeCounts[blade] = (bladeCounts[blade] || 0) + 1
    })
  })

  const labels = Object.keys(bladeCounts)
  const values = Object.values(bladeCounts)
  const total = values.reduce((sum, val) => sum + val, 0)

  const sorted = useMemo(() => {
    return labels
      .map((label, idx) => ({
        label,
        count: bladeCounts[label],
        percentage: ((bladeCounts[label] / total) * 100).toFixed(1),
        color: COLORS[idx % COLORS.length],
      }))
      .sort((a, b) => b.count - a.count)
  }, [bladeCounts, total])

  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: COLORS.slice(0, values.length),
      },
    ],
  }

  const options = {
    plugins: {
      datalabels: {
        color: "#fff",
        font: { weight: "bold" as const, size: 12 },
        formatter: (value: number) => `${value}`,
      },
      legend: {
        display: false,
      },
    },
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 justify-center items-start mt-4">
      {/* Pie Chart */}
      <div className="w-full max-w-sm">
        <Pie data={data} options={options} />
      </div>

      {/* Ranked Legend */}
      <div className="text-sm space-y-2 mt-4 md:mt-0">
        {sorted.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span
              className="inline-block w-4 h-4 rounded"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-medium">{item.label}</span>
            <span className="ml-auto">{item.count} ({item.percentage}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}
