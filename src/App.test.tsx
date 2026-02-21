import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import App from './App';
import * as core from "@tauri-apps/api/core";
import * as app from "@tauri-apps/api/app";
import * as autostart from "@tauri-apps/plugin-autostart";
import * as window from "@tauri-apps/api/window";

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/app', () => ({
    getVersion: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-autostart', () => ({
    isEnabled: vi.fn(),
}));

vi.mock('@tauri-apps/api/window', () => ({
    getCurrentWindow: vi.fn(),
}));

describe('App', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default mocks
        vi.mocked(app.getVersion).mockResolvedValue('1.3.7');
        vi.mocked(autostart.isEnabled).mockResolvedValue(true);
        vi.mocked(core.invoke).mockResolvedValue(true);
        vi.mocked(window.getCurrentWindow).mockReturnValue({
            onCloseRequested: vi.fn().mockResolvedValue(vi.fn()),
        } as any);

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ version: '1.3.7' })
        } as Response);
    });

    it('should show loading state and then content', async () => {
        let resolveVersion: any;
        const versionPromise = new Promise(resolve => { resolveVersion = resolve; });
        vi.mocked(app.getVersion).mockReturnValue(versionPromise as any);

        render(<App />);

        expect(screen.getByText(/INITIALIZING/i)).toBeDefined();

        await act(async () => {
            resolveVersion('1.3.7');
        });

        await waitFor(() => {
            expect(screen.getByText('Home')).toBeDefined();
        });
    });

    it('should switch tabs', async () => {
        render(<App />);

        await waitFor(() => {
            expect(screen.getByText('Home')).toBeDefined();
        });

        const bioTabBtn = screen.getByText('Bio');
        fireEvent.click(bioTabBtn);

        expect(screen.getByText(/Profile Bio/i)).toBeDefined();
    });

    it('should handle app close request', async () => {
        let closeCallback: any;
        vi.mocked(window.getCurrentWindow).mockReturnValue({
            onCloseRequested: vi.fn().mockImplementation(async (cb) => {
                closeCallback = cb;
                return vi.fn();
            }),
        } as any);

        render(<App />);

        await waitFor(() => expect(closeCallback).toBeDefined());

        const mockEvent = { preventDefault: vi.fn() };
        await act(async () => {
            await closeCallback(mockEvent);
        });

        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(core.invoke).toHaveBeenCalledWith('force_quit');
    });

    it('should handle init failure gracefully', async () => {
        vi.mocked(app.getVersion).mockRejectedValue(new Error('Init Failed'));

        render(<App />);

        await waitFor(() => {
            expect(screen.getByText('Home')).toBeDefined();
        });
    });
});
