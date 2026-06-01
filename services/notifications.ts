import { get, post, del, patch, put } from './api';

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  load_id: number | null;
  booking_id: number | null;
  is_read: boolean;
  created_at: string;
  from_user: {
    id: number;
    full_name: string;
    business_name: string;
  } | null;
}

export const notificationsApi = {
  registerPushToken: (token: string, device: string) =>
    post('/push-tokens', { token, device }),

  unregisterPushToken: () =>
    del('/push-tokens'),

  list: () =>
    get<{ data: AppNotification[] }>('/notifications'),

  unreadCount: () =>
    get<{ data: { count: number } }>('/notifications/unread'),

  markRead: (id: number) =>
    patch(`/notifications/${id}/read`),

  markAllRead: () =>
    put('/notifications/read-all', {}),
};
