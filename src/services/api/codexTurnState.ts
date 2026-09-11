import { apiClient } from './client';

export type CodexTurnStateItem = {
  auth_id: string;
  name?: string;
  label?: string;
  states: Record<string, { value: string; fetched_at?: string; expires_at?: string }>;
};

export const codexTurnStateApi = {
  list: () => apiClient.get<{ items: CodexTurnStateItem[] }>('/codex-turn-state'),
  refresh: (auth_id: string, model: string, proxy_url?: string) =>
    apiClient.post<{ auth_id: string; model: string; value: string }>('/codex-turn-state/refresh', {
      auth_id,
      model,
      proxy_url,
    }),
  refreshAll: (models: string[], proxy_url?: string) =>
    apiClient.post<{ items: { auth_id: string; model: string; value?: string; error?: string }[] }>(
      '/codex-turn-state/refresh-all',
      { models, proxy_url },
    ),
};
