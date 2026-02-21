import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import BioTab from './BioTab';

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
    });

    it('should handle update failure', async () => {
        const props = createProps();
        props.lcuRequest.mockImplementation((method, endpoint) => {
            if (method === 'GET') return Promise.resolve({ availability: 'away' });
            return Promise.reject(new Error('LCU Error'));
        });

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
    });
});
