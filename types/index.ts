export type UserRole = 'user' | 'admin'

export type RentalStatus = 'reserved' | 'renting' | 'returned' | 'cancelled' | 'overdue'

export type EquipmentCurrentStatus = 'available' | 'reserved' | 'renting' | 'overdue' | 'inactive'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  created_at: string
}

export interface Equipment {
  id: string
  category_id: string
  name: string
  serial_number: string | null
  notes: string | null
  image_url: string | null
  is_active: boolean
  created_at: string
  category?: Category
  current_status?: EquipmentCurrentStatus
}

export interface BookedPeriod {
  start_date: string
  end_date: string
  status: RentalStatus
  user_name?: string
  purpose?: string
}

export interface Rental {
  id: string
  user_id: string
  equipment_id: string
  start_date: string
  end_date: string
  purpose: string
  status: RentalStatus
  notes: string | null
  created_at: string
  user?: Pick<User, 'id' | 'name' | 'email'>
  equipment?: Pick<Equipment, 'id' | 'name' | 'image_url'> & { category?: Category }
  return_record?: ReturnRecord | null
}

export interface ReturnRecord {
  id: string
  rental_id: string
  returned_at: string
  notes: string | null
}

export interface ApiResponse<T> {
  data: T | null
  error: { code: string; message: string; conflicting_period?: { start_date: string; end_date: string } } | null
}
