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
        <div className="tab-content fadeIn feature-page">
            <header className="feature-toolbar">
                <div className="feature-toolbar-title">
                    <Shield size={19} />
                    <div>
                        <h2>Rank Override</h2>
                        <p>Presence rank, queue and Profile Overview output.</p>
                    </div>
                </div>
                <button type="button"
                    className={`tool-action ${fetching ? 'loading' : ''}`}
                    onClick={fetchCurrentData}
                    disabled={!lcu || fetching}
                    title="Sync from Client"
                >
                    <RefreshCw size={14} /> Sync client
                </button>
            </header>

            <div className="feature-workbench rank-workbench">
                <section className="editor-surface">
                    <fieldset className="editor-block rank-queue-block">
                        <legend>Queue</legend>
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

                    <fieldset className={`editor-block rank-tier-block ${hasDivision ? '' : 'editor-block-last rank-tier-full'}`}>
                        <legend>Tier</legend>
                    <div className="tier-grid">
                        {TIERS.map(t => {
                            const isActive = soloTier === t;
                            const color = TIER_COLORS[t] || "#ffffff";
                            return (
                                <button type="button"
                                    key={t}
                                    className={`tier-btn ${isActive ? 'active' : ''}`}
                                    style={isActive ? { color, borderColor: color } : {}}
                                    onClick={() => setSoloTier(t)}
                                    disabled={!lcu}
                                >
                                    <Shield size={18} color={isActive ? color : "var(--text-secondary)"} />
                                    {t}
                                </button>
                            );
                        })}
                    </div>
                    </fieldset>

                    {hasDivision && (
                        <fieldset className="editor-block editor-block-last rank-division-block">
                            <legend>Division</legend>
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
                </section>

                <aside className="inspector-surface">
                    <div className="inspector-heading">Pending output</div>
                    <div className="rank-readout" style={{ color: TIER_COLORS[soloTier] || '#ffffff' }}>
                        <Shield size={28} />
                        <div>
                            <strong>{soloTier}{hasDivision ? ` ${soloDiv}` : ''}</strong>
                            <span>{QUEUES.find(q => q.value === queueType)?.label || queueType}</span>
                        </div>
                    </div>
                    <dl className="output-list">
                        <div><dt>Presence</dt><dd>Chat and social cards</dd></div>
                        <div><dt>Queue source</dt><dd>{QUEUES.find(q => q.value === queueType)?.label}</dd></div>
                    </dl>

                    <section className={`overview-inline ${overviewEnabled ? 'enabled' : ''}`} aria-labelledby="overview-override-title">
                        <div className="overview-inline-row">
                            <Monitor size={24} />
                            <div className="overview-inline-copy">
                                <div>
                                    <h3 id="overview-override-title">PenguLoader Overview Override</h3>
                                <span className={`overview-status ${pluginInstalled ? 'ready' : 'setup'}`}>
                                    {pluginInstalled ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                                    {pluginInstalled ? 'Pengu ready' : 'Setup required'}
                                </span>
                                </div>
                                <p>Required to apply the selected rank to your Profile Overview card and tooltip.</p>
                            </div>
                            <label className="switch overview-switch">
                                <span className="sr-only">Toggle Profile Overview rank override</span>
                                <input type="checkbox" checked={overviewEnabled} onChange={(event) => setOverviewEnabled(event.target.checked)} />
                                <span className="slider"></span>
                            </label>
                        </div>

                        {overviewEnabled && (
                            <div className="overview-help">
                                <div className="overview-help-title"><Puzzle size={17} /> How to enable the Overview override</div>
                                <ol className="overview-setup-steps">
                                    <li><span>1</span><p>Open <strong>Settings &gt; Pengu Loader</strong> and install PenguLoader if it is not already installed.</p></li>
                                    <li><span>2</span><p>Click <strong>Install / Update Plugin</strong> in that section.</p></li>
                                    <li><span>3</span><p>Return here, apply the override, then fully restart League.</p></li>
                                </ol>
                                <small>PenguLoader is only required for Profile Overview. Chat and social hover cards work independently.</small>
                            </div>
                        )}
                    </section>

                    <div className="inspector-actions">
                        <button type="button" className="primary-btn" onClick={applyChanges} disabled={!lcu || loading || fetching}>
                            {loading ? 'APPLYING...' : 'APPLY RANK OVERRIDES'}
                        </button>
                    {!lcu && (
                            <p className="feature-client-warning">League client connection required.</p>
                    )}
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default React.memo(RankTab);
