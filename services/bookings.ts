import { get, post, put } from './api';

export interface BookingRequest {
  id: number;
  load_id: number;
  user_id: number;
  owner_id: number;
  pickup_city: string;
  drop_city: string;
  pickup_offset_minutes: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
  goods_description?: string;
  load?: any;
  user?: any;
  owner?: any;
  created_at: string;
}

export const bookingsApi = {
  create: (data: { load_id: number; pickup_city: string; drop_city: string; pickup_offset_minutes: number; goods_description?: string }) =>
    post<{ success: boolean; message: string; data: BookingRequest }>('/bookings', data),

  myRequests: () =>
    get<{ success: boolean; data: BookingRequest[] }>('/bookings/my-requests'),

  received: () =>
    get<{ success: boolean; data: BookingRequest[] }>('/bookings/received'),

  accept: (id: number) =>
    put<{ success: boolean; message: string; data?: BookingRequest }>(`/bookings/${id}/accept`, {}),

  reject: (id: number) =>
    put<{ success: boolean; message: string }>(`/bookings/${id}/reject`, {}),

  cancel: (id: number) =>
    put<{ success: boolean; message: string }>(`/bookings/${id}/cancel`, {}),
};
