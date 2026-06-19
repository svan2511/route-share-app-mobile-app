import { get, post, put, del, patch } from './api';

export interface Load {
  id: number;
  user?: {
    id: number;
    full_name: string;
    business_name: string;
    city: string;
    phone: string;
  };
  route?: {
    id: number;
    route_name: string;
    from_city: string;
    to_city: string;
    destination_offset_minutes?: number;
    stops: Array<{
      id: number;
      stop_name: string;
      stop_order: number;
      time_offset_minutes: number;
    }>;
  };
  from_city: string;
  to_city: string;
  vehicle_type: string;
  available_space: number;
  departure_date: string;
  departure_time: string;
  estimated_pickup_date?: string;
  estimated_pickup_time?: string;
  notes?: string;
  phone: string;
  status: string;
  destination_stop_id?: number;
  route_snapshot?: {
    id: number;
    route_id: number;
    route_name: string;
    from_city: string;
    to_city: string;
    destination_offset_minutes?: number;
    stops: Array<{
      id: number;
      stop_name: string;
      stop_order: number;
      time_offset_minutes: number;
    }>;
  };
  expires_at?: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export const loadsApi = {
  list: (params?: { from_city?: string; to_city?: string; vehicle_type?: string; per_page?: string; exclude_user_id?: string }) =>
    get<PaginatedResponse<Load>>('/loads', params),

  show: (id: number) =>
    get<{ success: boolean; data: Load; has_requested: boolean; has_rejected: boolean }>(`/loads/${id}`),

  create: (data: {
    from_city: string;
    to_city: string;
    vehicle_type: string;
    available_space: number;
    departure_date: string;
    departure_time: string;
    notes?: string;
    phone: string;
    route_id?: number;
    destination_stop_id?: number;
  }) => post<{ success: boolean; message: string; data: Load }>('/loads', data),

  update: (id: number, data: {
    from_city: string;
    to_city: string;
    vehicle_type: string;
    available_space: number;
    departure_date: string;
    departure_time: string;
    notes?: string;
    phone: string;
    route_id?: number;
    destination_stop_id?: number;
  }) => put<{ success: boolean; message: string; data: Load }>(`/loads/${id}`, data),

  delete: (id: number) =>
    del<{ success: boolean; message: string }>(`/loads/${id}`),

  complete: (id: number) =>
    patch<{ success: boolean; message: string; data: Load }>(`/loads/${id}/complete`),

  cancel: (id: number) =>
    patch<{ success: boolean; message: string }>(`/loads/${id}/cancel`),

  myLoads: () =>
    get<{ success: boolean; data: { active: Load[]; completed: Load[]; expired: Load[] } }>('/my-loads'),
};
