import React, { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { Info, ArrowLeftRight } from 'lucide-react';
import { LcuInfo } from '../../hooks/useLcu';
import { SAVED_BIO_KEY, SAVED_AVAILABILITY_KEY } from '../../hooks/useAutoRestore';
import { SAVED_ENFORCE_OFFLINE_KEY, SAVED_USE_IDLE_AS_BIO_KEY } from '../../storageKeys';
import { AutoExpandingTextarea } from '../../hooks/useAutoGrowingTextarea';
import { useAppStore } from '../../store';
import { truncateBio } from '../../hooks/useMusicSync';

interface ProfileTabProps {
    lcu: LcuInfo | null;
    showToast: (text: string, type: string) => void;
    addLog: (msg: string) => void;
    lcuRequest: (method: string, endpoint: string, body?: Record<string, unknown>) => Promise<unknown>;
    musicSyncActive?: boolean;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ lcu, showToast, addLog, lcuRequest, musicSyncActive = false }) => {
    const [bio, setBio] = useState(() => localStorage.getItem(SAVED_BIO_KEY) ?? "");
    const [availability, setAvailability] = useState("chat");
    const [loading, setLoading] = useState(false);
    const [enforceOffline, setEnforceOffline] = useState(() => localStorage.getItem(SAVED_ENFORCE_OFFLINE_KEY) === 'true');
    const [useIdleAsBio, setUseIdleAsBio] = useState(() => localStorage.getItem(SAVED_USE_IDLE_AS_BIO_KEY) === 'true');
    const bioDirtyRef = useRef(false);

    const musicBio = useAppStore(s => s.musicBio);
    const setMusicBio = useAppStore(s => s.setMusicBio);

    const statusLabel = useCallback((value: string) => {
        switch (value) {
            case "chat":    return "ONLINE";
            case "away":    return "AWAY";
            case "mobile":  return "MOBILE";
            case "offline": return "OFFLINE";
            default:        return value.toUpperCase();
        }
    }, []);

    const refreshProfileData = useCallback(async () => {
        if (!lcu) return;
        try {
            const chatRes = await lcuRequest("GET", "/lol-chat/v1/me") as Record<string, unknown>;
            if (chatRes?.availability) setAvailability(chatRes.availability as string);
            if (!bioDirtyRef.current) {
                const lcuBio = (chatRes?.statusMessage as string) || "";
                if (lcuBio.trim()) {
                    setBio(lcuBio);
                    localStorage.setItem(SAVED_BIO_KEY, lcuBio);
                }
            }
        } catch (err) {
            addLog(`Profile sync failed: ${err instanceof Error ? err.message : String(err)}`);
        }
    }, [lcu, lcuRequest, addLog]);

    useEffect(() => {
        refreshProfileData();
    }, [refreshProfileData]);

    const handleUpdateBio = useCallback(async () => {
        if (!lcu) return;
        setLoading(true);
        try {
            const bioToApply = useIdleAsBio ? musicBio.idleText : bio;
            const truncated = truncateBio(bioToApply.trim());
            await invoke("update_bio", { port: lcu.port, token: lcu.token, newBio: truncated });
            localStorage.setItem(SAVED_BIO_KEY, truncated);
            bioDirtyRef.current = false;
            addLog(`Bio updated: "${truncated}"`);
            showToast("Bio Updated!", "success");
        } catch (err: unknown) {
            showToast("Failed to update bio", "error");
            addLog(`Bio update failed: ${err instanceof Error ? err.message : String(err)}`);
        } finally { setLoading(false); }
    }, [lcu, bio, useIdleAsBio, musicBio.idleText, addLog, showToast]);

    const applyAvailability = useCallback(async (next?: string) => {
        if (!lcu) return;
        const target = (next || availability).trim();
        if (!target) return;
        const previous = availability;
        if (next) setAvailability(next);
        setLoading(true);
        try {
            await lcuRequest("PUT", "/lol-chat/v1/me", { availability: target });
            localStorage.setItem(SAVED_AVAILABILITY_KEY, target);
            showToast(`Status set to ${statusLabel(target)}`, "success");
            addLog(`Status updated: ${statusLabel(target)}.`);
        } catch (err) {
            if (next) setAvailability(previous);
            showToast("Failed to update status", "error");
            addLog(`Status update failed: ${err}`);
        } finally {
            setLoading(false);
        }
    }, [lcu, availability, statusLabel, addLog, showToast]);

    const toggleEnforceOffline = useCallback((checked: boolean) => {
        setEnforceOffline(checked);
        localStorage.setItem(SAVED_ENFORCE_OFFLINE_KEY, checked.toString());
        addLog(`Enforce offline ${checked ? 'enabled' : 'disabled'}.`);
    }, [addLog]);

    const toggleUseIdleAsBio = useCallback((checked: boolean) => {
        setUseIdleAsBio(checked);
        localStorage.setItem(SAVED_USE_IDLE_AS_BIO_KEY, checked.toString());
        addLog(`Use idle text as bio ${checked ? 'enabled' : 'disabled'}.`);
    }, [addLog]);

    const isBusy = musicSyncActive && !useIdleAsBio;

    return (
        <div className="tab-content fadeIn">
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h3 className="card-title" style={{ margin: 0 }}>Profile Bio &amp; Status</h3>
                </div>

                <div style={{ marginBottom: '16px', padding: '10px 14px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                    <label className="checkbox-container" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                            type="checkbox"
                            checked={useIdleAsBio}
                            onChange={(e) => toggleUseIdleAsBio(e.target.checked)}
                            style={{ width: '18px', height: '18px', accentColor: 'var(--hextech-gold)' }}
                        />
                        <span style={{ color: useIdleAsBio ? 'var(--hextech-gold)' : 'var(--text-primary)', transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <ArrowLeftRight size={14} />
                            Use Music Sync idle text as bio
                        </span>
                    </label>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px', marginLeft: '28px' }}>
                        {useIdleAsBio
                            ? "Editing the Music Sync idle text. More room for ASCII art. Disable to use the normal status message."
                            : "Toggle to use the Music Sync idle text (more room) instead of the normal status message."}
                    </div>
                </div>

                {isBusy && (
                    <div style={{ marginBottom: '12px', padding: '8px 12px', background: 'rgba(255, 179, 71, 0.1)', border: '1px solid rgba(255, 179, 71, 0.3)', borderRadius: '8px', fontSize: '0.75rem', color: '#ffb347', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Info size={14} style={{ flexShrink: 0 }} />
                        Music Sync is active — it controls your bio right now. Changes here will be overwritten. Disable Music Sync to use this bio.
                    </div>
                )}

                <div className="input-group">
                    {useIdleAsBio ? (
                        <>
                            <label htmlFor="idle-bio-input">Bio (from Music Sync idle text)</label>
                            <AutoExpandingTextarea
                                id="idle-bio-input"
                                value={musicBio.idleText}
                                onChange={(e) => {
                                    bioDirtyRef.current = true;
                                    setMusicBio(prev => ({ ...prev, idleText: e.target.value }));
                                }}
                                placeholder="Enter your bio text or ASCII art here..."
                                disabled={!lcu || loading}
                                minRows={8}
                                maxRows={200}
                                style={{ background: 'rgba(0, 0, 0, 0.3)', fontFamily: 'monospace', fontSize: '0.80rem' }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                <Info size={10} /> {musicBio.idleText.length} chars
                            </div>
                        </>
                    ) : (
                        <>
                            <label htmlFor="bio-input">New Status Message</label>
                            <AutoExpandingTextarea
                                id="bio-input"
                                value={bio}
                                onChange={(e) => { bioDirtyRef.current = true; setBio(e.target.value); }}
                                placeholder="Tell your friends what you're up to..."
                                disabled={!lcu || loading}
                                minRows={8}
                                maxRows={200}
                                style={{ background: 'rgba(0, 0, 0, 0.3)', fontFamily: 'monospace', fontSize: '0.80rem' }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                <Info size={10} /> {bio.length} chars
                            </div>
                        </>
                    )}
                </div>
                <button type="button" className="primary-btn" onClick={handleUpdateBio} disabled={!lcu || loading || (useIdleAsBio ? !musicBio.idleText.trim() : !bio.trim())} style={{ width: '100%', marginTop: '12px' }}>APPLY BIO</button>

                {lcu && (
                    <div style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label htmlFor="availability-select" style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Chat Availability</label>
                            <span className={`availability-pill ${availability}`}>
                                <span className="availability-dot"></span>
                                {statusLabel(availability)}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <select id="availability-select" className="availability-select" value={availability} onChange={(e) => setAvailability(e.target.value)} disabled={!lcu || loading} style={{ flex: 2 }}>
                                {[
                                    { value: "chat",    label: "ONLINE" },
                                    { value: "away",    label: "AWAY" },
                                    { value: "mobile",  label: "MOBILE" },
                                    { value: "offline", label: "OFFLINE" }
                                ].map(state => (
                                    <option key={state.value} value={state.value}>{state.label}</option>
                                ))}
                            </select>
                            <button type="button" className="primary-btn availability-apply" onClick={() => applyAvailability()} disabled={!lcu || loading} style={{ flex: 1 }}>
                                APPLY
                            </button>
                        </div>
                        <div style={{ marginTop: '12px' }}>
                            <label className="checkbox-container" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.85rem' }}>
                                <input 
                                    type="checkbox" 
                                    checked={enforceOffline} 
                                    onChange={(e) => toggleEnforceOffline(e.target.checked)} 
                                    style={{ width: '18px', height: '18px', accentColor: 'var(--hextech-gold)' }}
                                />
                                <span style={{ color: enforceOffline ? 'var(--hextech-gold)' : 'var(--text-primary)', transition: 'color 0.2s' }}>
                                    Enforce "Offline" status (even in Champ Select)
                                </span>
                            </label>
                        </div>
                    </div>
                )}
            </div>

            {!lcu && <p style={{ color: '#ff3232', fontSize: '0.8rem', marginTop: '15px', textAlign: 'center' }}>⚠ Start League of Legends to enable this feature.</p>}
        </div>
    );
};

export default React.memo(ProfileTab);
