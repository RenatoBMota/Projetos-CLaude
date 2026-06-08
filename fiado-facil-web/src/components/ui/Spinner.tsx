import { cn } from '@/utils'

interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; className?: string }

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-gray-200 border-t-primary-600',
        { 'h-4 w-4': size === 'sm', 'h-6 w-6': size === 'md', 'h-10 w-10': size === 'lg' },
        className,
      )}
    />
  )
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  )
}
