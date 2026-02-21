import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import BioTab from './BioTab';
import { invoke } from "@tauri-apps/api/core";

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

describe('BioTab', () => {
    const createProps = () => ({
        lcu: { port: '1234', token: 'secret' },
        loading: false,
        setLoading: vi.fn(),
        showToast: vi.fn(),
        addLog: vi.fn(),
        lcuRequest: vi.fn().mockResolvedValue({ availability: 'away' }),
    });

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(invoke).mockResolvedValue({});
    });

    it('should render profile bio card', async () => {
        const props = createProps();
        await act(async () => {
            render(<BioTab {...props} />);
        });
        expect(screen.getByText('Profile Bio')).toBeDefined();
    });

    it('should handle bio update', async () => {
        const props = createProps();
        render(<BioTab {...props} />);
        const textarea = screen.getByLabelText('New Status Message');
        fireEvent.change(textarea, { target: { value: 'New Bio' } });

        const applyBtns = screen.getAllByText('APPLY');
        const applyBtn = applyBtns.find(btn => !btn.classList.contains('availability-apply'));

        await act(async () => {
            fireEvent.click(applyBtn!);
        });

        expect(props.setLoading).toHaveBeenCalledWith(true);
        expect(invoke).toHaveBeenCalledWith("update_bio", expect.anything());
    });

    it('should handle update failure', async () => {
        const props = createProps();
        // The first call to lcuRequest is GET /me in refreshAvailability
        props.lcuRequest.mockResolvedValue({ availability: 'away' });

        // Mock invoke to fail for the bio update
        vi.mocked(invoke).mockRejectedValueOnce(new Error('LCU Error'));

        render(<BioTab {...props} />);

        const textarea = screen.getByLabelText('New Status Message');
        await act(async () => {
            fireEvent.change(textarea, { target: { value: 'Failure Bio' } });
        });

        const applyBtn = screen.getAllByText('APPLY').find(btn => !btn.classList.contains('availability-apply'));

        await act(async () => {
            fireEvent.click(applyBtn!);
        });

        await waitFor(() => {
            expect(props.showToast).toHaveBeenCalledWith('Failed to update bio', 'error');
        });
    });

    it('should update availability', async () => {
        const props = createProps();
        render(<BioTab {...props} />);
        const select = screen.getByLabelText('Chat Availability');
        fireEvent.change(select, { target: { value: 'mobile' } });

        const applyBtn = screen.getAllByText('APPLY').find(btn => btn.classList.contains('availability-apply'));
        await act(async () => {
            fireEvent.click(applyBtn!);
        });

        expect(props.setLoading).toHaveBeenCalledWith(true);
        expect(props.lcuRequest).toHaveBeenCalledWith("PUT", "/lol-chat/v1/me", expect.anything());
    });
});
