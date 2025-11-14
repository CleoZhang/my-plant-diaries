export interface Plant {
  id?: number;
  name: string;
  price?: number;
  delivery_fee?: number;
  purchased_from?: string;
  purchased_when?: string;
  received_when?: string;
  status?: 'Alive' | 'Dead' | 'Binned' | 'GaveAway';
  profile_photo?: string;
  created_at?: string;
  updated_at?: string;
  last_watered?: string;
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

export type ViewMode = 'list' | 'card';
export type SortField = 'name' | 'purchased_when' | 'received_when' | 'last_watered';
export type SortOrder = 'asc' | 'desc';
