import { get, post, put, del } from './api';

export interface RouteStop {
  id: number;
  stop_name: string;
  stop_order: number;
  time_offset_minutes?: number;
}

export interface Route {
  id: number;
  route_name: string;
  from_city: string;
  to_city: string;
  destination_offset_minutes?: number;
  stops: RouteStop[];
}

export interface StopInput {
  stop_name: string;
  duration_minutes: number;
}

export interface RouteCreateInput {
  route_name: string;
  from_city: string;
  to_city: string;
  stops: StopInput[];
  destination_offset_minutes?: number;
}

export const routesApi = {
  list: (params?: { from_city?: string; to_city?: string }) =>
    get<{ success: boolean; data: Route[] }>('/routes', params as Record<string, string>),

  cities: () =>
    get<{ success: boolean; data: string[] }>('/cities'),

  searchCities: (q: string) =>
    get<{ success: boolean; data: string[] }>('/cities/search', { q }),

  myRoutes: () =>
    get<{ success: boolean; data: Route[] }>('/my-routes'),

  create: (data: RouteCreateInput) =>
    post<{ success: boolean; message: string; data: Route }>('/my-routes', data),

  show: (id: number) =>
    get<{ success: boolean; data: Route }>(`/my-routes/${id}`),

  update: (id: number, data: RouteCreateInput) =>
    put<{ success: boolean; message: string; data: Route }>(`/my-routes/${id}`, data),

  delete: (id: number) =>
    del<{ success: boolean; message: string }>(`/my-routes/${id}`),
};
