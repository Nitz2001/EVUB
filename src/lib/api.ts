import axios from 'axios';
import type { AuthResponse, Event } from '../types';

const api = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const auth = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/login', { email, pwd: password });
    return response.data;
  },
  
  register: async (userData: {
    email: string;
    pwd: string;
    isAdmin: boolean;
    clubName?: string;
    clubLogo?: File;
  }): Promise<AuthResponse> => {
    const formData = new FormData();
    Object.entries(userData).forEach(([key, value]) => {
        if (value !== undefined) {
          if (typeof value === 'boolean') {
            formData.append(key, value.toString()); // Convert boolean to string
          } else if (value instanceof File) {
            formData.append(key, value); // Keep File as is
          } else {
            formData.append(key, value as string); // Assume it's a string
          }
        }
    });
    
    const response = await api.post<AuthResponse>('/register', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export const events = {
  getFiltered: async (filters: {
    clubName?: string;
    eventDate?: string;
    venueName?: string;
    startTime?: string;
    endTime?: string;
  }): Promise<Event[]> => {
    const response = await api.get<{ events: Event[] }>('/events/filter', {
      params: filters,
    });
    return response.data.events;
  },
  
  addEvent: async (eventData: Omit<Event, 'eventID'>): Promise<Event> => {
    const response = await api.post<Event>('/events/add', eventData);
    return response.data;
  },
  
  deleteEvent: async (eventID: string): Promise<void> => {
    await api.delete(`/events/${eventID}`);
  },
};