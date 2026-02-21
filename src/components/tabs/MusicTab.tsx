import React, { useState } from 'react';
import { openUrl } from "@tauri-apps/plugin-opener";
import { LcuInfo } from '../../hooks/useLcu';
import { MusicBioSettings, DEFAULT_IDLE_BIO, clampPollInterval } from '../../hooks/useMusicSync';

interface MusicTabProps {
    lcu: LcuInfo | null;
    musicBio: MusicBioSettings;
    setMusicBio: React.Dispatch<React.SetStateAction<MusicBioSettings>>;
    showToast: (text: string, type: string) => void;
    addLog: (msg: string) => void;
    applyIdleBio: () => Promise<void>;
}

const MusicTab: React.FC<MusicTabProps> = ({ lcu, musicBio, setMusicBio, showToast, addLog, applyIdleBio }) => {
    const [lastFmCheckLoading, setLastFmCheckLoading] = useState(false);

    const canEnableCurrentSource = !!musicBio.lastfmUsername.trim() && !!musicBio.lastfmApiKey.trim();
    const musicIsActive = musicBio.enabled && !!lcu;

    const normalizeLastFmUsername = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return "";
        const lastFmUsernameRegex = /last\.fm\/user\/([^/?#]+)/i;
        const match = lastFmUsernameRegex.exec(trimmed);
        return match ? decodeURIComponent(match[1]) : trimmed;
    };

    const enableMusicSync = () => {
        if (!canEnableCurrentSource) {
            showToast("Complete account fields first", "error");
            return;
        }
        setMusicBio(prev => ({ ...prev, enabled: true }));
        showToast("Music sync enabled", "success");
    };

    const disableMusicSync = async () => {
        await applyIdleBio();
        setMusicBio(prev => ({ ...prev, enabled: false }));
        showToast("Music sync disabled", "success");
    };

    const quickSetupLastFm = async () => {
        try { await openUrl("https://www.last.fm/api/account/create"); } catch { }
    };

    const testLastFmSetup = async () => {
        const username = musicBio.lastfmUsername.trim();
        const apiKey = musicBio.lastfmApiKey.trim();
        if (!username || !apiKey) {
            showToast("Insert Last.fm username and API key", "error");
            return;
        }
        setLastFmCheckLoading(true);
        try {
            const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${encodeURIComponent(apiKey)}&format=json&limit=1`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const payload = await response.json();
            if (!payload?.recenttracks?.track) throw new Error("Invalid response");
            showToast("Last.fm connected", "success");
            addLog("Last.fm credentials validated.");
        } catch (err) {
            showToast("Last.fm validation failed", "error");
            addLog(`Last.fm validation failed: ${err}`);
        } finally {
            setLastFmCheckLoading(false);
        }
    };

    return (
        <div className="tab-content fadeIn">
            <div className="card">
                <h3 className="card-title">Music Auto Bio</h3>
                <p className="music-subtitle">
                    Configure Last.fm once. Then your League bio updates automatically while you listen.
                </p>

                <div className="music-badges">
                    <span className={`music-badge ${lcu ? "ok" : "warn"}`}>LCU {lcu ? "Connected" : "Not Connected"}</span>
                    <span className={`music-badge ${canEnableCurrentSource ? "ok" : "warn"}`}>Last.fm {canEnableCurrentSource ? "Ready" : "Missing Data"}</span>
                    <span className={`music-badge ${musicIsActive ? "ok" : "warn"}`}>Auto Bio {musicBio.enabled ? "Enabled" : "Disabled"}</span>
                </div>

                <div className="music-step-grid">
                    <div className="music-step-card">
                        <div className="music-step-kicker">Step 1</div>
                        <h4>Get Last.fm API Key</h4>
                        <p>Open Last.fm and create your API key in one click.</p>
                        <button type="button" className="ghost-btn" onClick={quickSetupLastFm}>
                            Open Last.fm API Page
                        </button>
                    </div>
                    <div className="music-step-card">
                        <div className="music-step-kicker">Step 2</div>
                        <h4>Connect Account</h4>
                        <p>Paste username and API key, then test if everything is valid.</p>
                        <button type="button" className="ghost-btn" onClick={testLastFmSetup} disabled={lastFmCheckLoading || !canEnableCurrentSource}>
                            {lastFmCheckLoading ? "Checking..." : "Test Last.fm Connection"}
                        </button>
                    </div>
                    <div className="music-step-card">
                        <div className="music-step-kicker">Step 3</div>
                        <h4>Enable Auto Bio</h4>
                        <p>Turn on automatic sync and keep your bio always updated.</p>
                        <button type="button" className="primary-btn" onClick={enableMusicSync} disabled={!lcu || !canEnableCurrentSource}>
                            Enable Auto Bio
                        </button>
                    </div>
                </div>

                <div className="music-form-grid">
                    <div className="input-group" style={{ margin: 0 }}>
                        <label>Last.fm Username or Profile URL</label>
                        <input
                            value={musicBio.lastfmUsername}
                            onChange={(e) => setMusicBio(prev => ({ ...prev, lastfmUsername: normalizeLastFmUsername(e.target.value) }))}
                            placeholder="last.fm/user/yourname or yourname"
                        />
                    </div>
                    <div className="input-group" style={{ margin: 0 }}>
                        <label>Last.fm API Key</label>
                        <input
                            value={musicBio.lastfmApiKey}
                            onChange={(e) => setMusicBio(prev => ({ ...prev, lastfmApiKey: e.target.value.trim() }))}
                            placeholder="paste your Last.fm API key"
                        />
                    </div>
                </div>

                <div className="music-form-grid" style={{ marginTop: '12px' }}>
                    <div className="input-group" style={{ margin: 0 }}>
                        <label>Bio Template</label>
                        <input
                            value={musicBio.template}
                            onChange={(e) => setMusicBio(prev => ({ ...prev, template: e.target.value }))}
                            placeholder="Listening to {title} - {artist}"
                        />
                        <p className="music-help">Use: {"{title}"} {"{artist}"} {"{album}"} {"{source}"}</p>
                    </div>
                    <div className="input-group" style={{ margin: 0 }}>
                        <label>Idle Text</label>
                        <input
                            value={musicBio.idleText}
                            onChange={(e) => setMusicBio(prev => ({ ...prev, idleText: e.target.value }))}
                            placeholder={DEFAULT_IDLE_BIO}
                        />
                    </div>
                </div>

                <div className="music-actions-row">
                    <div className="input-group" style={{ margin: 0, minWidth: 170 }}>
                        <label>Sync Interval (sec)</label>
                        <input
                            type="number"
                            min={5}
                            max={120}
                            step={1}
                            value={musicBio.pollIntervalSec}
                            onChange={(e) => setMusicBio(prev => ({ ...prev, pollIntervalSec: clampPollInterval(Number(e.target.value)) }))}
                        />
                    </div>
                    <button type="button" className="primary-btn" onClick={enableMusicSync} disabled={!lcu || !canEnableCurrentSource}>
                        {musicBio.enabled ? "Update Auto Bio" : "Connect & Enable"}
                    </button>
                    <button type="button" className="ghost-btn" onClick={disableMusicSync} disabled={!musicBio.enabled}>
                        Disable
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MusicTab;
