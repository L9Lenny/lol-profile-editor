import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLcu } from './useLcu';
import { invoke } from "@tauri-apps/api/core";

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

describe('useLcu', () => {
    const mockAddLog = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should initialize with null lcu', async () => {
        // Mock a pending promise to avoid immediate state update and act warning
        let resolveConn: any;
        const connPromise = new Promise(resolve => { resolveConn = resolve; });
        vi.mocked(invoke).mockReturnValue(connPromise as any);

        const { result, unmount } = renderHook(() => useLcu(mockAddLog));
        expect(result.current.lcu).toBeNull();

        // Cleanup
        await act(async () => {
            resolveConn(null);
            unmount();
        });
    });

    it('should detect LCU connection', async () => {
        const mockConnection = { port: '1234', token: 'secret' };
        vi.mocked(invoke).mockResolvedValue(mockConnection);

        const { result } = renderHook(() => useLcu(mockAddLog));

        await waitFor(() => {
            expect(result.current.lcu).toEqual(mockConnection);
        }, { timeout: 2000 });

        expect(mockAddLog).toHaveBeenCalledWith('League client connected.');
    });

    it('should detect LCU disconnection using timers', async () => {
        vi.useFakeTimers();
        const mockConnection = { port: '1234', token: 'secret' };

        // First call connects
        vi.mocked(invoke).mockResolvedValueOnce(mockConnection);

        const { result } = renderHook(() => useLcu(mockAddLog));

        // Trigger initial check
        await act(async () => {
            vi.advanceTimersByTime(0);
        });

        // Next call fails
        vi.mocked(invoke).mockRejectedValueOnce(new Error('Disconnected'));

        await act(async () => {
            vi.advanceTimersByTime(2000);
        });

        expect(result.current.lcu).toBeNull();
        expect(mockAddLog).toHaveBeenCalledWith('League client disconnected.');
    });

    it('should perform lcuRequest correctly', async () => {
        const mockConnection = { port: '1234', token: 'secret' };
        vi.mocked(invoke).mockResolvedValue(mockConnection);

        const { result } = renderHook(() => useLcu(mockAddLog));

        await waitFor(() => {
            expect(result.current.lcu).not.toBeNull();
        });

        vi.mocked(invoke).mockResolvedValueOnce({ success: true });

        let response;
        await act(async () => {
            response = await result.current.lcuRequest('PUT', '/test', { foo: 'bar' });
        });

        expect(invoke).toHaveBeenCalledWith('lcu_request', {
            method: 'PUT',
            endpoint: '/test',
            port: '1234',
            token: 'secret',
            body: { foo: 'bar' }
        });
        expect(response).toEqual({ success: true });
    });
});
