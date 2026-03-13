export type UserRole = 'user' | 'admin'
export type RentalStatus = 'active' | 'overdue' | 'completed' | 'cancelled'
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
  category_name?: string
}

export interface RentalEquipment {
  equipment_id: string
  equipment?: Equipment
}

export interface Rental {
  id: string
  user_id: string | null
  renter_name: string | null
  equipment_id?: string | null
  shooting_date: string | null
  start_date: string
  end_date: string
  purpose: string
  return_location: string | null
  status: RentalStatus
  notes: string | null
  created_at: string
  rental_equipment?: RentalEquipment[]
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
