interface BarItem {
  label: string
  value: number
  color?: string
}

interface HorizontalBarsProps {
  items: BarItem[]
  maxValue?: number
  formatValue?: (v: number) => string
  showPercent?: boolean
}

const DEFAULT_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500',
  'bg-red-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500',
  'bg-orange-500', 'bg-cyan-500',
]

export function HorizontalBars({ items, maxValue, formatValue, showPercent }: HorizontalBarsProps) {
  const total = items.reduce((s, i) => s + i.value, 0)
  const max = maxValue ?? Math.max(...items.map(i => i.value), 1)

  if (items.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>
  }

  return (
    <div className="space-y-2.5">
      {items.map((item, idx) => {
        const pct = (item.value / max) * 100
        const pctOfTotal = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
        const color = item.color ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length]
        return (
          <div key={item.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-700 font-medium truncate max-w-[60%]">{item.label}</span>
              <span className="text-gray-500 ml-2 shrink-0">
                {formatValue ? formatValue(item.value) : item.value}
                {showPercent && total > 0 && <span className="text-gray-400 ml-1">({pctOfTotal}%)</span>}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${color}`}
                style={{ width: `${Math.max(pct, item.value > 0 ? 2 : 0)}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
