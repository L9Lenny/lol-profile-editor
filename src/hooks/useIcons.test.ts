import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useIcons } from './useIcons';

describe('useIcons', () => {
    const mockAddLog = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        // Mock global fetch
        global.fetch = vi.fn();
    });

    it('should initialize with empty icons and load from cache', () => {
        const cachedIcons = [{ id: 1, name: 'Icon 1' }];
        localStorage.setItem('profile_icons', JSON.stringify(cachedIcons));
        localStorage.setItem('ddragon_version', '14.0.1');

        const { result } = renderHook(() => useIcons(mockAddLog));

        expect(result.current.allIcons).toEqual(cachedIcons);
        expect(result.current.ddragonVersion).toBe('14.0.1');
    });

    it('should fetch icons from Data Dragon', async () => {
        const mockVersions = ['14.4.1'];
        const mockIconsData = {
            data: {
                '1': { id: '1', name: 'First Icon' },
                '2': { id: '2', name: 'Second Icon' }
            }
        };

        vi.mocked(fetch)
            .mockResolvedValueOnce({ ok: true, json: async () => mockVersions } as Response)
            .mockResolvedValueOnce({ ok: true, json: async () => mockIconsData } as Response);

        const { result } = renderHook(() => useIcons(mockAddLog));

        await waitFor(() => {
            expect(result.current.allIcons.length).toBe(2);
        });

        expect(result.current.ddragonVersion).toBe('14.4.1');
        expect(result.current.allIcons[0].name).toBe('First Icon');
    });

    it('should filter icons based on search term', async () => {
        const icons = [
            { id: 10, name: 'Slayer' },
            { id: 20, name: 'Mage' },
            { id: 30, name: 'Knight' }
        ];
        localStorage.setItem('profile_icons', JSON.stringify(icons));

        const { result } = renderHook(() => useIcons(mockAddLog));

        await act(async () => {
            result.current.setIconSearchTerm('mage');
        });

        // useDeferredValue might need some wait
        await waitFor(() => {
            expect(result.current.visibleIcons.length).toBe(1);
            expect(result.current.visibleIcons[0].name).toBe('Mage');
        });
    });

    it('should handle scroll to load more icons', () => {
        const icons = Array.from({ length: 250 }, (_, i) => ({ id: i, name: `Icon ${i}` }));
        localStorage.setItem('profile_icons', JSON.stringify(icons));

        const { result } = renderHook(() => useIcons(mockAddLog));

        expect(result.current.visibleIcons.length).toBe(100);

        act(() => {
            const event = {
                currentTarget: {
                    scrollTop: 1000,
                    scrollHeight: 1500,
                    clientHeight: 500
                }
            } as any;
            result.current.handleScroll(event);
        });

        expect(result.current.visibleIcons.length).toBe(200);
    });
});
