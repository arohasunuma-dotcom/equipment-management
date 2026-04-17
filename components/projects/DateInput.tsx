import { cn } from '@/lib/utils'

interface DateInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  disabled?: boolean
  min?: string
  max?: string
  className?: string
}

export function DateInput({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  min,
  max,
  className,
}: DateInputProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        className={cn(
          'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm',
          'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
          'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
        )}
      />
    </div>
  )
}
