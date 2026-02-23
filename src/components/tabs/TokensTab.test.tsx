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
        expect(screen.getByText('Slot 2')).toBeDefined();
        expect(screen.getByText('Slot 3')).toBeDefined();
    });

    it('should open picker when slot is clicked', async () => {
        const props = createProps();
        await act(async () => {
            render(<TokensTab {...props} />);
        });

        const slot1 = screen.getByText('Slot 1').parentElement!.querySelector('.token-slot') as HTMLElement;
        fireEvent.click(slot1);

        expect(screen.getByText('Select Token (Slot 1)')).toBeDefined();
    });

    it('should filter tokens by search', async () => {
        const props = createProps();
        const lcuRequest = vi.fn().mockImplementation((_m, endpoint) => {
            if (endpoint === '/lol-challenges/v1/challenges/local-player') return Promise.resolve({
                "1": { id: 1, name: "Apple", currentLevel: "GOLD" },
                "2": { id: 2, name: "Banana", currentLevel: "GOLD" }
            });
            return Promise.resolve({});
        });

        await act(async () => {
            render(<TokensTab {...props} lcuRequest={lcuRequest} />);
        });

        const slot1 = screen.getByText('Slot 1').parentElement!.querySelector('.token-slot') as HTMLElement;
        fireEvent.click(slot1);

        const searchInput = screen.getByPlaceholderText('Search owned tokens...');
        fireEvent.change(searchInput, { target: { value: 'App' } });

        // Use findByText or similar, or just check the picker grid
        const items = screen.getAllByAltText('Apple');
        expect(items.length).toBeGreaterThan(0);
        expect(screen.queryByAltText('Banana')).toBeNull();
    });

    it('should handle token selection and duplicate assignment', async () => {
        const props = createProps();
        const lcuRequest = vi.fn().mockImplementation((_m, endpoint) => {
            if (endpoint === '/lol-challenges/v1/challenges/local-player') return Promise.resolve({
                "1": { id: 1, name: "TestItem", currentLevel: "GOLD" }
            });
            return Promise.resolve({});
        });

        await act(async () => {
            render(<TokensTab {...props} lcuRequest={lcuRequest} />);
        });

        // Click slot 1 and select token 1
        fireEvent.click(screen.getByText('Slot 1').parentElement!.querySelector('.token-slot') as HTMLElement);
        fireEvent.click(screen.getByAltText('TestItem'));

        // Click slot 2 and select token 1 again
        fireEvent.click(screen.getByText('Slot 2').parentElement!.querySelector('.token-slot') as HTMLElement);
        // "TestItem" will now be in alt text of slot 1 and in picker
        const items = screen.getAllByAltText('TestItem');
        fireEvent.click(items[items.length - 1]); // Click the one in picker (last one)

        const applyBtn = screen.getByText('APPLY TO PROFILE');
        await act(async () => {
            fireEvent.click(applyBtn);
        });

        expect(lcuRequest).toHaveBeenCalledWith("POST", "/lol-challenges/v1/update-player-preferences", {
            challengeIds: [1, 1]
        });
    });
});
