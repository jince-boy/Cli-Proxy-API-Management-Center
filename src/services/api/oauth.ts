/**
 * OAuth 与设备码登录相关 API
 */

import { apiClient } from './client';
import {
  isManagementOAuthProviderKey,
  normalizeManagementOAuthProviderKey,
} from '@/utils/providerKeys';

export type BuiltInOAuthProvider = 'codex' | 'anthropic' | 'antigravity' | 'kimi' | 'xai' | 'devin';

export interface OAuthStartResponse {
  url: string;
  state?: string;
  proxy_ip?: string;
}

export interface OAuthStartOptions {
  proxyUrl?: string;
  signal?: AbortSignal;
}

export interface OAuthCallbackResponse {
  status: 'ok';
}

export interface OAuthCancelResponse {
  status: 'ok';
  cancelled: boolean;
}

const WEBUI_SUPPORTED = new Set<string>(['codex', 'anthropic', 'antigravity', 'xai', 'devin']);

const normalizeProviderForManagementPath = (provider: string): string => {
  const key = normalizeManagementOAuthProviderKey(provider);
  if (!isManagementOAuthProviderKey(key)) {
    throw new Error('Invalid OAuth provider');
  }
  return key;
};

export const oauthApi = {
  startAuth: (provider: string, optionsOrSignal?: OAuthStartOptions | AbortSignal) => {
    const providerKey = normalizeProviderForManagementPath(provider);
    const options: OAuthStartOptions =
      optionsOrSignal && typeof optionsOrSignal === 'object' && 'aborted' in optionsOrSignal
        ? { signal: optionsOrSignal }
        : optionsOrSignal ?? {};
    const params: Record<string, string | boolean> = {};
    if (WEBUI_SUPPORTED.has(providerKey)) {
      params.is_webui = true;
    }
    const proxyUrl = options.proxyUrl?.trim() ?? '';
    if (providerKey === 'codex' && proxyUrl) {
      return apiClient.post<OAuthStartResponse>(
        `/${providerKey}-auth-url`,
        { proxy_url: proxyUrl },
        { params, ...(options.signal ? { signal: options.signal } : {}) }
      );
    }
    return apiClient.get<OAuthStartResponse>(`/${providerKey}-auth-url`, {
      params: Object.keys(params).length ? params : undefined,
      ...(options.signal ? { signal: options.signal } : {}),
    });
  },

  getAuthStatus: (state: string, signal?: AbortSignal) =>
    apiClient.get<{ status: 'ok' | 'wait' | 'error'; error?: string }>(`/get-auth-status`, {
      params: { state },
      ...(signal ? { signal } : {}),
    }),

  cancelSession: (state: string, signal?: AbortSignal) =>
    apiClient.delete<OAuthCancelResponse>('/oauth-session', {
      params: { state },
      ...(signal ? { signal } : {}),
    }),

  submitCallback: (provider: string, redirectUrl: string, signal?: AbortSignal) => {
    const providerKey = normalizeProviderForManagementPath(provider);
    return apiClient.post<OAuthCallbackResponse>(
      '/oauth-callback',
      { provider: providerKey, redirect_url: redirectUrl },
      signal ? { signal } : undefined
    );
  },
};
