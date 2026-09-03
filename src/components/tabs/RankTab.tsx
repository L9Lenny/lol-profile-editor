import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { LcuInfo } from '../../hooks/useLcu';
import { LcuRequestFn, patchChatLol } from '../../utils/chatMe';
import { 
    SAVED_RANK_QUEUE_KEY, 
    SAVED_RANK_TIER_KEY, 
    SAVED_RANK_DIV_KEY, 
    PENGU_OVERVIEW_OVERRIDE_KEY,
    PENGU_PLUGIN_INSTALLED_KEY,
} from '../../storageKeys';
import { Shield, RefreshCw, Monitor, Puzzle, CheckCircle2, AlertTriangle } from 'lucide-react';

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
    const [overviewEnabled, setOverviewEnabled] = useState(() => localStorage.getItem(PENGU_OVERVIEW_OVERRIDE_KEY) !== 'false');
    const pluginInstalled = localStorage.getItem(PENGU_PLUGIN_INSTALLED_KEY) === 'true';

    const applyLolData = useCallback((raw: string | Record<string, unknown>) => {
        const lol = typeof raw === 'string' ? JSON.parse(raw) as Record<string, unknown> : raw;
        if (lol.rankedLeagueTier) setSoloTier(lol.rankedLeagueTier as string);
        if (lol.rankedLeagueDivision) setSoloDiv(lol.rankedLeagueDivision as string);
        if (lol.rankedLeagueQueue) setQueueType(lol.rankedLeagueQueue as string);
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
            }));

            // Save overrides to local storage for the Auto-Enforcer
            localStorage.setItem(SAVED_RANK_QUEUE_KEY, queueType);
            localStorage.setItem(SAVED_RANK_TIER_KEY, soloTier);
            localStorage.setItem(SAVED_RANK_DIV_KEY, soloDiv);
            localStorage.setItem(PENGU_OVERVIEW_OVERRIDE_KEY, overviewEnabled.toString());

            // Write config for Pengu Loader plugin
            try {
                await invoke("save_rank_config", {
                    tier: soloTier,
                    division: soloDiv,
                    queue: queueType,
                    overviewEnabled,
                });
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
        <div className="tab-content fadeIn" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0 20px 40px 20px' }}>
            {/* Header */}
            <div style={{ marginBottom: '16px', flexShrink: 0 }}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Rank Override</h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Customize your visible rank, queue, and profile overview.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minHeight: 0 }}>
                {/* Queue Card */}
                <div className="card" style={{ padding: '12px 16px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <div style={{ 
                            width: '20px', height: '20px', borderRadius: '5px', 
                            background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Shield size={10} style={{ color: 'var(--hextech-gold)' }} />
                        </div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Queue</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                        {QUEUES.map(q => (
                            <button type="button"
                                key={q.value}
                                onClick={() => setQueueType(q.value)}
                                disabled={!lcu}
                                style={{
                                    padding: '8px 6px', border: 'none', borderRight: '1px solid var(--glass-border)',
                                    background: queueType === q.value ? 'rgba(59, 130, 246, 0.12)' : 'rgba(0, 0, 0, 0.2)',
                                    color: queueType === q.value ? 'var(--hextech-gold)' : 'var(--text-secondary)',
                                    fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer',
                                    boxShadow: queueType === q.value ? 'inset 0 -2px #3b82f6' : 'none',
                                    transition: 'all 0.15s'
                                }}
                            >
                                {q.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tier + Division Row */}
                <div style={{ display: 'grid', gridTemplateColumns: hasDivision ? '1fr 180px' : '1fr', gap: '12px' }}>
                    {/* Tier Card */}
                    <div className="card" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexShrink: 0 }}>
                            <div style={{ 
                                width: '20px', height: '20px', borderRadius: '5px', 
                                background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Shield size={10} style={{ color: 'var(--hextech-gold)' }} />
                            </div>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Tier</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                            {TIERS.map(t => {
                                const isActive = soloTier === t;
                                const color = TIER_COLORS[t] || "#ffffff";
                                return (
                                    <button type="button"
                                        key={t}
                                        onClick={() => setSoloTier(t)}
                                        disabled={!lcu}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '4px',
                                            padding: '5px 6px', borderRadius: '6px',
                                            border: isActive ? `1px solid ${color}` : '1px solid var(--glass-border)',
                                            background: isActive ? `${color}12` : 'rgba(0, 0, 0, 0.28)',
                                            color: isActive ? color : 'var(--text-secondary)',
                                            fontSize: '0.58rem', fontWeight: 600, cursor: 'pointer',
                                            boxShadow: isActive ? `inset 2px 0 ${color}` : 'none',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        <Shield size={11} />
                                        {t}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Division Card */}
                    {hasDivision && (
                        <div className="card" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexShrink: 0 }}>
                                <div style={{ 
                                    width: '20px', height: '20px', borderRadius: '5px', 
                                    background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Shield size={10} style={{ color: 'var(--hextech-gold)' }} />
                                </div>
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Division</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                                {DIVISIONS.map(d => (
                                    <button type="button"
                                        key={d}
                                        onClick={() => setSoloDiv(d)}
                                        disabled={!lcu}
                                        style={{
                                            padding: '5px', borderRadius: '6px',
                                            border: soloDiv === d ? '1px solid var(--hextech-gold)' : '1px solid var(--glass-border)',
                                            background: soloDiv === d ? 'rgba(59, 130, 246, 0.12)' : 'rgba(0, 0, 0, 0.28)',
                                            color: soloDiv === d ? 'var(--hextech-gold)' : 'var(--text-secondary)',
                                            fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Row — Preview + PenguLoader + Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '10px', flexShrink: 0 }}>
                    {/* Preview */}
                    <div className="card" style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Preview</div>
                        <div style={{ 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            padding: '10px', borderRadius: '8px',
                            background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--glass-border)',
                            color: TIER_COLORS[soloTier] || '#ffffff'
                        }}>
                            <Shield size={20} />
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{soloTier}{hasDivision ? ` ${soloDiv}` : ''}</div>
                                <div style={{ fontSize: '0.6rem', opacity: 0.7 }}>{QUEUES.find(q => q.value === queueType)?.label}</div>
                            </div>
                        </div>
                    </div>

                    {/* PenguLoader */}
                    <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <Monitor size={12} style={{ color: 'var(--hextech-gold)', flexShrink: 0 }} />
                                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-primary)' }}>Profile Overview</span>
                            </div>
                            <span style={{ 
                                fontSize: '0.5rem', padding: '1px 5px', borderRadius: '3px',
                                background: pluginInstalled ? 'rgba(34, 197, 94, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                                color: pluginInstalled ? '#22c55e' : '#fbbf24',
                                fontWeight: 600
                            }}>
                                {pluginInstalled ? 'Ready' : 'Setup'}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setOverviewEnabled(!overviewEnabled)}
                            style={{
                                width: '34px', height: '18px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                                background: overviewEnabled ? 'var(--hextech-gold)' : 'rgba(255, 255, 255, 0.1)',
                                position: 'relative', transition: 'all 0.2s', flexShrink: 0
                            }}
                        >
                            <span style={{
                                position: 'absolute', top: '2px',
                                left: overviewEnabled ? '18px' : '2px',
                                width: '14px', height: '14px', borderRadius: '50%',
                                background: overviewEnabled ? '#09090b' : 'rgba(255, 255, 255, 0.5)',
                                transition: 'all 0.2s'
                            }}></span>
                        </button>
                    </div>

                    {/* Apply Button */}
                    <button type="button" className="primary-btn" onClick={applyChanges} disabled={!lcu || loading || fetching}
                        style={{ padding: '10px 18px', fontSize: '0.7rem', borderRadius: '8px', whiteSpace: 'nowrap' }}>
                        {loading ? '...' : 'APPLY'}
                    </button>

                    {/* Sync Button */}
                    <button type="button" onClick={fetchCurrentData} disabled={!lcu || fetching}
                        style={{
                            padding: '10px 14px', fontSize: '0.65rem', fontWeight: 700, borderRadius: '8px',
                            border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)',
                            color: 'var(--text-secondary)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap'
                        }}>
                        <RefreshCw size={11} className={fetching ? 'intel-spinner' : ''} /> Sync
                    </button>
                </div>

                {!lcu && (
                    <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', textAlign: 'center', flexShrink: 0 }}>
                        <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>Start League of Legends to enable this feature.</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(RankTab);
