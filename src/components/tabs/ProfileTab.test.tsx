import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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
            return Promise.resolve({});
        }),
    });

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(invoke).mockResolvedValue({});
    });

    it('should render profile bio card', async () => {
        const props = createProps();
        await act(async () => {
            render(<ProfileTab {...props} />);
        });
        expect(screen.getByText('Profile Bio & Status')).toBeDefined();
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

    it('should update availability', async () => {
        const props = createProps();
        render(<ProfileTab {...props} />);
        const select = screen.getByLabelText('Chat Availability');
        fireEvent.change(select, { target: { value: 'mobile' } });

        const applyBtn = screen.getByText('APPLY');
        await act(async () => {
            fireEvent.click(applyBtn);
        });

        expect(props.setLoading).toHaveBeenCalledWith(true);
        expect(props.lcuRequest).toHaveBeenCalledWith("PUT", "/lol-chat/v1/me", expect.anything());
    });
});
