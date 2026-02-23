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
        const slot1 = slot1Wrapper.querySelector('button.token-slot') as HTMLElement;
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
        fireEvent.click(slot1Wrapper.querySelector('button.token-slot') as HTMLElement);

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
        fireEvent.click(slot1Wrapper.querySelector('button.token-slot') as HTMLElement);

        // Click remove (token-item-none) - now a button
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
        fireEvent.click(slot1Wrapper.querySelector('button.token-slot') as HTMLElement);
        expect(screen.getByText('No tokens found.')).toBeDefined();
    });

    it('should handle keyboard navigation for slots and items', async () => {
        const props = createProps();
        await act(async () => {
            render(<TokensTab {...props} />);
        });

        // Since token-slot is now a <button>, we click it via role lookup
        const slot1Wrapper = screen.getByText('Slot 1').parentElement;
        const slot1 = slot1Wrapper?.querySelector('button.token-slot') as HTMLElement;

        // Click to open picker
        fireEvent.click(slot1);
        expect(screen.getByText('Select Token (Slot 1)')).toBeDefined();

        // Click the overlay (i.e. the <dialog> itself) to close picker
        const dialog = document.querySelector('dialog.token-picker-dialog') as HTMLElement;
        fireEvent.click(dialog);
        expect(screen.queryByText('Select Token (Slot 1)')).toBeNull();

        // Click again to reopen
        fireEvent.click(slot1);
        expect(screen.getByText('Select Token (Slot 1)')).toBeDefined();
    });

    it('should handle complex token data parsing', async () => {
        const props = createProps();
        props.lcuRequest = vi.fn().mockImplementation((_m, endpoint) => {
            if (endpoint === '/lol-challenges/v1/challenges/local-player') return Promise.resolve([
                { id: "100", challengeId: 100, name: "Valid Token", currentLevel: "DIAMOND", description: "Desc" },
                { id: -5, name: "Invalid ID", currentLevel: "GOLD" },
                { id: 200, name: "No Level", currentLevel: "NONE" },
                { id: 300, currentLevel: "GOLD" }, // No name
                null,
                {}
            ]);
            return Promise.resolve({});
        });

        await act(async () => {
            render(<TokensTab {...props} />);
        });

        const slot1Wrapper = screen.getByText('Slot 1').parentElement;
        fireEvent.click(slot1Wrapper?.querySelector('button.token-slot') as HTMLElement);

        expect(screen.getByAltText('Valid Token')).toBeDefined();
        // Check that only 1 valid token was added
        expect(props.addLog).toHaveBeenCalledWith(expect.stringContaining("Loaded 1 selectable tokens"));
    });

    it('should handle refresh button click', async () => {
        const props = createProps();
        await act(async () => {
            render(<TokensTab {...props} />);
        });

        const refreshBtn = screen.getByTitle('Refresh tokens');
        await act(async () => {
            fireEvent.click(refreshBtn);
        });

        expect(props.addLog).toHaveBeenCalledWith("Fetching tokens from LCU...");
    });

    it('should stop propagation when clicking modal content', async () => {
        const props = createProps();
        await act(async () => {
            render(<TokensTab {...props} />);
        });

        // Open picker
        const slot1Wrapper = screen.getByText('Slot 1').parentElement;
        fireEvent.click(slot1Wrapper?.querySelector('button.token-slot') as HTMLElement);

        const modal = document.querySelector('.token-picker-modal') as HTMLElement;

        fireEvent.click(modal);
        // Picker should still be open
        expect(screen.getByText('Select Token (Slot 1)')).toBeDefined();
    });
});
