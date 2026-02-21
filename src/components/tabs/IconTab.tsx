import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { invoke } from "@tauri-apps/api/core";
import { LcuInfo } from '../../hooks/useLcu';
import { Icon } from '../../hooks/useIcons';

interface IconTabProps {
    lcu: LcuInfo | null;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    showToast: (text: string, type: string) => void;
    addLog: (msg: string) => void;
    visibleIcons: Icon[];
    iconSearchTerm: string;
    setIconSearchTerm: (term: string) => void;
    ddragonVersion: string;
    handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    gridRef: React.RefObject<HTMLDivElement | null>;
}

const IconTab: React.FC<IconTabProps> = ({
    lcu, loading, setLoading, showToast, addLog,
    visibleIcons, iconSearchTerm, setIconSearchTerm,
    ddragonVersion, handleScroll, gridRef
}) => {
    const [selectedIcon, setSelectedIcon] = useState<number | null>(null);

    const applyIcon = async () => {
        if (!lcu || selectedIcon === null) return;
        setLoading(true);
        try {
            await invoke("lcu_request", {
                method: "PUT",
                endpoint: "/lol-summoner/v1/current-summoner/icon",
                body: { profileIconId: selectedIcon },
                port: lcu.port,
                token: lcu.token
            }).catch(() => addLog("Official icon update failed (likely unowned). Trying Force method..."));

            await invoke("lcu_request", {
                method: "PUT",
                endpoint: "/lol-chat/v1/me",
                body: { icon: selectedIcon },
                port: lcu.port,
                token: lcu.token
            });

            addLog(`Icon ID ${selectedIcon} applied (Force sync).`);
            showToast("Icon Applied!", "success");
        } catch (err) {
            addLog(`Icon Error: ${err}`);
            showToast("Failed to apply icon", "error");
        } finally { setLoading(false); }
    };

    return (
        <div className="tab-content fadeIn">
            <div className="card">
                <h3 className="card-title">Icon Swapper</h3>
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ position: 'relative', width: '100%' }}>
                        <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder="Search by name or ID..."
                            value={iconSearchTerm}
                            onChange={(e) => setIconSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '8px 10px 8px 35px', fontSize: '0.85rem' }}
                        />
                    </div>
                </div>

                <div
                    ref={gridRef}
                    className="icon-grid"
                    onScroll={handleScroll}
                    style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                        gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '10px'
                    }}
                >
                    {visibleIcons.map((icon) => (
                        <button
                            key={icon.id}
                            type="button"
                            className={`icon-item ${selectedIcon === icon.id ? 'selected' : ''}`}
                            onClick={() => setSelectedIcon(icon.id)}
                            style={{
                                cursor: 'pointer', borderRadius: '10px', background: 'rgba(255,255,255,0.03)',
                                padding: '10px', textAlign: 'center', border: selectedIcon === icon.id ? '2px solid var(--hextech-gold)' : '2px solid transparent',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <img src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/profileicon/${icon.id}.png`} alt={icon.name} style={{ width: '100%', borderRadius: '6px', marginBottom: '8px' }} loading="lazy" />
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{icon.name}</div>
                            <div style={{ fontSize: '0.5rem', opacity: 0.5 }}>ID: {icon.id}</div>
                        </button>
                    ))}
                </div>

                <button
                    className="primary-btn"
                    style={{ width: '100%', marginTop: '20px' }}
                    onClick={applyIcon}
                    disabled={!lcu || loading || selectedIcon === null}
                >
                    APPLY ICON
                </button>
            </div>
        </div>
    );
};

export default IconTab;
