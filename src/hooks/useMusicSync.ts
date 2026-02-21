import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { LcuInfo } from './useLcu';

export interface MusicBioSettings {
    enabled: boolean;
    pollIntervalSec: number;
    template: string;
    idleText: string;
    lastfmApiKey: string;
    lastfmUsername: string;
}

export interface NowPlayingTrack {
    sourceLabel: string;
    artist: string;
    title: string;
    album: string;
}

export const MUSIC_BIO_STORAGE_KEY = "music_bio_settings_v1";
export const DEFAULT_IDLE_BIO = "Not listening now";

export const defaultMusicBioSettings = (): MusicBioSettings => ({
    enabled: false,
    pollIntervalSec: 15,
    template: "Listening to {title} - {artist}",
    idleText: DEFAULT_IDLE_BIO,
    lastfmApiKey: "",
    lastfmUsername: "",
});

export const clampPollInterval = (value: number) => {
    if (!Number.isFinite(value)) return 15;
    return Math.max(5, Math.min(120, Math.round(value)));
};

export const truncateBio = (value: string, max = 127) => {
    const trimmed = value.trim();
    if (trimmed.length <= max) return trimmed;
    return `${trimmed.slice(0, max - 3)}...`;
};

export const buildBioFromTemplate = (template: string, track: NowPlayingTrack) => {
    const replaceToken = (input: string, token: string, value: string) => input.split(token).join(value);
    return truncateBio(
        replaceToken(
            replaceToken(
                replaceToken(
                    replaceToken(template, "{title}", track.title),
                    "{artist}",
                    track.artist
                ),
                "{album}",
                track.album
            ),
            "{source}",
            track.sourceLabel
        )
    );
};

export function useMusicSync(lcu: LcuInfo | null, addLog: (msg: string) => void) {
    const [musicBio, setMusicBio] = useState<MusicBioSettings>(defaultMusicBioSettings);
    const [musicSettingsHydrated, setMusicSettingsHydrated] = useState(false);
    const musicSyncRunningRef = useRef(false);
    const lastAutoBioRef = useRef<string>("");
    const musicSyncLastErrorRef = useRef<string>("");

    useEffect(() => {
        try {
            const raw = localStorage.getItem(MUSIC_BIO_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as Partial<MusicBioSettings>;
                setMusicBio({
                    ...defaultMusicBioSettings(),
                    ...parsed,
                    idleText: String(parsed?.idleText ?? "").trim() || DEFAULT_IDLE_BIO,
                    pollIntervalSec: clampPollInterval(Number(parsed?.pollIntervalSec ?? 15))
                });
            }
        } catch {
            // Ignore broken local storage values
        }
        setMusicSettingsHydrated(true);
    }, []);

    useEffect(() => {
        if (!musicSettingsHydrated) return;
        localStorage.setItem(MUSIC_BIO_STORAGE_KEY, JSON.stringify({
            ...musicBio,
            pollIntervalSec: clampPollInterval(musicBio.pollIntervalSec)
        }));
    }, [musicBio, musicSettingsHydrated]);

    const fetchLastFmNowPlaying = async (settings: MusicBioSettings): Promise<NowPlayingTrack | null> => {
        const username = settings.lastfmUsername.trim();
        const apiKey = settings.lastfmApiKey.trim();
        if (!username || !apiKey) return null;
        const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${encodeURIComponent(apiKey)}&format=json&limit=1`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Last.fm HTTP ${response.status}`);
        const payload = await response.json();
        const recentTracks = payload?.recenttracks?.track;
        const track = Array.isArray(recentTracks) ? recentTracks[0] : recentTracks;
        if (!track) return null;
        const nowPlaying = String(track?.["@attr"]?.nowplaying || "").toLowerCase() === "true";
        if (!nowPlaying) return null;

        return {
            sourceLabel: "Last.fm",
            artist: String(track?.artist?.["#text"] || "").trim(),
            title: String(track?.name || "").trim(),
            album: String(track?.album?.["#text"] || "").trim()
        };
    };

    const applyIdleBio = useCallback(async () => {
        if (!lcu) return;
        const idle = truncateBio(musicBio.idleText.trim() || DEFAULT_IDLE_BIO);
        if (!idle) return;
        try {
            await invoke("update_bio", { port: lcu.port, token: lcu.token, newBio: idle });
            lastAutoBioRef.current = idle;
            addLog(`Music idle bio restored: "${idle}"`);
        } catch (err) {
            addLog(`Failed to restore idle bio: ${err}`);
        }
    }, [lcu, musicBio.idleText, addLog]);

    useEffect(() => {
        if (!musicBio.enabled || !lcu) return;

        let cancelled = false;
        let intervalId: number | undefined;

        const syncNowPlaying = async () => {
            if (cancelled || musicSyncRunningRef.current) return;
            musicSyncRunningRef.current = true;
            try {
                const settings = { ...musicBio, pollIntervalSec: clampPollInterval(musicBio.pollIntervalSec) };
                const track = await fetchLastFmNowPlaying(settings);

                let nextBio = "";
                if (track) {
                    nextBio = buildBioFromTemplate(settings.template, track);
                } else if (settings.idleText.trim()) {
                    nextBio = truncateBio(settings.idleText);
                }

                if (!nextBio || nextBio === lastAutoBioRef.current) return;
                await invoke("update_bio", { port: lcu.port, token: lcu.token, newBio: nextBio });
                lastAutoBioRef.current = nextBio;
                musicSyncLastErrorRef.current = "";
                addLog(`Music bio updated (lastfm): "${nextBio}"`);
            } catch (err) {
                const errorText = String(err);
                if (errorText !== musicSyncLastErrorRef.current) {
                    musicSyncLastErrorRef.current = errorText;
                    addLog(`Music bio sync error: ${errorText}`);
                }
            } finally {
                musicSyncRunningRef.current = false;
            }
        };

        syncNowPlaying();
        intervalId = window.setInterval(syncNowPlaying, clampPollInterval(musicBio.pollIntervalSec) * 1000);

        return () => {
            cancelled = true;
            if (intervalId) window.clearInterval(intervalId);
        };
    }, [musicBio, lcu, addLog]);

    useEffect(() => {
        if (musicBio.enabled && lcu) return;
        musicSyncRunningRef.current = false;
        musicSyncLastErrorRef.current = "";
        lastAutoBioRef.current = "";
    }, [musicBio.enabled, lcu]);

    return { musicBio, setMusicBio, applyIdleBio };
}
