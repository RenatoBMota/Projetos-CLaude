import React from 'react'
import { cn } from '@/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: { value: string; positive: boolean }
  color?: 'blue' | 'green' | 'red' | 'yellow'
  subtitle?: string
}

const colorMap = {
  blue:   { bg: 'bg-primary-50',  icon: 'bg-primary-100 text-primary-600' },
  green:  { bg: 'bg-green-50',    icon: 'bg-green-100 text-green-600' },
  red:    { bg: 'bg-red-50',      icon: 'bg-red-100 text-red-600' },
  yellow: { bg: 'bg-yellow-50',   icon: 'bg-yellow-100 text-yellow-600' },
}

export function StatCard({ title, value, icon, trend, color = 'blue', subtitle }: StatCardProps) {
  const colors = colorMap[color]
  return (
    <div className={cn('card flex items-start gap-4', colors.bg)}>
      <div className={cn('p-3 rounded-xl', colors.icon)}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        {trend && (
          <p className={cn('text-xs mt-1 font-medium', trend.positive ? 'text-green-600' : 'text-red-600')}>
            {trend.positive ? '▲' : '▼'} {trend.value}
          </p>
        )}
      </div>
    </div>
  )
}
