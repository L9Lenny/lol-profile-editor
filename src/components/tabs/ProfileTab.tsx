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

interface TokenDef {
    id: number;
    name: string;
    level: string;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ lcu, loading, setLoading, showToast, addLog, lcuRequest }) => {
    const [bio, setBio] = useState("");
    const [availability, setAvailability] = useState("chat");

    const [tokens, setTokens] = useState<TokenDef[]>([]);
    const [slot1, setSlot1] = useState<number>(-1);
    const [slot2, setSlot2] = useState<number>(-1);
    const [slot3, setSlot3] = useState<number>(-1);

    const statusLabel = (value: string) => {
        switch (value) {
            case "chat": return "ONLINE";
            case "away": return "AWAY";
            case "mobile": return "MOBILE";
            case "offline": return "OFFLINE";
            default: return value.toUpperCase();
        }
    };

    const fetchTopChallenges = async () => {
        if (!lcu) return;
        try {
            const summaryRes: any = await lcuRequest("GET", "/lol-challenges/v1/summary-player-data/local-player");
            if (summaryRes?.topChallenges) {
                const tops = summaryRes.topChallenges;
                if (tops[0]) setSlot1(tops[0].id);
                if (tops[1]) setSlot2(tops[1].id);
                if (tops[2]) setSlot3(tops[2].id);
            } else if (summaryRes?.selectedChallengesString) {
                const split = summaryRes.selectedChallengesString.split(',').map((s: string) => parseInt(s));
                if (split[0]) setSlot1(split[0]);
                if (split[1]) setSlot2(split[1]);
                if (split[2]) setSlot3(split[2]);
            }
        } catch (err) {
            console.error("Failed to fetch top challenges", err);
        }
    };

    const fetchTokens = async () => {
        if (!lcu) return;
        try {
            const challengesRes: any = await lcuRequest("GET", "/lol-challenges/v1/challenges/local-player");
            const tokenList: TokenDef[] = [];
            Object.values(challengesRes).forEach((ch: any) => {
                if (ch.currentLevel && ch.currentLevel !== 'NONE') {
                    tokenList.push({ id: ch.id, name: ch.name || `Token ${ch.id}`, level: ch.currentLevel });
                }
            });
            tokenList.sort((a, b) => a.name.localeCompare(b.name));
            setTokens(tokenList);
        } catch (err) {
            addLog(`Failed to fetch possessed tokens: ${err}`);
        }
    };

    const refreshAvailability = async () => {
        if (!lcu) return;
        try {
            const chatRes = await lcuRequest("GET", "/lol-chat/v1/me");
            if ((chatRes as any)?.availability) {
                setAvailability((chatRes as any).availability);
            }
        } catch (err) {
            addLog(`Status sync failed: ${err}`);
        }
    };

    useEffect(() => {
        if (lcu) {
            refreshAvailability();
            fetchTokens();
            fetchTopChallenges();
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

    const applyTokens = async () => {
        if (!lcu) return;
        setLoading(true);
        try {
            const payload = [
                slot1 !== -1 ? slot1 : null,
                slot2 !== -1 ? slot2 : null,
                slot3 !== -1 ? slot3 : null
            ].filter(x => x !== null);
            await lcuRequest("POST", "/lol-challenges/v1/update-player-preferences", { challengeIds: payload });
            showToast("Tokens updated!", "success");
            addLog(`Tokens updated: ${payload.join(", ")}`);
        } catch (err) {
            showToast("Failed to update tokens", "error");
            addLog(`Tokens update failed: ${err}`);
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

            <div className="card" style={{ marginTop: '20px' }}>
                <h3 className="card-title">Profile Tokens</h3>
                <p style={{ margin: '0 0 15px 0', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                    Select up to 3 tokens for your profile. You can duplicate the same token across multiple slots!
                </p>
                <div className="input-group" style={{ marginBottom: '10px' }}>
                    <label>Token Slot 1</label>
                    <select className="availability-select" value={slot1} onChange={e => setSlot1(parseInt(e.target.value))} disabled={!lcu || loading}>
                        <option value={-1}>None</option>
                        {tokens.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.level})</option>
                        ))}
                    </select>
                </div>
                <div className="input-group" style={{ marginBottom: '10px' }}>
                    <label>Token Slot 2</label>
                    <select className="availability-select" value={slot2} onChange={e => setSlot2(parseInt(e.target.value))} disabled={!lcu || loading}>
                        <option value={-1}>None</option>
                        {tokens.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.level})</option>
                        ))}
                    </select>
                </div>
                <div className="input-group" style={{ marginBottom: '15px' }}>
                    <label>Token Slot 3</label>
                    <select className="availability-select" value={slot3} onChange={e => setSlot3(parseInt(e.target.value))} disabled={!lcu || loading}>
                        <option value={-1}>None</option>
                        {tokens.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.level})</option>
                        ))}
                    </select>
                </div>
                <button className="primary-btn" onClick={applyTokens} disabled={!lcu || loading} style={{ width: '100%' }}>
                    APPLY TOKENS
                </button>
            </div>

            {!lcu && <p style={{ color: '#ff3232', fontSize: '0.8rem', marginTop: '15px', textAlign: 'center' }}>⚠ Start League of Legends to enable this feature.</p>}
        </div>
    );
};

export default ProfileTab;
