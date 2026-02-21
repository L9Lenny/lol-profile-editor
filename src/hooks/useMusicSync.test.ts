import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
    useMusicSync,
    clampPollInterval,
    truncateBio,
    buildBioFromTemplate,
    DEFAULT_IDLE_BIO
} from './useMusicSync';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn().mockResolvedValue({}),
}));

describe('useMusicSync utilities', () => {
    it('clampPollInterval should bound values between 5 and 120', () => {
        expect(clampPollInterval(1)).toBe(5);
        expect(clampPollInterval(10)).toBe(10);
        expect(clampPollInterval(200)).toBe(120);
        expect(clampPollInterval(NaN)).toBe(15);
    });

    it('truncateBio should trim and limit length', () => {
        expect(truncateBio('  hello  ')).toBe('hello');
        expect(truncateBio('a'.repeat(200))).toBe('a'.repeat(124) + '...');
        expect(truncateBio('short')).toBe('short');
    });

    it('buildBioFromTemplate should replace tokens correctly', () => {
        const template = '{title} by {artist} from {album} on {source}';
        const track = {
            title: 'Song',
            artist: 'Artist',
            album: 'Album',
            sourceLabel: 'Spotify'
        };
        expect(buildBioFromTemplate(template, track)).toBe('Song by Artist from Album on Spotify');
    });
});

describe('useMusicSync hook', () => {
    const mockAddLog = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        global.fetch = vi.fn();
    });

    it('should initialize with default settings', () => {
        const { result } = renderHook(() => useMusicSync(null, mockAddLog));
        expect(result.current.musicBio.enabled).toBe(false);
        expect(result.current.musicBio.idleText).toBe(DEFAULT_IDLE_BIO);
    });

    it('should sync music bio periodically when enabled', async () => {
        const { invoke } = await import('@tauri-apps/api/core');

        const mockTrack = {
            recenttracks: {
                track: [{
                    name: 'Song Title',
                    artist: { '#text': 'Artist Name' },
                    album: { '#text': 'Album Name' },
                    '@attr': { nowplaying: 'true' }
                }]
            }
        };

        vi.mocked(global.fetch).mockResolvedValue({
            ok: true,
            json: async () => mockTrack
        } as Response);

        const { result } = renderHook(() => useMusicSync({ port: '1234', token: 'secret' }, mockAddLog));

        await act(async () => {
            result.current.setMusicBio(prev => ({
                ...prev,
                enabled: true,
                lastfmUsername: 'tester',
                lastfmApiKey: 'api123',
                pollIntervalSec: 5
            }));
        });

        await waitFor(() => {
            expect(invoke).toHaveBeenCalledWith('update_bio', expect.objectContaining({
                newBio: 'Listening to Song Title - Artist Name'
            }));
        }, { timeout: 4000 });
    });

    it('should restore idle bio when applyIdleBio is called', async () => {
        const { invoke } = await import('@tauri-apps/api/core');
        const { result } = renderHook(() => useMusicSync({ port: '1234', token: 'secret' }, mockAddLog));

        await act(async () => {
            await result.current.applyIdleBio();
        });

        expect(invoke).toHaveBeenCalledWith('update_bio', expect.objectContaining({
            newBio: DEFAULT_IDLE_BIO
        }));
    });
});
