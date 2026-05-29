/**
 * HTTP Client Tests
 * Tests for automatic token refresh and request queue
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { httpClient, api } from '../http-client';
import { useAuthStore } from '../../stores/auth.store';

// Mock fetch
global.fetch = vi.fn();

describe('HTTP Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clearAuth();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Requests', () => {
    it('should make GET request with auth token', async () => {
      useAuthStore.getState().setTokens('access-token', 'refresh-token');

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const result = await api.get('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer access-token',
          }),
        })
      );
      expect(result).toEqual({ data: 'test' });
    });

    it('should make POST request with body', async () => {
      useAuthStore.getState().setTokens('access-token', 'refresh-token');

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const data = { name: 'test' };
      await api.post('/test', data);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data),
        })
      );
    });

    it('should skip auth when skipAuth is true', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'public' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      await api.get('/public', { skipAuth: true });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.not.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.any(String),
          }),
        })
      );
    });
  });

  describe('Token Refresh', () => {
    it('should refresh token on 401 and retry request', async () => {
      useAuthStore.getState().setTokens('old-token', 'refresh-token');

      // First call returns 401
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' }),
      });

      // Refresh call returns new token
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'new-token' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      // Retry with new token succeeds
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'success' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const result = await api.get('/protected');

      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ data: 'success' });
      expect(useAuthStore.getState().accessToken).toBe('new-token');
    });

    it('should handle concurrent requests during refresh', async () => {
      useAuthStore.getState().setTokens('old-token', 'refresh-token');

      // All initial requests return 401
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: false, status: 401 })
        .mockResolvedValueOnce({ ok: false, status: 401 })
        .mockResolvedValueOnce({ ok: false, status: 401 });

      // Single refresh call
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'new-token' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      // All retries succeed
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: '1' }),
          headers: new Headers({ 'content-type': 'application/json' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: '2' }),
          headers: new Headers({ 'content-type': 'application/json' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: '3' }),
          headers: new Headers({ 'content-type': 'application/json' }),
        });

      // Make concurrent requests
      const [result1, result2, result3] = await Promise.all([
        api.get('/endpoint1'),
        api.get('/endpoint2'),
        api.get('/endpoint3'),
      ]);

      // Should only refresh once (4 = 3 initial 401s + 1 refresh)
      const refreshCalls = (global.fetch as any).mock.calls.filter((call: any) =>
        call[0].includes('/auth/refresh')
      );
      expect(refreshCalls).toHaveLength(1);

      expect(result1).toEqual({ data: '1' });
      expect(result2).toEqual({ data: '2' });
      expect(result3).toEqual({ data: '3' });
    });

    it('should redirect to login when refresh fails', async () => {
      useAuthStore.getState().setTokens('old-token', 'refresh-token');

      // Mock window.location
      delete (window as any).location;
      window.location = { href: '' } as any;

      // Initial request returns 401
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      // Refresh fails
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(api.get('/protected')).rejects.toThrow();

      expect(window.location.href).toBe('/auth/signin?reason=session_expired');
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-401 errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Server error' }),
      });

      await expect(api.get('/test')).rejects.toThrow('Server error');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(api.get('/test')).rejects.toThrow('Network error');
    });
  });

  describe('Retry with jitter (thundering herd prevention)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should retry on 503 and succeed within cap (3 attempts)', async () => {
      // First two calls return 503, third succeeds
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Service Unavailable', json: async () => ({}) })
        .mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Service Unavailable', json: async () => ({}) })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'ok' }),
          headers: new Headers({ 'content-type': 'application/json' }),
        });

      const promise = api.get('/flaky');
      // Advance timers to skip jitter delays
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ data: 'ok' });
    });

    it('should stop retrying after RETRY_MAX_ATTEMPTS (3) and throw', async () => {
      // All 4 calls (1 original + 3 retries) return 503
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => ({ message: 'unavailable' }),
      });

      const promise = api.get('/always-down');
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow('unavailable');
      expect(global.fetch).toHaveBeenCalledTimes(4); // 1 + 3 retries
    });

    it('should retry on 429 Too Many Requests', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({ ok: false, status: 429, statusText: 'Too Many Requests', json: async () => ({}) })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'ok' }),
          headers: new Headers({ 'content-type': 'application/json' }),
        });

      const promise = api.get('/rate-limited');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ data: 'ok' });
    });
  });
});
