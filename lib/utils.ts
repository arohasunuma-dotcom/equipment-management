import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'yyyy年M月d日(E)', { locale: ja })
}

export function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), 'M/d', { locale: ja })
}

export function formatDateTime(dateStr: string): string {
  return format(parseISO(dateStr), 'yyyy年M月d日 HH:mm', { locale: ja })
}

export function today(): string {
  return new Date().toISOString().split('T')[0]
}

export function periodsOverlap(
  start1: string, end1: string,
  start2: string, end2: string
): boolean {
  return start2 <= end1 && end2 >= start1
}
