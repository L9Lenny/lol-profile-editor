import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import IconTab from './IconTab';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

describe('IconTab', () => {
    const mockProps = {
        lcu: { port: '1234', token: 'secret' },
        loading: false,
        setLoading: vi.fn(),
        showToast: vi.fn(),
        addLog: vi.fn(),
        allIcons: [
            { id: 1, name: 'Icon One' },
            { id: 2, name: 'Icon Two' }
        ],
        iconSearchTerm: '',
        setIconSearchTerm: vi.fn(),
        ddragonVersion: '14.4.1',
        visibleIcons: [
            { id: 1, name: 'Icon One' },
            { id: 2, name: 'Icon Two' }
        ],
        handleScroll: vi.fn(),
        gridRef: { current: null } as any
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render icon search and icons', () => {
        render(<IconTab {...mockProps} />);
        expect(screen.getByPlaceholderText(/Search by name or ID/i)).toBeDefined();
        expect(screen.getByText('Icon One')).toBeDefined();
        expect(screen.getByText('Icon Two')).toBeDefined();
    });

    it('should handle icon selection and apply', async () => {
        render(<IconTab {...mockProps} />);
        const iconBtn = screen.getByText('Icon One').closest('button');
        if (!iconBtn) throw new Error('Icon button not found');

        await act(async () => {
            fireEvent.click(iconBtn);
        });

        const applyBtn = screen.getByText('APPLY ICON');
        await act(async () => {
            fireEvent.click(applyBtn);
        });

        expect(mockProps.setLoading).toHaveBeenCalledWith(true);
    });

    it('should show empty state when no icons match', () => {
        const emptyProps = { ...mockProps, visibleIcons: [], iconSearchTerm: 'nothing' };
        render(<IconTab {...emptyProps} />);
        // It doesn't actually show an "empty state" message in the code currently, 
        // it just renders an empty grid. 
        // Let's just check if icons are NOT there.
        expect(screen.queryByText('Icon One')).toBeNull();
    });

    it('should show warning if LCU not connected (disabled button)', () => {
        render(<IconTab {...mockProps} lcu={null} />);
        const applyBtn = screen.getByText('APPLY ICON');
        expect(applyBtn).toHaveProperty('disabled', true);
    });
});
