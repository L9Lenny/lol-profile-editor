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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '12px', flex: 1, minHeight: 0 }}>
                {/* Left Column — Editor */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
                    {/* Queue Card */}
                    <div className="card" style={{ padding: '16px 20px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <div style={{ 
                                width: '24px', height: '24px', borderRadius: '6px', 
                                background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Shield size={12} style={{ color: 'var(--hextech-gold)' }} />
                            </div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Queue</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                            {QUEUES.map(q => (
                                <button type="button"
                                    key={q.value}
                                    onClick={() => setQueueType(q.value)}
                                    disabled={!lcu}
                                    style={{
                                        padding: '10px 8px', border: 'none', borderRight: '1px solid var(--glass-border)',
                                        background: queueType === q.value ? 'rgba(59, 130, 246, 0.12)' : 'rgba(0, 0, 0, 0.2)',
                                        color: queueType === q.value ? 'var(--hextech-gold)' : 'var(--text-secondary)',
                                        fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                                        boxShadow: queueType === q.value ? 'inset 0 -2px #3b82f6' : 'none',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    {q.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tier Card */}
                    <div className="card" style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexShrink: 0 }}>
                            <div style={{ 
                                width: '24px', height: '24px', borderRadius: '6px', 
                                background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Shield size={12} style={{ color: 'var(--hextech-gold)' }} />
                            </div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Tier</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', flex: 1, minHeight: 0 }}>
                            {TIERS.map(t => {
                                const isActive = soloTier === t;
                                const color = TIER_COLORS[t] || "#ffffff";
                                return (
                                    <button type="button"
                                        key={t}
                                        onClick={() => setSoloTier(t)}
                                        disabled={!lcu}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '6px',
                                            padding: '8px', borderRadius: '8px',
                                            border: isActive ? `1px solid ${color}` : '1px solid var(--glass-border)',
                                            background: isActive ? `${color}12` : 'rgba(0, 0, 0, 0.28)',
                                            color: isActive ? color : 'var(--text-secondary)',
                                            fontSize: '0.6rem', fontWeight: 600, cursor: 'pointer',
                                            boxShadow: isActive ? `inset 3px 0 ${color}` : 'none',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        <Shield size={14} />
                                        {t}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Division Card */}
                    {hasDivision && (
                        <div className="card" style={{ padding: '16px 20px', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <div style={{ 
                                    width: '24px', height: '24px', borderRadius: '6px', 
                                    background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Shield size={12} style={{ color: 'var(--hextech-gold)' }} />
                                </div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Division</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                {DIVISIONS.map(d => (
                                    <button type="button"
                                        key={d}
                                        onClick={() => setSoloDiv(d)}
                                        disabled={!lcu}
                                        style={{
                                            padding: '10px', borderRadius: '8px',
                                            border: soloDiv === d ? '1px solid var(--hextech-gold)' : '1px solid var(--glass-border)',
                                            background: soloDiv === d ? 'rgba(59, 130, 246, 0.12)' : 'rgba(0, 0, 0, 0.28)',
                                            color: soloDiv === d ? 'var(--hextech-gold)' : 'var(--text-secondary)',
                                            fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
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

                {/* Right Column — Preview & Apply */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
                    {/* Preview Card */}
                    <div className="card" style={{ padding: '20px', textAlign: 'center', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Preview</div>
                        <div style={{ 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                            padding: '16px', borderRadius: '10px',
                            background: 'rgba(0, 0, 0, 0.2)', border: '1px solid var(--glass-border)',
                            color: TIER_COLORS[soloTier] || '#ffffff'
                        }}>
                            <Shield size={28} />
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{soloTier}{hasDivision ? ` ${soloDiv}` : ''}</div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{QUEUES.find(q => q.value === queueType)?.label}</div>
                            </div>
                        </div>
                        <div style={{ marginTop: '12px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            Chat & social cards
                        </div>
                    </div>

                    {/* PenguLoader Card */}
                    <div className="card" style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Monitor size={16} style={{ color: 'var(--hextech-gold)' }} />
                                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>Profile Overview</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setOverviewEnabled(!overviewEnabled)}
                                style={{
                                    width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer',
                                    background: overviewEnabled ? 'var(--hextech-gold)' : 'rgba(255, 255, 255, 0.1)',
                                    position: 'relative', transition: 'all 0.2s', flexShrink: 0
                                }}
                            >
                                <span style={{
                                    position: 'absolute', top: '3px',
                                    left: overviewEnabled ? '21px' : '3px',
                                    width: '16px', height: '16px', borderRadius: '50%',
                                    background: overviewEnabled ? '#09090b' : 'rgba(255, 255, 255, 0.5)',
                                    transition: 'all 0.2s'
                                }}></span>
                            </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexShrink: 0 }}>
                            <span style={{ 
                                fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px',
                                background: pluginInstalled ? 'rgba(34, 197, 94, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                                color: pluginInstalled ? '#22c55e' : '#fbbf24',
                                fontWeight: 600
                            }}>
                                {pluginInstalled ? 'Pengu ready' : 'Setup required'}
                            </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.4, flexShrink: 0 }}>
                            Applies rank to your Profile Overview card and tooltip.
                        </p>

                        {overviewEnabled && (
                            <div style={{ marginTop: '12px', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--glass-border)', flex: 1, minHeight: 0, overflow: 'auto' }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--hextech-gold)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Puzzle size={12} /> Setup Steps
                                </div>
                                <ol style={{ margin: 0, paddingLeft: '16px', fontSize: '0.68rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                    <li>Install PenguLoader in Settings</li>
                                    <li>Click Install / Update Plugin</li>
                                    <li>Apply override, then restart League</li>
                                </ol>
                            </div>
                        )}
                    </div>

                    {/* Apply Button */}
                    <button type="button" className="primary-btn" onClick={applyChanges} disabled={!lcu || loading || fetching}
                        style={{ padding: '12px', fontSize: '0.8rem', borderRadius: '10px', flexShrink: 0 }}>
                        {loading ? 'APPLYING...' : 'APPLY RANK OVERRIDES'}
                    </button>

                    {/* Sync Button */}
                    <button type="button" onClick={fetchCurrentData} disabled={!lcu || fetching}
                        style={{
                            padding: '10px', fontSize: '0.72rem', fontWeight: 700, borderRadius: '8px',
                            border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)',
                            color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}>
                        <RefreshCw size={13} className={fetching ? 'intel-spinner' : ''} /> Sync from Client
                    </button>

                    {!lcu && (
                        <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', textAlign: 'center', flexShrink: 0 }}>
                            <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>Start League of Legends to enable this feature.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(RankTab);
