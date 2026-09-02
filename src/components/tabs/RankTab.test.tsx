import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RankTab from './RankTab';

const mockInvoke = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
    invoke: (...args: unknown[]) => mockInvoke(...args),
}));

describe('RankTab', () => {
    const createMockProps = () => {
        const lcuRequest = vi.fn().mockImplementation((method, endpoint) => {
            if (method === "GET" && endpoint === "/lol-chat/v1/me") {
                return Promise.resolve({
                    lol: {
                        rankedLeagueTier: "CHALLENGER",
                        rankedLeagueDivision: "I",
                        rankedLeagueQueue: "RANKED_SOLO_5x5",
                        challengeCrystalLevel: "CHALLENGER",
                        challengePoints: 1200
                    }
                });
            }
            return Promise.resolve({});
        });

        return {
            lcu: { port: '1234', token: 'secret' },
            showToast: vi.fn(),
            addLog: vi.fn(),
            lcuRequest
        };
    };

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        mockInvoke.mockResolvedValue(undefined);
    });

    it('should render only rank customization controls and sync from LCU on mount', async () => {
        const props = createMockProps();
        render(<RankTab {...props} />);

        const rankSection = (await screen.findByText('Rank Override')).closest('.card');
        expect(rankSection).toBeDefined();
        expect(screen.queryByText('Challenge Crystal Override')).toBeNull();
        expect(screen.queryByLabelText('Challenge Points')).toBeNull();
        expect(props.lcuRequest).toHaveBeenCalledWith("GET", "/lol-chat/v1/me");
    });

    it('should update rank preview when selection changes', async () => {
        const props = createMockProps();
        render(<RankTab {...props} />);

        const goldBtn = await screen.findAllByText('GOLD');
        fireEvent.click(goldBtn[0]!);

        const goldElements = screen.getAllByText(/GOLD/);
        expect(goldElements.length).toBeGreaterThan(0);
    });

    it('should explain the Pengu requirement for the Overview override', async () => {
        const props = createMockProps();
        render(<RankTab {...props} />);

        expect(screen.getByText('PenguLoader Overview Override')).toBeDefined();
        expect(screen.getByText('Setup required')).toBeDefined();
        expect(screen.getByText('How to enable the Overview override')).toBeDefined();
        expect(screen.getByText(/Settings > Pengu Loader/)).toBeDefined();
        await waitFor(() => expect(props.addLog).toHaveBeenCalledWith('Rank status synced successfully.'));
    });

    it('should persist and apply the Overview preference independently', async () => {
        const props = createMockProps();
        render(<RankTab {...props} />);

        const overviewToggle = screen.getByText('Toggle Profile Overview rank override').closest('label')?.querySelector('input');
        if (!overviewToggle) throw new Error('Overview toggle not found');
        fireEvent.click(overviewToggle);
        expect(screen.queryByText('How to enable the Overview override')).toBeNull();

        const applyButton = screen.getByText('APPLY RANK OVERRIDES') as HTMLButtonElement;
        await waitFor(() => expect(applyButton.disabled).toBe(false));
        fireEvent.click(applyButton);

        await waitFor(() => {
            expect(localStorage.getItem('pengu_overview_override_v1')).toBe('false');
            expect(mockInvoke).toHaveBeenCalledWith('save_rank_config', expect.objectContaining({
                overviewEnabled: false,
            }));
            expect(props.lcuRequest).toHaveBeenCalledWith('PUT', '/lol-chat/v1/me', expect.anything());
        });
    });

    it('should call lcuRequest with correct parameters on apply', async () => {
        const props = createMockProps();
        render(<RankTab {...props} />);

        const applyBtn = await screen.findByText('APPLY RANK OVERRIDES');
        fireEvent.click(applyBtn);

        await waitFor(() => {
            expect(props.lcuRequest).toHaveBeenCalledWith("PUT", "/lol-chat/v1/me", expect.objectContaining({
                lol: expect.objectContaining({
                    rankedLeagueTier: "CHALLENGER",
                    rankedLeagueDivision: "I",
                    rankedLeagueQueue: "RANKED_SOLO_5x5"
                })
            }));
            expect(props.showToast).toHaveBeenCalledWith("Rank Overrides Applied!", "success");
        });
    });

    it('should handle apply errors gracefully', async () => {
        const props = createMockProps();
        props.lcuRequest.mockImplementation((method, endpoint) => {
            if (method === "PUT" && endpoint === "/lol-chat/v1/me") {
                return Promise.reject(new Error("Network Error"));
            }
            return Promise.resolve({});
        });

        render(<RankTab {...props} />);

        const applyBtn = await screen.findByText('APPLY RANK OVERRIDES');
        fireEvent.click(applyBtn);

        await waitFor(() => {
            expect(props.showToast).toHaveBeenCalledWith(expect.stringContaining("Customization failed: Network Error"), "error");
            expect(props.addLog).toHaveBeenCalledWith(expect.stringContaining("Customization application failed: Network Error"));
        });
    });

    it('should disable apply button when LCU is missing', async () => {
        const props = createMockProps() as any;
        props.lcu = null;

        render(<RankTab {...props} />);
        const applyBtn = screen.getByText('APPLY RANK OVERRIDES');
        expect((applyBtn as HTMLButtonElement).disabled).toBe(true);
    });
});
