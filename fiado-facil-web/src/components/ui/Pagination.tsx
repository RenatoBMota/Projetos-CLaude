import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils'

interface PaginationProps {
  page: number
  lastPage: number
  total: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, lastPage, total, onPageChange }: PaginationProps) {
  if (lastPage <= 1) return null
  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-sm text-gray-500">{total} registros</p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: Math.min(lastPage, 5) }, (_, i) => i + 1).map(p => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={cn(
              'w-8 h-8 rounded-lg text-sm font-medium',
              p === page ? 'bg-primary-600 text-white' : 'hover:bg-gray-100 text-gray-700',
            )}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === lastPage}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
