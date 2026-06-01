import { get } from './api';
import type { Load } from './loads';

export const matchesApi = {
  find: (from_city: string, to_city: string, exclude_load_id?: number) =>
    get<{ success: boolean; data: Load[] }>('/matches', {
      from_city,
      to_city,
      ...(exclude_load_id ? { exclude_load_id: String(exclude_load_id) } : {}),
    }),
};
