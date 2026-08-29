import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { LcuInfo } from '../../hooks/useLcu';
import { LcuRequestFn, patchChatLol } from '../../utils/chatMe';
import { 
    SAVED_RANK_QUEUE_KEY, 
    SAVED_RANK_TIER_KEY, 
    SAVED_RANK_DIV_KEY, 
    SAVED_CHALLENGE_CRYSTAL_KEY, 
    SAVED_CHALLENGE_POINTS_KEY 
} from '../../storageKeys';
import { Shield, Sparkles, RefreshCw } from 'lucide-react';

interface RankTabProps {
    lcu: LcuInfo | null;
    showToast: (text: string, type: string) => void;
    addLog: (msg: string) => void;
    lcuRequest: LcuRequestFn;
}

const TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
const DIVISIONS = ["I", "II", "III", "IV"];
const QUEUES = [
    { value: "RANKED_SOLO_5x5", label: "Solo/Duo" },
    { value: "RANKED_FLEX_SR", label: "Flex 5v5" },
    { value: "RANKED_FLEX_TT", label: "Flex 3v3" },
    { value: "RANKED_TFT", label: "TFT" }
];
const CRYSTAL_TIERS = ["NONE", "IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];

const TIER_COLORS: Record<string, string> = {
    NONE: "#595959",
    IRON: "#595959",
    BRONZE: "#8b5a2b",
    SILVER: "#c0c0c0",
    GOLD: "#ffd700",
    PLATINUM: "#00ced1",
    EMERALD: "#2ecc71",
    DIAMOND: "#1e90ff",
    MASTER: "#8a2be2",
    GRANDMASTER: "#ff4500",
    CHALLENGER: "#00ffff"
};

const RankTab: React.FC<RankTabProps> = ({ lcu, showToast, addLog, lcuRequest }) => {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    // Rank states
    const [soloTier, setSoloTier] = useState("CHALLENGER");
    const [soloDiv, setSoloDiv] = useState("I");
    const [queueType, setQueueType] = useState("RANKED_SOLO_5x5");

    // Challenge stats
    const [challengeCrystalLevel, setChallengeCrystalLevel] = useState("CHALLENGER");
    const [challengePoints, setChallengePoints] = useState("1200");

    const applyLolData = useCallback((raw: string | Record<string, unknown>) => {
        const lol = typeof raw === 'string' ? JSON.parse(raw) as Record<string, unknown> : raw;
        if (lol.rankedLeagueTier) setSoloTier(lol.rankedLeagueTier as string);
        if (lol.rankedLeagueDivision) setSoloDiv(lol.rankedLeagueDivision as string);
        if (lol.rankedLeagueQueue) setQueueType(lol.rankedLeagueQueue as string);
        if (lol.challengeCrystalLevel) setChallengeCrystalLevel(lol.challengeCrystalLevel as string);
        if (lol.challengePoints !== undefined) {
            const cp = lol.challengePoints;
            setChallengePoints(typeof cp === 'number' || typeof cp === 'string' ? String(cp) : "0");
        }
    }, []);

    const fetchCurrentData = useCallback(async () => {
        if (!lcu) return;
        setFetching(true);
        try {
            addLog("Syncing rank status from LCU...");
            
            const chatRes = await lcuRequest("GET", "/lol-chat/v1/me") as { lol?: string | Record<string, unknown> } | null;
            if (chatRes?.lol) {
                applyLolData(chatRes.lol);
            }

            addLog("Rank status synced successfully.");
        } catch (err) {
            addLog(`Failed to fetch current status: ${err}`);
        } finally {
            setFetching(false);
        }
    }, [lcu, lcuRequest, addLog, applyLolData]);

    useEffect(() => {
        if (lcu) {
            fetchCurrentData();
        }
    }, [lcu, fetchCurrentData]);

    const applyChanges = async () => {
        if (!lcu) return;
        setLoading(true);
        try {
            // Serialized RMW: read latest lol, apply overrides, write back.
            // This prevents races with other components editing the same field.
            await patchChatLol(lcuRequest, (current) => ({
                ...current,
                rankedLeagueTier: soloTier,
                rankedLeagueDivision: soloDiv,
                rankedLeagueQueue: queueType,
                challengeCrystalLevel: challengeCrystalLevel,
                challengePoints: String(challengePoints || "0")
            }));

            // Save overrides to local storage for the Auto-Enforcer
            localStorage.setItem(SAVED_RANK_QUEUE_KEY, queueType);
            localStorage.setItem(SAVED_RANK_TIER_KEY, soloTier);
            localStorage.setItem(SAVED_RANK_DIV_KEY, soloDiv);
            localStorage.setItem(SAVED_CHALLENGE_CRYSTAL_KEY, challengeCrystalLevel);
            localStorage.setItem(SAVED_CHALLENGE_POINTS_KEY, String(challengePoints || "0"));

            // Write config for Pengu Loader plugin
            try {
                await invoke("save_rank_config", { tier: soloTier, division: soloDiv, queue: queueType });
            } catch (e) {
                // Plugin may not be installed — ignore silently
            }

            showToast("Rank Overrides Applied!", "success");
            addLog(`Rank overrides updated successfully.`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            showToast(`Customization failed: ${errorMessage}`, "error");
            addLog(`Customization application failed: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const hasDivision = !["MASTER", "GRANDMASTER", "CHALLENGER"].includes(soloTier);

    return (
        <div className="tab-content fadeIn" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
            
            {/* LEFT PANEL: Ranks & Challenge Stats Selectors */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Shield size={20} color="var(--hextech-gold)" />
                        <h3 className="card-title" style={{ margin: 0 }}>Rank &amp; Stats Overrides</h3>
                    </div>
                    <button type="button" 
                        className={`refresh-icon-btn ${fetching ? 'loading' : ''}`}
                        onClick={fetchCurrentData}
                        disabled={!lcu || fetching}
                        title="Sync from Client"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '-10px 0 0 0' }}>
                    Modify your visible rank, queue type, and challenge stats displayed in the client chat and hover cards.
                </p>

                {/* Queue Selection (Segmented Control) */}
                <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                    <legend style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Queue Type</legend>
                    <div className="rank-queue-toggles">
                        {QUEUES.map(q => (
                            <button type="button"
                                key={q.value}
                                className={`rank-queue-btn ${queueType === q.value ? 'active' : ''}`}
                                onClick={() => setQueueType(q.value)}
                                disabled={!lcu}
                            >
                                {q.label}
                            </button>
                        ))}
                    </div>
                </fieldset>

                {/* Tier Selection Grid */}
                <fieldset style={{ border: 'none', padding: 0, margin: '15px 0 0 0' }}>
                    <legend style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Rank Tier</legend>
                    <div className="tier-grid">
                        {TIERS.map(t => {
                            const isActive = soloTier === t;
                            const color = TIER_COLORS[t] || "#ffffff";
                            return (
                                <button type="button"
                                    key={t}
                                    className={`tier-btn ${isActive ? 'active' : ''}`}
                                    style={isActive ? { color, borderColor: color, boxShadow: `0 0 15px ${color}40, inset 0 0 8px ${color}20` } : {}}
                                    onClick={() => setSoloTier(t)}
                                    disabled={!lcu}
                                >
                                    <Shield size={24} color={isActive ? color : "var(--text-secondary)"} />
                                    {t}
                                </button>
                            );
                        })}
                    </div>
                </fieldset>

                {/* Division Selection Grid */}
                {hasDivision && (
                    <fieldset style={{ border: 'none', padding: 0, margin: '15px 0 0 0' }}>
                        <legend style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Division</legend>
                        <div className="division-grid">
                            {DIVISIONS.map(d => (
                                <button type="button"
                                    key={d}
                                    className={`division-btn ${soloDiv === d ? 'active' : ''}`}
                                    onClick={() => setSoloDiv(d)}
                                    disabled={!lcu}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    </fieldset>
                )}

                <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)' }} />

                {/* Challenge Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div className="input-group">
                        <label htmlFor="crystal-tier-select">Challenge Crystal Level</label>
                        <select id="crystal-tier-select" value={challengeCrystalLevel} onChange={(e) => setChallengeCrystalLevel(e.target.value)} disabled={!lcu}>
                            {CRYSTAL_TIERS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="input-group">
                        <label htmlFor="challenge-points-input">Challenge Points</label>
                        <input 
                            id="challenge-points-input" 
                            type="number" 
                            value={challengePoints} 
                            onChange={(e) => setChallengePoints(e.target.value)} 
                            placeholder="e.g. 1200"
                            disabled={!lcu}
                        />
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL: Preview & Apply */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <div className="profile-preview-card">
                    <div style={{ position: 'absolute', top: 15, left: 15, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        <Sparkles size={14} color="var(--hextech-gold)" /> Preview
                    </div>
                    
                    <div className="profile-rank-display">
                        <div className="profile-rank-tier" style={{ color: TIER_COLORS[soloTier] || "#ffffff" }}>
                            {soloTier} {hasDivision ? soloDiv : ''}
                        </div>
                        <div className="profile-rank-queue">
                            {QUEUES.find(q => q.value === queueType)?.label || queueType}
                        </div>
                    </div>

                    <div className="profile-challenge-crystal">
                        <div className="profile-crystal-dot" style={{ color: TIER_COLORS[challengeCrystalLevel] || "#595959", backgroundColor: TIER_COLORS[challengeCrystalLevel] || "#595959" }}></div>
                        {challengeCrystalLevel} Crystal
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>• {challengePoints} pts</span>
                    </div>
                </div>

                <div className="card">
                    <button type="button" 
                        className="primary-btn" 
                        style={{ width: '100%', padding: '16px', fontSize: '1rem', fontWeight: 'bold', letterSpacing: '1px' }} 
                        onClick={applyChanges} 
                        disabled={!lcu || loading || fetching}
                    >
                        {loading ? 'APPLYING...' : 'APPLY RANK OVERRIDES'}
                    </button>
                    {!lcu && (
                        <p style={{ color: '#ff3232', fontSize: '0.85rem', margin: '10px 0 0 0', textAlign: 'center' }}>
                            ⚠ League client connection required.
                        </p>
                    )}
                </div>

            </div>
        </div>
    );
};

export default React.memo(RankTab);
