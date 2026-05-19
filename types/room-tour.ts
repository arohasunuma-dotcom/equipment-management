export interface RoomTourModel {
  id: string
  name: string
  company_name: string
  prefecture_code: number
  address: string | null
  description: string | null
  thumbnail_url: string | null
  created_at: string
  updated_at: string
  media?: RoomTourMedia[]
  media_count?: number
}

export interface RoomTourMedia {
  id: string
  model_id: string
  url: string
  order_index: number
  created_at: string
}
