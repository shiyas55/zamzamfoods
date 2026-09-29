import { apiClient } from './apiClient';

export interface SystemSettings {
  id?: string;
  business_name: string;
  phone_number: string;
  gst_number: string;
  email: string;
  address: string;
  upi_id: string;
  invoice_footer_notes: string;
  is_whatsapp_enabled: boolean;
  is_self_order_enabled: boolean;
  is_maintenance_mode?: boolean;
  maintenance_message?: string;
  whatsapp_is_locked?: boolean;
  whatsapp_plan_name?: string;
  whatsapp_plan_expires_at?: string | null;
  whatsapp_license_key?: string;
  created_at?: string;
  updated_at?: string;
}

export const settingsService = {
  async getSettings(): Promise<SystemSettings> {
    return apiClient.get<SystemSettings>('/settings/');
  },

  async updateSettings(payload: Partial<SystemSettings>): Promise<SystemSettings> {
    return apiClient.patch<SystemSettings>('/settings/', payload);
  },
};
