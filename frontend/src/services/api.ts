import axios from 'axios';
import { Plant, PlantEvent, PlantPhoto, Tag, EventType } from '../types';
import { getAccessToken, refreshAccessToken } from './authService';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 403 (forbidden) and we haven't tried to refresh yet
    if (error.response?.status === 403 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshAccessToken();
        
        if (newAccessToken) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // If error is 401 (unauthorized), redirect to login
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

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
  single: (file: File, plantName: string) => {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('plantName', plantName);
    return api.post<{ filename: string; path: string; size: number; takenAt?: string }>('/upload/single', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  multiple: (files: File[], plantName: string) => {
    const formData = new FormData();
    files.forEach(file => formData.append('photos', file));
    formData.append('plantName', plantName);
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

// CSV Import API
export const csvImportAPI = {
  import: (file: File, clearExisting: boolean = false) => {
    const formData = new FormData();
    formData.append('csv', file);
    formData.append('clearExisting', clearExisting.toString());
    return api.post<{
      success: boolean;
      message: string;
      stats: { total: number; success: number; errors: number };
      errors?: string[];
    }>('/csv/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
