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

const ChallengeLevelTab: React.FC<ChallengeLevelTabProps> = ({ lcu, showToast, addLog, lcuRequest }) => {
    const [crystalLevel, setCrystalLevel] = useState('CHALLENGER');
    const [challengePoints, setChallengePoints] = useState('1200');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    const fetchCurrentData = useCallback(async () => {
        if (!lcu) return;
        setFetching(true);
        try {
            const chat = await lcuRequest('GET', '/lol-chat/v1/me') as { lol?: string | Record<string, unknown> } | null;
            if (chat?.lol) {
                const lol = typeof chat.lol === 'string' ? JSON.parse(chat.lol) as Record<string, unknown> : chat.lol;
                if (lol.challengeCrystalLevel) setCrystalLevel(String(lol.challengeCrystalLevel));
                if (lol.challengePoints !== undefined) setChallengePoints(String(lol.challengePoints));
            }
            addLog('Challenge level synced successfully.');
        } catch (err) {
            addLog(`Failed to sync challenge level: ${err}`);
        } finally {
            setFetching(false);
        }
    }, [lcu, lcuRequest, addLog]);

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
        <div className="tab-content fadeIn feature-page">
            <header className="feature-toolbar">
                <div className="feature-toolbar-title">
                    <Gem size={19} />
                    <div>
                        <h2 id="challenge-level-title">Challenge Level</h2>
                        <p>Crystal tier and challenge score shown on profile surfaces.</p>
                    </div>
                </div>
                <button type="button" className={`tool-action ${fetching ? 'loading' : ''}`} onClick={fetchCurrentData} disabled={!lcu || fetching} title="Sync challenge level from Client">
                    <RefreshCw size={14} /> Sync client
                </button>
            </header>

            <div className="feature-workbench challenge-workbench">
                <section className="editor-surface" aria-labelledby="challenge-level-title">
                    <fieldset className="editor-block editor-block-last challenge-tier-fieldset">
                        <legend>Crystal tier</legend>
                    <div className="challenge-tier-grid">
                        {CRYSTAL_TIERS.map(tier => {
                            const isActive = crystalLevel === tier;
                            return (
                                <button
                                    type="button"
                                    key={tier}
                                    className={`challenge-tier-btn ${isActive ? 'active' : ''}`}
                                    style={{ color: TIER_COLORS[tier] || TIER_COLORS.NONE }}
                                    onClick={() => setCrystalLevel(tier)}
                                    disabled={!lcu}
                                    aria-pressed={isActive}
                                    title={`${tier} challenge crystal`}
                                >
                                    <Gem size={17} strokeWidth={isActive ? 2.2 : 1.6} />
                                    <span>{tier}</span>
                                </button>
                            );
                        })}
                    </div>
                    </fieldset>
                </section>

                <aside className="inspector-surface">
                    <div className="inspector-heading">Pending output</div>
                    <section className="challenge-readout" style={{ color }} aria-label="Challenge level preview">
                        <Gem size={34} />
                        <div><strong>{crystalLevel}</strong><span>Challenge crystal</span></div>
                    </section>
                    <label className="inspector-field" htmlFor="challenge-points-input">
                        <span><Gauge size={15} /> Challenge Points</span>
                        <small>Total score displayed with the crystal</small>
                        <div className="number-field">
                            <input id="challenge-points-input" type="number" min="0" aria-label="Challenge Points" value={challengePoints} onChange={(event) => setChallengePoints(event.target.value)} placeholder="1200" disabled={!lcu} />
                            <span>PTS</span>
                        </div>
                    </label>
                    <div className="inspector-actions">
                        <button type="button" className="primary-btn" onClick={applyChanges} disabled={!lcu || loading || fetching}>
                            {loading ? 'APPLYING...' : 'APPLY CHALLENGE LEVEL'}
                        </button>
                        {!lcu && <p className="feature-client-warning">League client connection required.</p>}
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default React.memo(ChallengeLevelTab);
