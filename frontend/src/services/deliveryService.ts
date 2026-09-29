import { apiClient } from './apiClient';
import { Delivery } from '../types';

export const deliveryService = {
  async getDeliveries(params?: {
    route?: string;
    status?: string;
    date?: string;
  }): Promise<Delivery[]> {
    const data = await apiClient.get<{ results?: Delivery[] } | Delivery[]>('/deliveries/', params);
    return Array.isArray(data) ? data : data.results || [];
  },

  async getDelivery(id: string): Promise<Delivery> {
    return apiClient.get<Delivery>(`/deliveries/${id}/`);
  },

  async completeDelivery(id: string, payload: {
    recipient_name?: string;
    notes?: string;
  }): Promise<Delivery> {
    return apiClient.post<Delivery>(`/deliveries/${id}/complete/`, payload);
  },

  async markNotDelivered(id: string, payload: {
    failed_reason: string;
    notes?: string;
  }): Promise<Delivery> {
    return apiClient.post<Delivery>(`/deliveries/${id}/mark-not-delivered/`, payload);
  },

  async assignDriver(id: string, payload: {
    driver_id: string;
    allow_cross_route?: boolean;
    notes?: string;
  }): Promise<Delivery> {
    return apiClient.post<Delivery>(`/deliveries/${id}/assign-driver/`, payload);
  },
};

