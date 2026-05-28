interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'slate'
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
}

const colorMap = {
  blue:   'bg-blue-50 border-blue-200 text-blue-700',
  green:  'bg-green-50 border-green-200 text-green-700',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  red:    'bg-red-50 border-red-200 text-red-700',
  purple: 'bg-purple-50 border-purple-200 text-purple-700',
  slate:  'bg-slate-50 border-slate-200 text-slate-700',
}

const iconBg = {
  blue:   'bg-blue-100 text-blue-600',
  green:  'bg-green-100 text-green-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  red:    'bg-red-100 text-red-600',
  purple: 'bg-purple-100 text-purple-600',
  slate:  'bg-slate-100 text-slate-600',
}

export function KpiCard({ label, value, sub, color = 'blue', icon, trend }: KpiCardProps) {
  return (
    <div className={`card border ${colorMap[color]} flex items-start gap-4`}>
      {icon && (
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg[color]}`}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
        <div className="flex items-end gap-2 mt-0.5">
          <span className="text-3xl font-bold leading-none">{value}</span>
          {trend && (
            <span className={`text-xs font-medium mb-0.5 ${
              trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-400'
            }`}>
              {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '–'}
            </span>
          )}
        </div>
        {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
      </div>
    </div>
  )
}
