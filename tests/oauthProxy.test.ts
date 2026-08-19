import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { apiClient } from '../src/services/api/client';
import { oauthApi } from '../src/services/api/oauth';

describe('Codex OAuth proxy requests', () => {
  let restoreSpy: (() => void) | undefined;

  afterEach(() => {
    restoreSpy?.();
    restoreSpy = undefined;
  });

  test('keeps the existing GET flow when the proxy is empty', async () => {
    const getSpy = spyOn(apiClient, 'get').mockResolvedValue({
      url: 'https://example.test',
      state: 'state',
    });
    restoreSpy = () => getSpy.mockRestore();

    await oauthApi.startAuth('codex', { proxyUrl: '   ' });

    expect(getSpy).toHaveBeenCalledWith('/codex-auth-url', {
      params: { is_webui: true },
    });
  });

  test('posts the proxy only for Codex OAuth', async () => {
    const postSpy = spyOn(apiClient, 'post').mockResolvedValue({
      url: 'https://example.test',
      state: 'state',
      proxy_ip: '203.0.113.10',
    });
    restoreSpy = () => postSpy.mockRestore();

    const response = await oauthApi.startAuth('codex', {
      proxyUrl: ' http://user:password@proxy.example:8080 ',
    });

    expect(postSpy).toHaveBeenCalledWith(
      '/codex-auth-url',
      { proxy_url: 'http://user:password@proxy.example:8080' },
      { params: { is_webui: true } }
    );
    expect(response.proxy_ip).toBe('203.0.113.10');
  });
});
