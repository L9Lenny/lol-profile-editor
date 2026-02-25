import React, { useState } from 'react';
import { openUrl } from "@tauri-apps/plugin-opener";
import { LcuInfo } from '../../hooks/useLcu';
import { MusicBioSettings, DEFAULT_IDLE_BIO, clampPollInterval } from '../../hooks/useMusicSync';
import { Disc3, HelpCircle, ChevronRight, ChevronDown, ExternalLink, Activity, Info } from 'lucide-react';

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

    // Auto-hide help if already setup
    const [showHelp, setShowHelp] = useState(!(musicBio.lastfmUsername.trim() && musicBio.lastfmApiKey.trim()));

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
        try {
            await openUrl("https://www.last.fm/api/account/create");
        } catch (err) {
            addLog(`Failed to open Last.fm setup: ${err}`);
        }
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Disc3 size={20} style={{ color: 'var(--hextech-gold)' }} />
                        <h3 className="card-title" style={{ margin: 0 }}>Music Auto Bio</h3>
                    </div>

                    <div className="music-badges" style={{ margin: 0, gap: '6px' }}>
                        <span className={`music-badge ${lcu ? "ok" : "warn"}`} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div className="status-dot" style={{ background: lcu ? '#00ff88' : '#ffb347', boxShadow: lcu ? '0 0 5px #00ff88' : 'none' }}></div> LCU
                        </span>
                        <span className={`music-badge ${canEnableCurrentSource ? "ok" : "warn"}`} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div className="status-dot" style={{ background: canEnableCurrentSource ? '#00ff88' : '#ffb347', boxShadow: canEnableCurrentSource ? '0 0 5px #00ff88' : 'none' }}></div> Last.fm
                        </span>
                        <span className={`music-badge ${musicIsActive ? "ok" : "warn"}`} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div className="status-dot" style={{ background: musicBio.enabled ? '#00ff88' : '#a09b8c', boxShadow: musicBio.enabled ? '0 0 5px #00ff88' : 'none' }}></div> Auto Bio
                        </span>
                    </div>
                </div>

                <p className="music-subtitle" style={{ marginBottom: '20px' }}>
                    Configure Last.fm once. Then your League bio updates automatically while you listen.
                </p>

                <div style={{ marginBottom: '20px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '8px', overflow: 'hidden' }}>
                    <button
                        type="button"
                        onClick={() => setShowHelp(!showHelp)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: showHelp ? 'rgba(255,255,255,0.02)' : 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <HelpCircle size={16} style={{ color: 'var(--hextech-gold)' }} />
                            <span style={{ fontSize: '0.80rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Quick Setup Guide</span>
                        </div>
                        {showHelp ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>

                    {showHelp && (
                        <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', animation: 'fadeIn 0.2s' }}>
                            <div className="music-step-grid" style={{ marginTop: '16px', marginBottom: 0 }}>
                                <div className="music-step-card">
                                    <div className="music-step-kicker">Step 1</div>
                                    <h4>Get Last.fm API Key</h4>
                                    <p style={{ fontSize: '0.75rem' }}>Create your API key in one click.</p>
                                    <button type="button" className="ghost-btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={quickSetupLastFm}>
                                        <ExternalLink size={12} /> Open Last.fm
                                    </button>
                                </div>
                                <div className="music-step-card">
                                    <div className="music-step-kicker">Step 2</div>
                                    <h4>Connect Account</h4>
                                    <p style={{ fontSize: '0.75rem' }}>Paste username and API key below.</p>
                                    <button type="button" className="ghost-btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={testLastFmSetup} disabled={lastFmCheckLoading || !canEnableCurrentSource}>
                                        <Activity size={12} /> {lastFmCheckLoading ? "Checking..." : "Test Setup"}
                                    </button>
                                </div>
                                <div className="music-step-card">
                                    <div className="music-step-kicker">Step 3</div>
                                    <h4>Enable Auto Bio</h4>
                                    <p style={{ fontSize: '0.75rem' }}>Keep your bio always updated.</p>
                                    <button type="button" className="primary-btn" style={{ width: '100%', padding: '6px 12px', fontSize: '0.75rem' }} onClick={enableMusicSync} disabled={!lcu}>
                                        Enable Sync
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="music-form-grid" style={{ marginBottom: '16px' }}>
                    <div className="input-group" style={{ margin: 0 }}>
                        <label htmlFor="lastfm-user">Last.fm Username / URL</label>
                        <input
                            id="lastfm-user"
                            value={musicBio.lastfmUsername}
                            onChange={(e) => {
                                const val = e.target.value;
                                setMusicBio(prev => ({ ...prev, lastfmUsername: normalizeLastFmUsername(val) }));
                            }}
                            placeholder="last.fm/user/yourname or yourname"
                        />
                    </div>
                    <div className="input-group" style={{ margin: 0 }}>
                        <label htmlFor="lastfm-key">Last.fm API Key</label>
                        <input
                            id="lastfm-key"
                            value={musicBio.lastfmApiKey}
                            onChange={(e) => setMusicBio(prev => ({ ...prev, lastfmApiKey: e.target.value.trim() }))}
                            placeholder="paste your Last.fm API key"
                        />
                    </div>
                    <div className="input-group" style={{ margin: 0 }}>
                        <label htmlFor="bio-template">Bio Template</label>
                        <input
                            id="bio-template"
                            value={musicBio.template}
                            onChange={(e) => setMusicBio(prev => ({ ...prev, template: e.target.value }))}
                            placeholder="Listening to {title} - {artist}"
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                            <Info size={10} /> Use: {"{title}"} {"{artist}"} {"{album}"} {"{source}"}
                        </div>
                    </div>
                    <div className="input-group" style={{ margin: 0 }}>
                        <label htmlFor="idle-text">Idle Text (When no music plays)</label>
                        <input
                            id="idle-text"
                            value={musicBio.idleText}
                            onChange={(e) => setMusicBio(prev => ({ ...prev, idleText: e.target.value }))}
                            placeholder={DEFAULT_IDLE_BIO}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
                    <div className="input-group" style={{ margin: 0, width: '140px' }}>
                        <label htmlFor="sync-interval">Sync Interval (sec)</label>
                        <input
                            id="sync-interval"
                            type="number"
                            min={5}
                            max={120}
                            step={1}
                            style={{ padding: '10px 14px' }}
                            value={musicBio.pollIntervalSec}
                            onChange={(e) => setMusicBio(prev => ({ ...prev, pollIntervalSec: clampPollInterval(Number(e.target.value)) }))}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="button" className="ghost-btn" onClick={disableMusicSync} disabled={!musicBio.enabled}>
                            DISABLE
                        </button>
                        <button type="button" className="primary-btn" style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={enableMusicSync} disabled={!lcu}>
                            {musicBio.enabled && <Activity size={16} className={musicBio.enabled ? "spin" : ""} />}
                            {musicBio.enabled ? "SYNCING BIO..." : "START SYNC"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MusicTab;
