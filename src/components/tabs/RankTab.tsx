import React, { useState } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { LcuInfo } from '../../hooks/useLcu';

interface RankTabProps {
    lcu: LcuInfo | null;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    showToast: (text: string, type: string) => void;
    addLog: (msg: string) => void;
}

const RankTab: React.FC<RankTabProps> = ({ lcu, loading, setLoading, showToast, addLog }) => {
    const [soloTier, setSoloTier] = useState("CHALLENGER");
    const [soloDiv, setSoloDiv] = useState("I");

    const applyRank = async () => {
        if (!lcu) return;
        setLoading(true);
        try {
            await invoke("lcu_request", {
                method: "PUT", endpoint: "/lol-chat/v1/me",
                body: { lol: { rankedLeagueTier: soloTier, rankedLeagueDivision: soloDiv, rankedLeagueQueue: "RANKED_SOLO_5x5" } },
                port: lcu.port, token: lcu.token
            });
            showToast("Rank Applied!", "success");
            addLog(`Rank override applied: ${soloTier} ${soloDiv}`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            showToast(`Rank apply failed: ${errorMessage}`, "error");
            addLog(`Rank override failed: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="tab-content fadeIn">
            <div className="card">
                <h3 className="card-title">Rank Override</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '25px' }}>Modify your visible rank in the chat and hover cards.</p>
                <div className="input-group">
                    <label>Solo/Duo Ranking</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <select value={soloTier} onChange={(e) => setSoloTier(e.target.value)} style={{ flex: 2 }}>
                            {["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <select value={soloDiv} onChange={(e) => setSoloDiv(e.target.value)} style={{ flex: 1 }}>
                            {["I", "II", "III", "IV"].map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                </div>

                <div className="rank-preview-mini" style={{ marginTop: '20px', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '6px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Draft Preview</span>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{soloTier} <span style={{ color: 'var(--hextech-gold)' }}>{soloDiv}</span></span>
                </div>

                <button className="primary-btn" style={{ width: '100%', marginTop: '20px' }} onClick={applyRank} disabled={!lcu || loading}>APPLY</button>
            </div>
        </div>
    );
};

export default RankTab;
