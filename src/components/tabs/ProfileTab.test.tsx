import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ProfileTab from './ProfileTab';
import { invoke } from "@tauri-apps/api/core";

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

describe('ProfileTab', () => {
    const createProps = () => ({
        lcu: { port: '1234', token: 'secret' },
        loading: false,
        setLoading: vi.fn(),
        showToast: vi.fn(),
        addLog: vi.fn(),
        lcuRequest: vi.fn().mockImplementation((_m, endpoint) => {
            if (endpoint === '/lol-chat/v1/me') return Promise.resolve({ availability: 'away' });
            if (endpoint === '/lol-challenges/v1/challenges/local-player') return Promise.resolve({
                "1": { id: 1, name: "Test Token 1", currentLevel: "GOLD" }
            });
            if (endpoint === '/lol-challenges/v1/summary-player-data/local-player') return Promise.resolve({
                topChallenges: [{ id: 1 }, { id: 2 }, { id: 3 }]
            });
            return Promise.resolve({});
        }),
    });

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(invoke).mockResolvedValue({});
    });

    it('should render profile bio and tokens cards', async () => {
        const props = createProps();
        await act(async () => {
            render(<ProfileTab {...props} />);
        });
        expect(screen.getByText('Profile Bio & Status')).toBeDefined();
        expect(screen.getByText('Profile Tokens')).toBeDefined();
    });

    it('should handle bio update', async () => {
        const props = createProps();
        render(<ProfileTab {...props} />);
        const textarea = screen.getByLabelText('New Status Message');
        fireEvent.change(textarea, { target: { value: 'New Bio' } });

        const applyBtn = screen.getByText('APPLY BIO');

        await act(async () => {
            fireEvent.click(applyBtn);
        });

        expect(props.setLoading).toHaveBeenCalledWith(true);
        expect(invoke).toHaveBeenCalledWith("update_bio", expect.anything());
    });

    it('should handle update failure', async () => {
        const props = createProps();
        // Mock invoke to fail for the bio update
        vi.mocked(invoke).mockRejectedValueOnce(new Error('LCU Error'));

        render(<ProfileTab {...props} />);

        const textarea = screen.getByLabelText('New Status Message');
        await act(async () => {
            fireEvent.change(textarea, { target: { value: 'Failure Bio' } });
        });

        const applyBtn = screen.getByText('APPLY BIO');

        await act(async () => {
            fireEvent.click(applyBtn);
        });

        await waitFor(() => {
            expect(props.showToast).toHaveBeenCalledWith('Failed to update bio', 'error');
        });
    });

    it('should update availability', async () => {
        const props = createProps();
        render(<ProfileTab {...props} />);
        const select = screen.getByLabelText('Chat Availability');
        fireEvent.change(select, { target: { value: 'mobile' } });

        const applyBtn = screen.getAllByText('APPLY').find(btn => btn.classList.contains('availability-apply'));
        await act(async () => {
            fireEvent.click(applyBtn!);
        });

        expect(props.setLoading).toHaveBeenCalledWith(true);
        expect(props.lcuRequest).toHaveBeenCalledWith("PUT", "/lol-chat/v1/me", expect.anything());
    });

    it('should apply tokens', async () => {
        const props = createProps();
        render(<ProfileTab {...props} />);

        const applyTokensBtn = screen.getByText('APPLY TOKENS');
        await act(async () => {
            fireEvent.click(applyTokensBtn);
        });

        expect(props.setLoading).toHaveBeenCalledWith(true);
        expect(props.lcuRequest).toHaveBeenCalledWith("POST", "/lol-challenges/v1/update-player-preferences", expect.anything());
    });
});
