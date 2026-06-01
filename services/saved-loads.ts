import { get, post } from './api';
import type { Load } from './loads';

export interface SavedLoad {
  id: number;
  load: Load;
  saved_at: string;
}

export const savedLoadsApi = {
  list: () =>
    get<{ success: boolean; data: SavedLoad[] }>('/saved-loads'),

  toggle: (loadId: number) =>
    post<{ success: boolean; message: string; data: { saved: boolean } }>(`/saved-loads/${loadId}`),
};
