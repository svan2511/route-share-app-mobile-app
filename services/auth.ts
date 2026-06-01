import { post } from './api';

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
  };
}

export interface User {
  id: number;
  full_name: string;
  business_name: string;
  phone: string;
  city: string;
  address?: string;
  market_type: string;
  loads_count?: number;
  created_at: string;
}

export const authApi = {
  sendOtp: (phone: string) =>
    post<{ success: boolean; message: string }>('/send-otp', { phone }),

  verifyOtp: (data: { phone: string; otp: string }) =>
    post<AuthResponse>('/verify-otp', data),

  register: (data: { phone: string }) =>
    post<{ success: boolean; message: string }>('/register', data),

  logout: () => post<{ success: boolean; message: string }>('/logout'),
};
