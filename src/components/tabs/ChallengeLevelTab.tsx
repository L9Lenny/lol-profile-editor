import React, { useCallback, useEffect, useState } from 'react';
import { Gauge, Gem, RefreshCw } from 'lucide-react';
import { LcuInfo } from '../../hooks/useLcu';
import { SAVED_CHALLENGE_CRYSTAL_KEY, SAVED_CHALLENGE_POINTS_KEY } from '../../storageKeys';
import { LcuRequestFn, patchChatLol } from '../../utils/chatMe';

interface ChallengeLevelTabProps {
    lcu: LcuInfo | null;
    showToast: (text: string, type: string) => void;
    addLog: (msg: string) => void;
    lcuRequest: LcuRequestFn;
}

const CRYSTAL_TIERS = ['NONE', 'IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];

const TIER_COLORS: Record<string, string> = {
    NONE: '#595959',
    IRON: '#595959',
    BRONZE: '#8b5a2b',
    SILVER: '#c0c0c0',
    GOLD: '#ffd700',
    PLATINUM: '#00ced1',
    EMERALD: '#2ecc71',
    DIAMOND: '#1e90ff',
    MASTER: '#8a2be2',
    GRANDMASTER: '#ff4500',
    CHALLENGER: '#00ffff',
};

const extractChallengePoints = (data: Record<string, unknown>): string | null => {
    const nestedCurrent = (value: unknown): unknown => {
        if (!value || typeof value !== 'object') return undefined;
        return (value as Record<string, unknown>).current;
    };
    const candidates = [
        data.totalChallengeScore,
        data.overallChallengePoints,
        nestedCurrent(data.totalPoints),
        nestedCurrent(data.challengePoints),
        data.challengePoints,
    ];
    for (const candidate of candidates) {
        if (typeof candidate !== 'number' && typeof candidate !== 'string') continue;
        if (typeof candidate === 'string' && !candidate.trim()) continue;
        const points = Number(candidate);
        if (Number.isFinite(points) && points >= 0) return String(points);
    }
    return null;
};

const ChallengeLevelTab: React.FC<ChallengeLevelTabProps> = ({ lcu, showToast, addLog, lcuRequest }) => {
    const [crystalLevel, setCrystalLevel] = useState('CHALLENGER');
    const [challengePoints, setChallengePoints] = useState('1200');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    const applyChallengeData = useCallback((data: Record<string, unknown>) => {
        const level = String(data.overallChallengeLevel ?? data.challengeCrystalLevel ?? '').toUpperCase();
        const points = extractChallengePoints(data);
        let levelSynced = false;
        let pointsSynced = false;
        if (CRYSTAL_TIERS.includes(level)) {
            setCrystalLevel(level);
            levelSynced = true;
        }
        if (points !== null) {
            setChallengePoints(points);
            pointsSynced = true;
        }
        return { levelSynced, pointsSynced };
    }, []);

    const fetchCurrentData = useCallback(async (notify = false) => {
        if (!lcu) return;
        setFetching(true);
        try {
            let levelSynced = false;
            let pointsSynced = false;
            try {
                const summary = await lcuRequest('GET', '/lol-challenges/v1/summary-player-data/local-player') as Record<string, unknown> | null;
                if (summary) ({ levelSynced, pointsSynced } = applyChallengeData(summary));
            } catch (err) {
                addLog(`Challenge summary unavailable, falling back to chat presence: ${err}`);
            }

            if (!levelSynced || !pointsSynced) {
                const chat = await lcuRequest('GET', '/lol-chat/v1/me') as { lol?: string | Record<string, unknown> } | null;
                if (chat?.lol) {
                    const lol = typeof chat.lol === 'string' ? JSON.parse(chat.lol) as Record<string, unknown> : chat.lol;
                    const fallback = applyChallengeData(lol);
                    levelSynced ||= fallback.levelSynced;
                    pointsSynced ||= fallback.pointsSynced;
                }
            }

            if (!levelSynced || !pointsSynced) throw new Error('Incomplete challenge level data returned by League Client');
            addLog('Challenge level synced successfully.');
            if (notify) showToast('Challenge level synced from League Client', 'success');
        } catch (err) {
            addLog(`Failed to sync challenge level: ${err}`);
            if (notify) showToast(`Challenge sync failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
        } finally {
            setFetching(false);
        }
    }, [lcu, lcuRequest, addLog, applyChallengeData, showToast]);

    useEffect(() => {
        if (lcu) fetchCurrentData();
    }, [lcu, fetchCurrentData]);

    const applyChanges = async () => {
        if (!lcu) return;
        setLoading(true);
        try {
            await patchChatLol(lcuRequest, (current) => ({
                ...current,
                challengeCrystalLevel: crystalLevel,
                challengePoints: String(challengePoints || '0'),
            }));
            localStorage.setItem(SAVED_CHALLENGE_CRYSTAL_KEY, crystalLevel);
            localStorage.setItem(SAVED_CHALLENGE_POINTS_KEY, String(challengePoints || '0'));
            showToast('Challenge Level Applied!', 'success');
            addLog('Challenge level override updated successfully.');
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            showToast(`Challenge update failed: ${message}`, 'error');
            addLog(`Challenge level update failed: ${message}`);
        } finally {
            setLoading(false);
        }
    };

    const color = TIER_COLORS[crystalLevel] || TIER_COLORS.NONE;

    return (
        <div className="tab-content fadeIn" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0 20px 40px' }}>
            <div style={{ marginBottom: '20px', flexShrink: 0 }}>
                <h2 id="challenge-level-title" style={{ margin: '0 0 6px', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Challenge Level
                </h2>
                <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>
                    Customize the crystal tier and challenge score shown on your profile.
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0 }}>
                <section className="card" aria-labelledby="challenge-level-title" style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Gem size={16} style={{ color: 'var(--hextech-gold)' }} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Crystal Tier</div>
                            <div style={{ marginTop: '2px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Choose the crystal displayed by the League Client.</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px' }}>
                        {CRYSTAL_TIERS.map(tier => {
                            const isActive = crystalLevel === tier;
                            const tierColor = TIER_COLORS[tier] || TIER_COLORS.NONE;
                            return (
                                <button
                                    type="button"
                                    key={tier}
                                    onClick={() => setCrystalLevel(tier)}
                                    disabled={!lcu}
                                    aria-pressed={isActive}
                                    title={`${tier} challenge crystal`}
                                    style={{
                                        minHeight: '52px', padding: '10px 12px', borderRadius: '8px',
                                        border: isActive ? `1px solid ${tierColor}` : '1px solid var(--glass-border)',
                                        background: isActive ? `${tierColor}16` : 'rgba(0, 0, 0, 0.24)',
                                        color: isActive ? tierColor : 'var(--text-secondary)',
                                        display: 'flex', alignItems: 'center', gap: '9px',
                                        fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                                        boxShadow: isActive ? `inset 3px 0 ${tierColor}` : 'none',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <Gem size={17} strokeWidth={isActive ? 2.2 : 1.7} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{tier}</span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section className="card" style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(190px, 0.65fr) minmax(0, 1.35fr)', gap: '24px', alignItems: 'center' }}>
                        <div aria-label="Challenge level preview" style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                            <div style={{ width: '54px', height: '54px', borderRadius: '14px', background: `${color}14`, border: `1px solid ${color}55`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 22px ${color}18`, flexShrink: 0 }}>
                                <Gem size={28} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Preview</div>
                                <strong style={{ display: 'block', marginTop: '3px', fontSize: '1.05rem', color, overflow: 'hidden', textOverflow: 'ellipsis' }}>{crystalLevel}</strong>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Challenge crystal</span>
                            </div>
                        </div>

                        <div style={{ minWidth: 0 }}>
                            <label htmlFor="challenge-points-input" style={{ display: 'block' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '7px', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    <Gauge size={16} style={{ color: 'var(--hextech-gold)' }} /> Challenge Points
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(0, 0, 0, 0.28)' }}>
                                    <input
                                        id="challenge-points-input"
                                        type="number"
                                        min="0"
                                        aria-label="Challenge Points"
                                        value={challengePoints}
                                        onChange={(event) => setChallengePoints(event.target.value)}
                                        placeholder="1200"
                                        disabled={!lcu}
                                        style={{ flex: 1, minWidth: 0, padding: '11px 13px', border: 'none', background: 'transparent', fontSize: '0.9rem' }}
                                    />
                                    <span style={{ padding: '0 13px', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.8px' }}>PTS</span>
                                </div>
                                <small style={{ display: 'block', marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Total score displayed alongside the crystal.</small>
                            </label>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', alignItems: 'center', marginTop: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => fetchCurrentData(true)}
                                    disabled={!lcu || fetching}
                                    title="Read the current challenge crystal and points from the League Client"
                                    style={{
                                        padding: '10px 18px', borderRadius: '8px', border: '1px solid var(--glass-border)',
                                        background: 'rgba(0, 0, 0, 0.2)', color: 'var(--text-secondary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', whiteSpace: 'nowrap',
                                        fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', cursor: 'pointer'
                                    }}
                                >
                                    <RefreshCw size={14} className={fetching ? 'intel-spinner' : ''} /> Sync
                                </button>
                                <button type="button" className="primary-btn" onClick={applyChanges} disabled={!lcu || loading || fetching} style={{ padding: '10px 20px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                    {loading ? 'APPLYING...' : 'APPLY CHALLENGE LEVEL'}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {!lcu && (
                    <div style={{ padding: '14px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', textAlign: 'center' }}>
                        <span style={{ color: '#ef4444', fontSize: '0.9rem' }}>League client connection required.</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(ChallengeLevelTab);
