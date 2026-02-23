import React, { useState, useEffect } from 'react';
import { LcuInfo } from '../../hooks/useLcu';
import { X, Search, Award, Info, RotateCw } from 'lucide-react';

interface TokensTabProps {
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
    description: string;
}

const TokensTab: React.FC<TokensTabProps> = ({ lcu, loading, setLoading, showToast, addLog, lcuRequest }) => {
    const [tokens, setTokens] = useState<TokenDef[]>([]);
    const [slot1, setSlot1] = useState<number>(-1);
    const [slot2, setSlot2] = useState<number>(-1);
    const [slot3, setSlot3] = useState<number>(-1);
    const [search, setSearch] = useState("");
    const [activePicker, setActivePicker] = useState<number | null>(null);
    const [hasFetched, setHasFetched] = useState(false);
    const [fetching, setFetching] = useState(false);

    const fetchTopChallenges = React.useCallback(async () => {
        if (!lcu) return;
        try {
            const summaryRes: any = await lcuRequest("GET", "/lol-challenges/v1/summary-player-data/local-player");
            if (summaryRes?.topChallenges && Array.isArray(summaryRes.topChallenges)) {
                const tops = summaryRes.topChallenges;
                setSlot1(tops[0]?.id ?? -1);
                setSlot2(tops[1]?.id ?? -1);
                setSlot3(tops[2]?.id ?? -1);
            } else if (summaryRes?.selectedChallengesString) {
                const split = summaryRes.selectedChallengesString.split(',').filter(Boolean).map((s: string) => parseInt(s));
                setSlot1(split[0] ?? -1);
                setSlot2(split[1] ?? -1);
                setSlot3(split[2] ?? -1);
            }
        } catch (err) {
            console.error("Failed to fetch current tokens", err);
        }
    }, [lcu, lcuRequest]);

    const fetchTokens = React.useCallback(async () => {
        if (!lcu) return;
        setFetching(true);
        try {
            addLog("Fetching tokens from LCU...");
            const challengesRes: any = await lcuRequest("GET", "/lol-challenges/v1/challenges/local-player");

            if (!challengesRes) {
                addLog("Empty response from challenges API.");
                setFetching(false);
                return;
            }

            const tokenList: TokenDef[] = [];

            let entries: any[] = [];
            if (Array.isArray(challengesRes)) {
                entries = challengesRes.map(ch => [ch?.id || ch?.challengeId, ch]);
            } else if (typeof challengesRes === 'object' && challengesRes !== null) {
                entries = Object.entries(challengesRes);
            } else {
                addLog("Invalid response format for tokens.");
                setFetching(false);
                return;
            }

            addLog(`Analyzing ${entries.length} items from LCU...`);

            entries.forEach((entry: any) => {
                const [key, ch] = entry;
                if (!ch || typeof ch !== 'object') return;

                const rawId = ch.id || ch.challengeId || (typeof key === 'string' ? parseInt(key) : key);
                const idNum = typeof rawId === 'number' ? rawId : parseInt(String(rawId), 10);
                const id = !isNaN(idNum) ? idNum : -1;
                const level = ch.currentLevel;
                const name = ch.name;

                if (id > 0 && level && level !== 'NONE' && name) {
                    tokenList.push({
                        id,
                        name,
                        level,
                        description: ch.description || ""
                    });
                }
            });

            tokenList.sort((a, b) => a.name.localeCompare(b.name));
            setTokens(tokenList);
            setHasFetched(true);
            addLog(`Loaded ${tokenList.length} selectable tokens.`);
        } catch (err) {
            addLog(`Error fetching tokens: ${err}`);
            showToast("Failed to load tokens", "error");
        } finally {
            setFetching(false);
        }
    }, [lcu, lcuRequest, addLog, showToast]);

    useEffect(() => {
        if (lcu && !hasFetched && !fetching) {
            fetchTokens();
            fetchTopChallenges();
        } else if (!lcu) {
            setTokens([]);
            setHasFetched(false);
        }
    }, [lcu, hasFetched, fetching, fetchTokens, fetchTopChallenges]);

    const applyTokens = async () => {
        if (!lcu) return;
        setLoading(true);
        try {
            const payload = [slot1, slot2, slot3].filter(id => id !== -1);
            await lcuRequest("POST", "/lol-challenges/v1/update-player-preferences", { challengeIds: payload });
            showToast("Profile tokens updated!", "success");
            addLog(`Tokens updated: [${payload.join(", ")}]`);
        } catch (err) {
            showToast("Failed to update tokens", "error");
            addLog(`Tokens update failed: ${err}`);
        } finally {
            setLoading(false);
        }
    };

    const getTokenImgUrl = (id: number, level: string) => {
        return `https://raw.communitydragon.org/latest/game/assets/challenges/config/${id}/tokens/${level.toLowerCase()}.png`;
    };

    const filteredTokens = tokens.filter(t => {
        const nameMatch = (t?.name || "").toLowerCase().includes(search.toLowerCase());
        const idMatch = (t?.id?.toString() || "").includes(search);
        return nameMatch || idMatch;
    });

    const renderTokenSlot = (slotIndex: number, tokenId: number) => {
        const token = tokens.find(t => t?.id === tokenId);
        return (
            <div className="token-slot-wrapper">
                <div
                    className={`token-slot ${activePicker === slotIndex ? 'active' : ''}`}
                    onClick={() => !loading && setActivePicker(slotIndex)}
                    title={token ? `${token.name} (${token.level})` : "Click to select a token"}
                >
                    {token ? (
                        <img src={getTokenImgUrl(token.id, token.level)} alt={token.name} />
                    ) : (
                        <div className="token-placeholder">+</div>
                    )}
                </div>
                <span className="token-slot-label">Slot {slotIndex}</span>
            </div>
        );
    };

    const selectToken = (id: number) => {
        if (activePicker === 1) setSlot1(id);
        if (activePicker === 2) setSlot2(id);
        if (activePicker === 3) setSlot3(id);
        setActivePicker(null);
    };

    return (
        <div className="tab-content fadeIn">
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Award size={20} style={{ color: 'var(--hextech-gold)' }} />
                        <h3 className="card-title" style={{ margin: 0 }}>Profile Tokens</h3>
                    </div>
                    <button
                        className={`refresh-icon-btn ${fetching ? 'loading' : ''}`}
                        onClick={() => fetchTokens()}
                        disabled={!lcu || loading || fetching}
                        title="Refresh tokens"
                    >
                        <RotateCw size={16} />
                    </button>
                </div>
                <p className="music-subtitle">Click on a slot to select one of your owned tokens.</p>

                <div className="token-slots-container">
                    {renderTokenSlot(1, slot1)}
                    {renderTokenSlot(2, slot2)}
                    {renderTokenSlot(3, slot3)}
                </div>

                <div className="music-badges" style={{ justifyContent: 'center', marginBottom: '20px' }}>
                    <div className="music-badge ok" style={{ fontSize: '0.6rem' }}>{tokens.length} Owned</div>
                </div>

                <button className="primary-btn" onClick={applyTokens} disabled={!lcu || loading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    {loading ? 'APPLYING...' : 'APPLY TO PROFILE'}
                </button>
            </div>

            {!lcu && (
                <div className="card" style={{ borderStyle: 'dashed', opacity: 0.7, textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>League client must be open to change tokens.</p>
                </div>
            )}

            {activePicker && (
                <div className="token-picker-overlay fadeIn" onClick={() => setActivePicker(null)}>
                    <div className="token-picker-modal" onClick={e => e.stopPropagation()}>
                        <div className="token-picker-header">
                            <h3>Select Token (Slot {activePicker})</h3>
                            <button onClick={() => setActivePicker(null)} className="token-picker-close">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="token-picker-search">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Search owned tokens..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="token-picker-grid">
                            <div className="token-item-none" onClick={() => selectToken(-1)} title="Remove token">
                                <div className="token-item-icon">✕</div>
                            </div>
                            {filteredTokens.length === 0 && hasFetched && (
                                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                    <Info size={32} style={{ opacity: 0.3, marginBottom: '10px' }} />
                                    <p>No tokens found.</p>
                                </div>
                            )}
                            {filteredTokens.map(t => (
                                <div key={t.id} className="token-item" onClick={() => selectToken(t.id)} title={`${t.name} (${t.level})\n${t.description}`}>
                                    <div className="token-item-icon">
                                        <img src={getTokenImgUrl(t.id, t.level)} alt={t.name} loading="lazy" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TokensTab;
