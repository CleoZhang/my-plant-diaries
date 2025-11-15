export interface User {
  id?: number;
  email: string;
  password_hash?: string;
  display_name?: string;
  is_admin?: boolean;
  refresh_token?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Plant {
  id?: number;
  name: string;
  alias?: string;
  price?: number;
  delivery_fee?: number;
  purchased_from?: string;
  purchased_when?: string;
  received_when?: string;
  purchase_notes?: string;
  status?: 'Alive' | 'Dead' | 'Binned' | 'GaveAway';
  profile_photo?: string;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PlantEvent {
  id?: number;
  plant_id: number;
  event_type: string;
  event_date: string;
  notes?: string;
  created_at?: string;
}

export interface PlantPhoto {
  id?: number;
  plant_id: number;
  photo_path: string;
  caption?: string;
  taken_at?: string;
  created_at?: string;
}

export interface Tag {
  id?: number;
  tag_name: string;
  tag_type: 'purchased_from' | 'status' | 'other';
  created_at?: string;
}

export interface EventType {
  id?: number;
  name: string;
  emoji: string;
  is_custom?: boolean;
  created_at?: string;
}

export interface PlantWithLastWatered extends Plant {
  last_watered?: string;
}
