import { get, post, putFormData } from './api';
import type { User } from './auth';

export const profileApi = {
  get: () =>
    get<{ success: boolean; data: User }>('/profile'),

  update: (data: {
    full_name?: string;
    business_name?: string;
    city?: string;
    phone?: string;
    market_type?: string;
    business_logo?: string;
    address?: string;
  }) => post<{ success: boolean; message: string; data: User }>('/profile', data),
};
