import { apiClient, API_BASE_URL } from './apiClient';

export interface DatabaseModuleStat {
  id: string;
  name: string;
  count: number;
  icon: string;
}

export interface DatabaseStats {
  engine: string;
  size_bytes: number;
  size_formatted: string;
  quota_bytes: number;
  quota_formatted: string;
  usage_pct: number;
  total_records: number;
  table_count: number;
  modules: DatabaseModuleStat[];
  status: 'healthy' | 'warning' | 'critical';
  alert_message?: string | null;
  supabase_api_url?: string;
  checked_at: string;
}

export interface BackupRequest {
  type: 'full' | 'selective';
  modules?: string[];
}

export const databaseService = {
  async getStats(): Promise<DatabaseStats> {
    return apiClient.get<DatabaseStats>('/database/stats/');
  },

  async downloadBackup(payload: BackupRequest): Promise<void> {
    const url = `${API_BASE_URL}/database/backup/`;
    const token = localStorage.getItem('zamzam_access_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error || 'Failed to generate database backup');
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `zamzam_backup_${payload.type}_${new Date().toISOString().slice(0, 10)}.json`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },
};
