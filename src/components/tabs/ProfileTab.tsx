import React, { useState, useEffect } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { LcuInfo } from '../../hooks/useLcu';

interface ProfileTabProps {
    lcu: LcuInfo | null;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    showToast: (text: string, type: string) => void;
    addLog: (msg: string) => void;
    lcuRequest: (method: string, endpoint: string, body?: Record<string, unknown>) => Promise<any>;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ lcu, loading, setLoading, showToast, addLog, lcuRequest }) => {
    const [bio, setBio] = useState("");
    const [availability, setAvailability] = useState("chat");

    const statusLabel = (value: string) => {
        switch (value) {
            case "chat": return "ONLINE";
            case "away": return "AWAY";
            case "mobile": return "MOBILE";
            case "offline": return "OFFLINE";
            default: return value.toUpperCase();
        }
    };

    const refreshAvailability = async () => {
        if (!lcu) return;
        try {
            const chatRes: any = await lcuRequest("GET", "/lol-chat/v1/me");
            if (chatRes?.availability) {
                setAvailability(chatRes.availability);
            }
        } catch (err) {
            addLog(`Status sync failed: ${err}`);
        }
    };

    useEffect(() => {
        if (lcu) {
            refreshAvailability();
        }
    }, [lcu]);

    const handleUpdateBio = async () => {
        if (!lcu) return;
        setLoading(true);
        try {
            await invoke("update_bio", { port: lcu.port, token: lcu.token, newBio: bio });
            addLog(`Bio updated: "${bio}"`);
            showToast("Bio Updated!", "success");
        } catch (err) {
            showToast("Failed to update bio", "error");
        } finally { setLoading(false); }
    };

    const applyAvailability = async (next?: string) => {
        if (!lcu) return;
        const target = (next || availability).trim();
        if (!target) return;
        const previous = availability;
        if (next) setAvailability(next);
        setLoading(true);
        try {
            await lcuRequest("PUT", "/lol-chat/v1/me", { availability: target });
            showToast(`Status set to ${statusLabel(target)}`, "success");
            addLog(`Status updated: ${statusLabel(target)}.`);
        } catch (err) {
            if (next) setAvailability(previous);
            showToast("Failed to update status", "error");
            addLog(`Status update failed: ${err}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="tab-content fadeIn">
            <div className="card">
                <h3 className="card-title">Profile Bio & Status</h3>
                <div className="input-group">
                    <label htmlFor="bio-input">New Status Message</label>
                    <textarea
                        id="bio-input"
                        placeholder="Tell your friends what you're up to..."
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        disabled={!lcu || loading}
                        rows={4}
                    />
                </div>
                <button className="primary-btn" onClick={handleUpdateBio} disabled={!lcu || loading || !bio.trim()} style={{ width: '100%', marginTop: '20px' }}>APPLY BIO</button>

                {lcu && (
                    <div style={{ marginTop: '25px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <label htmlFor="availability-select" style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Chat Availability</label>
                            <span className={`availability-pill ${availability}`}>
                                <span className="availability-dot"></span>
                                {statusLabel(availability)}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <select id="availability-select" className="availability-select" value={availability} onChange={(e) => setAvailability(e.target.value)} style={{ flex: 2 }}>
                                {[
                                    { value: "chat", label: "ONLINE" },
                                    { value: "away", label: "AWAY" },
                                    { value: "mobile", label: "MOBILE" },
                                    { value: "offline", label: "OFFLINE" }
                                ].map(state => (
                                    <option key={state.value} value={state.value}>{state.label}</option>
                                ))}
                            </select>
                            <button className="primary-btn availability-apply" onClick={() => applyAvailability()} disabled={!lcu || loading} style={{ flex: 1 }}>
                                APPLY
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {!lcu && <p style={{ color: '#ff3232', fontSize: '0.8rem', marginTop: '15px', textAlign: 'center' }}>⚠ Start League of Legends to enable this feature.</p>}
        </div>
    );
};

export default ProfileTab;
