import axios from 'axios';
import { Plant, PlantEvent, PlantPhoto, Tag, EventType } from '../types';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Plants API
export const plantsAPI = {
  getAll: () => api.get<Plant[]>('/plants'),
  getById: (id: number) => api.get<Plant>(`/plants/${id}`),
  create: (plant: Plant) => api.post<Plant>('/plants', plant),
  update: (id: number, plant: Plant) => api.put<Plant>(`/plants/${id}`, plant),
  delete: (id: number) => api.delete(`/plants/${id}`),
};

// Events API
export const eventsAPI = {
  getByPlantId: (plantId: number, eventType?: string) => {
    const params = eventType ? { eventType } : {};
    return api.get<PlantEvent[]>(`/events/plant/${plantId}`, { params });
  },
  create: (event: PlantEvent) => api.post<PlantEvent>('/events', event),
  update: (id: number, event: PlantEvent) => api.put<PlantEvent>(`/events/${id}`, event),
  delete: (id: number) => api.delete(`/events/${id}`),
};

// Photos API
export const photosAPI = {
  getByPlantId: (plantId: number) => api.get<PlantPhoto[]>(`/photos/plant/${plantId}`),
  create: (photo: PlantPhoto) => api.post<PlantPhoto>('/photos', photo),
  update: (id: number, photo: Partial<PlantPhoto>) => api.put<PlantPhoto>(`/photos/${id}`, photo),
  delete: (id: number) => api.delete(`/photos/${id}`),
};

// Upload API
export const uploadAPI = {
  single: (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return api.post<{ filename: string; path: string; size: number; takenAt?: string }>('/upload/single', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  multiple: (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('photos', file));
    return api.post<Array<{ filename: string; path: string; size: number; takenAt?: string }>>('/upload/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Tags API
export const tagsAPI = {
  getAll: (type?: string) => {
    const params = type ? { type } : {};
    return api.get<Tag[]>('/tags', { params });
  },
  create: (tag: Tag) => api.post<Tag>('/tags', tag),
  delete: (id: number) => api.delete(`/tags/${id}`),
};

// Event Types API
export const eventTypesAPI = {
  getAll: () => api.get<EventType[]>('/event-types'),
  create: (eventType: EventType) => api.post<EventType>('/event-types', eventType),
  delete: (id: number) => api.delete(`/event-types/${id}`),
};

export default api;
