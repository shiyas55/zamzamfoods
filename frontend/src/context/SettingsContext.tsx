import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { settingsService, SystemSettings } from '../services/settingsService';

interface SettingsContextType {
  settings: SystemSettings | null;
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
  updateSettings: (payload: Partial<SystemSettings>) => Promise<SystemSettings>;
  isWhatsAppEnabled: boolean;
  isWhatsAppLocked: boolean;
  whatsappPlanName: string;
  whatsappPlanExpiresAt: string | null;
  whatsappLicenseKey: string;
  isSelfOrderEnabled: boolean;
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  businessName: string;
  businessPhone: string;
  gstNumber: string;
}

const defaultSettings: SystemSettings = {
  business_name: 'Zamzam Foods Wholesale',
  phone_number: '+91 98470 12345',
  gst_number: '',
  email: 'info@zamzamfoods.com',
  address: 'Main Road, Pandikkad, Malappuram, Kerala',
  upi_id: '',
  invoice_footer_notes: 'Thank you for your business. Fresh Kubbus & Romali rotis delivered daily.',
  is_whatsapp_enabled: true,
  is_self_order_enabled: true,
  is_maintenance_mode: false,
  maintenance_message: 'System is currently undergoing scheduled maintenance. Please check back shortly.',
  whatsapp_is_locked: false,
  whatsapp_plan_name: 'WhatsApp Enterprise Pro',
  whatsapp_plan_expires_at: null,
  whatsapp_license_key: '',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSettings | null>(() => {
    try {
      const cached = localStorage.getItem('zamzam_system_settings');
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });
  const [loading, setLoading] = useState(!settings);
  const [error, setError] = useState<string | null>(null);

  const refreshSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await settingsService.getSettings();
      setSettings(data);
      localStorage.setItem('zamzam_system_settings', JSON.stringify(data));
    } catch (err: unknown) {
      console.warn('Failed to load settings from server, using defaults.', err);
      if (!settings) {
        setSettings(defaultSettings);
      }
    } finally {
      setLoading(false);
    }
  }, [settings]);

  useEffect(() => {
    refreshSettings();
  }, []);

  const updateSettings = async (payload: Partial<SystemSettings>): Promise<SystemSettings> => {
    const updated = await settingsService.updateSettings(payload);
    setSettings(updated);
    localStorage.setItem('zamzam_system_settings', JSON.stringify(updated));
    return updated;
  };

  const isPlanExpired = settings?.whatsapp_plan_expires_at
    ? new Date(settings.whatsapp_plan_expires_at).getTime() < Date.now()
    : false;
  const isWhatsAppLocked = Boolean(settings?.whatsapp_is_locked) || isPlanExpired;
  const isWhatsAppEnabled = settings
    ? Boolean(settings.is_whatsapp_enabled) && !isWhatsAppLocked
    : true;
  const whatsappPlanName = settings?.whatsapp_plan_name || 'WhatsApp Enterprise Pro';
  const whatsappPlanExpiresAt = settings?.whatsapp_plan_expires_at || null;
  const whatsappLicenseKey = settings?.whatsapp_license_key || '';
  const isSelfOrderEnabled = settings ? Boolean(settings.is_self_order_enabled) : true;
  const isMaintenanceMode = settings ? Boolean(settings.is_maintenance_mode) : false;
  const maintenanceMessage = settings?.maintenance_message || defaultSettings.maintenance_message || '';
  const businessName = settings?.business_name || defaultSettings.business_name;
  const businessPhone = settings?.phone_number || defaultSettings.phone_number;
  const gstNumber = settings?.gst_number || '';

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        error,
        refreshSettings,
        updateSettings,
        isWhatsAppEnabled,
        isWhatsAppLocked,
        whatsappPlanName,
        whatsappPlanExpiresAt,
        whatsappLicenseKey,
        isSelfOrderEnabled,
        isMaintenanceMode,
        maintenanceMessage,
        businessName,
        businessPhone,
        gstNumber,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
