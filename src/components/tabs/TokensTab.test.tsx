import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import TokensTab from './TokensTab';

describe('TokensTab', () => {
    const createProps = () => ({
        lcu: { port: '1234', token: 'secret' },
        loading: false,
        setLoading: vi.fn(),
        showToast: vi.fn(),
        addLog: vi.fn(),
        lcuRequest: vi.fn().mockImplementation((_m, endpoint) => {
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
    });

    it('should render tokens card and slots', async () => {
        const props = createProps();
        await act(async () => {
            render(<TokensTab {...props} />);
        });
        expect(screen.getByText('Profile Tokens')).toBeDefined();
        expect(screen.getByText('Slot 1')).toBeDefined();
    });

    it('should handle missing LCU', async () => {
        const props = createProps() as any;
        props.lcu = null;
        render(<TokensTab {...props} />);
        expect(screen.getByText(/client must be open/i)).toBeDefined();
    });

    it('should open picker when slot is clicked', async () => {
        const props = createProps();
        await act(async () => {
            render(<TokensTab {...props} />);
        });

        const slot1Wrapper = screen.getByText('Slot 1').parentElement;
        if (!slot1Wrapper) throw new Error("Slot 1 wrapper not found");
        const slot1 = slot1Wrapper.querySelector('.token-slot') as HTMLElement;
        fireEvent.click(slot1);

        expect(screen.getByText('Select Token (Slot 1)')).toBeDefined();
    });

    it('should filter tokens by search', async () => {
        const props = createProps();
        const lcuRequest = vi.fn().mockImplementation((_m, endpoint) => {
            if (endpoint === '/lol-challenges/v1/challenges/local-player') return Promise.resolve([
                { id: 1, name: "Apple", currentLevel: "GOLD" },
                { id: 2, name: "Banana", currentLevel: "GOLD" }
            ]);
            return Promise.resolve({});
        });

        await act(async () => {
            render(<TokensTab {...props} lcuRequest={lcuRequest} />);
        });

        const slot1Wrapper = screen.getByText('Slot 1').parentElement;
        if (!slot1Wrapper) throw new Error("Slot 1 wrapper not found");
        fireEvent.click(slot1Wrapper.querySelector('.token-slot') as HTMLElement);

        const searchInput = screen.getByPlaceholderText('Search owned tokens...');
        fireEvent.change(searchInput, { target: { value: 'App' } });

        expect(screen.getAllByAltText('Apple').length).toBeGreaterThan(0);
        expect(screen.queryByAltText('Banana')).toBeNull();
    });

    it('should handle token removal', async () => {
        const props = createProps();
        await act(async () => {
            render(<TokensTab {...props} />);
        });

        // Open picker for slot 1
        const slot1Wrapper = screen.getByText('Slot 1').parentElement;
        if (!slot1Wrapper) throw new Error("Slot 1 wrapper not found");
        fireEvent.click(slot1Wrapper.querySelector('.token-slot') as HTMLElement);

        // Click remove (token-item-none)
        fireEvent.click(screen.getByTitle('Remove token'));

        // Picker should close
        expect(screen.queryByText('Select Token (Slot 1)')).toBeNull();
    });

    it('should handle string-based challenges format', async () => {
        const props = createProps();
        props.lcuRequest = vi.fn().mockImplementation((_m, endpoint) => {
            if (endpoint === '/lol-challenges/v1/summary-player-data/local-player') return Promise.resolve({
                selectedChallengesString: "10,20,30"
            });
            return Promise.resolve({});
        });

        await act(async () => {
            render(<TokensTab {...props} />);
        });

        // No crash is success here for the logic coverage
        expect(props.lcuRequest).toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully', async () => {
        const props = createProps();
        props.lcuRequest = vi.fn().mockRejectedValue(new Error("API Error"));

        await act(async () => {
            render(<TokensTab {...props} />);
        });

        expect(props.addLog).toHaveBeenCalledWith(expect.stringContaining("Error fetching tokens"));
    });

    it('should handle application errors', async () => {
        const props = createProps();
        props.lcuRequest = vi.fn().mockImplementation((method, _endpoint) => {
            if (method === "POST") return Promise.reject(new Error("Apply Error"));
            return Promise.resolve({});
        });

        await act(async () => {
            render(<TokensTab {...props} />);
        });

        const applyBtn = screen.getByText('APPLY TO PROFILE');
        await act(async () => {
            fireEvent.click(applyBtn);
        });

        expect(props.showToast).toHaveBeenCalledWith("Failed to update tokens", "error");
    });

    it('should show empty state when no tokens found', async () => {
        const props = createProps();
        props.lcuRequest = vi.fn().mockResolvedValue([]); // Empty tokens list

        await act(async () => {
            render(<TokensTab {...props} />);
        });

        const slot1Wrapper = screen.getByText('Slot 1').parentElement;
        if (!slot1Wrapper) throw new Error("Slot 1 wrapper not found");
        fireEvent.click(slot1Wrapper.querySelector('.token-slot') as HTMLElement);
        expect(screen.getByText('No tokens found.')).toBeDefined();
    });
});
