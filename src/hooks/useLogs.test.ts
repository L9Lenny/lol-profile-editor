import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLogs } from './useLogs';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
    save: vi.fn(),
}));

describe('useLogs', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should add a log entry with a unique ID', () => {
        const { result } = renderHook(() => useLogs());

        act(() => {
            result.current.addLog('Test message');
        });

        expect(result.current.logs).toHaveLength(1);
        expect(result.current.logs[0].msg).toBe('Test message');
        expect(result.current.logs[0].id).toBeDefined();
    });

    it('should limit logs to 50 entries', () => {
        const { result } = renderHook(() => useLogs());

        act(() => {
            for (let i = 0; i < 60; i++) {
                result.current.addLog(`Message ${i}`);
            }
        });

        expect(result.current.logs).toHaveLength(50);
        expect(result.current.logs[0].msg).toBe('Message 59');
    });

    it('should clear logs', () => {
        const { result } = renderHook(() => useLogs());

        act(() => {
            result.current.addLog('Message');
            result.current.clearLogs();
        });

        expect(result.current.logs).toHaveLength(0);
    });

    it('should handle log export', async () => {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { invoke } = await import('@tauri-apps/api/core');
        const mockShowToast = vi.fn();

        const { result } = renderHook(() => useLogs());

        act(() => {
            result.current.addLog('Test Log');
        });

        vi.mocked(save).mockResolvedValue('C:/logs.txt');
        vi.mocked(invoke).mockResolvedValue('C:/logs.txt');

        await act(async () => {
            await result.current.exportLogs(mockShowToast);
        });

        expect(save).toHaveBeenCalled();
        expect(invoke).toHaveBeenCalledWith('save_logs_to_path', expect.anything());
        expect(mockShowToast).toHaveBeenCalledWith("Logs exported", "success");
    });

    it('should show error when exporting empty logs', async () => {
        const mockShowToast = vi.fn();
        const { result } = renderHook(() => useLogs());

        await act(async () => {
            await result.current.exportLogs(mockShowToast);
        });

        expect(mockShowToast).toHaveBeenCalledWith("No logs to export", "error");
    });

    it('should handle export cancellation', async () => {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const mockShowToast = vi.fn();
        const { result } = renderHook(() => useLogs());

        act(() => { result.current.addLog('Log'); });
        vi.mocked(save).mockResolvedValue(null);

        await act(async () => {
            await result.current.exportLogs(mockShowToast);
        });

        expect(mockShowToast).not.toHaveBeenCalled();
    });
});
