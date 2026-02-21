import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import MusicTab from './MusicTab';
import { defaultMusicBioSettings } from '../../hooks/useMusicSync';

// Mock Tauri plugin-opener
vi.mock('@tauri-apps/plugin-opener', () => ({
    openUrl: vi.fn(),
}));

describe('MusicTab', () => {
    const mockProps = {
        lcu: { port: '1234', token: 'secret' },
        musicBio: defaultMusicBioSettings(),
        setMusicBio: vi.fn(),
        showToast: vi.fn(),
        addLog: vi.fn(),
        applyIdleBio: vi.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it('should render music auto bio card', () => {
        render(<MusicTab {...mockProps} />);
        expect(screen.getByText('Music Auto Bio')).toBeDefined();
    });

    it('should handle enabling music sync', () => {
        const musicBio = { ...defaultMusicBioSettings(), lastfmUsername: 'user', lastfmApiKey: 'key' };
        render(<MusicTab {...mockProps} musicBio={musicBio} />);

        const enableBtn = screen.getByText('Enable Auto Bio', { selector: 'button.primary-btn' });
        fireEvent.click(enableBtn);

        expect(mockProps.setMusicBio).toHaveBeenCalled();
        expect(mockProps.showToast).toHaveBeenCalledWith("Music sync enabled", "success");
    });

    it('should handle connecting to Last.fm', async () => {
        const musicBio = { ...defaultMusicBioSettings(), lastfmUsername: 'user', lastfmApiKey: 'key' };
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ recenttracks: { track: [{ name: 'Song' }] } })
        } as Response);

        render(<MusicTab {...mockProps} musicBio={musicBio} />);

        const connectBtn = screen.getByText('Test Last.fm Connection');
        await act(async () => {
            fireEvent.click(connectBtn);
        });

        expect(fetch).toHaveBeenCalled();
        expect(mockProps.showToast).toHaveBeenCalledWith("Last.fm connected", "success");
    });

    it('should handle normalization in input', async () => {
        render(<MusicTab {...mockProps} />);
        const userInput = screen.getByLabelText(/Username/i);
        fireEvent.change(userInput, { target: { value: 'https://www.last.fm/user/tester' } });

        expect(mockProps.setMusicBio).toHaveBeenCalled();
        const updateFn = mockProps.setMusicBio.mock.calls[0][0];
        const newState = updateFn({ lastfmUsername: '' });
        expect(newState.lastfmUsername).toBe('tester');
    });

    it('should handle disabling sync', async () => {
        const musicBio = { ...defaultMusicBioSettings(), enabled: true };
        render(<MusicTab {...mockProps} musicBio={musicBio} />);

        const disableBtn = screen.getByText('Disable');
        await act(async () => {
            fireEvent.click(disableBtn);
        });

        expect(mockProps.applyIdleBio).toHaveBeenCalled();
        expect(mockProps.setMusicBio).toHaveBeenCalled();
    });
});
