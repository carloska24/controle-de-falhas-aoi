import type { Requisicao } from '@/types';
import { reportDay } from './falhasReport';

export interface WarehouseFilters {
  search: string;
  om: string;
  status: string;
  day: string;
}

export function validWarehouseDay(day: string): boolean {
  return !day || (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(day)
    && reportDay(day + 'T12:00:00Z') === day);
}

export function filterWarehouseRequests(requests: Requisicao[], filters: WarehouseFilters) {
  if (!validWarehouseDay(filters.day)) return [];
  const search = filters.search.trim().toLowerCase();
  return requests.filter(request => {
    if (search && ![String(request.id), request.om, request.created_by]
      .some(value => value?.toLowerCase().includes(search))) return false;
    if (filters.om !== 'all' && request.om !== filters.om) return false;
    if (filters.status !== 'all' && request.status !== filters.status) return false;
    if (filters.day && (typeof request.created_at !== 'string' || !request.created_at.trim()
      || reportDay(request.created_at) !== filters.day)) return false;
    return true;
  });
}
