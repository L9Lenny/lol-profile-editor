import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { invoke } from "@tauri-apps/api/core";
import { LcuInfo } from '../../hooks/useLcu';
import { Icon } from '../../hooks/useIcons';

interface IconTabProps {
    lcu: LcuInfo | null;
    showToast: (text: string, type: string) => void;
    addLog: (msg: string) => void;
    visibleIcons: Icon[];
    iconSearchTerm: string;
    setIconSearchTerm: (term: string) => void;
    handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    gridRef: React.RefObject<HTMLDivElement | null>;
}

import { SAVED_ICON_KEY } from '../../hooks/useAutoRestore';

const IconTab: React.FC<IconTabProps> = ({
    lcu, showToast, addLog,
    visibleIcons, iconSearchTerm, setIconSearchTerm,
    handleScroll, gridRef
}) => {
    const [selectedIcon, setSelectedIcon] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

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
            }).catch((err) => addLog(`Official icon update failed (${err}). Trying Force method...`));

            await invoke("lcu_request", {
                method: "PUT",
                endpoint: "/lol-chat/v1/me",
                body: { icon: selectedIcon },
                port: lcu.port,
                token: lcu.token
            });

            localStorage.setItem(SAVED_ICON_KEY, selectedIcon.toString());

            addLog(`Icon ID ${selectedIcon} applied (Force sync).`);
            showToast("Icon Applied!", "success");
        } catch (err) {
            addLog(`Icon Error: ${err}`);
            showToast("Failed to apply icon", "error");
        } finally { setLoading(false); }
    };

    return (
        <div className="tab-content fadeIn" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0 20px 40px 20px' }}>
            {/* Header */}
            <div style={{ marginBottom: '16px' }}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Icon Swapper</h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Equip hidden summoner icons instantly.</p>
            </div>

            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                {/* Note */}
                <div style={{ 
                    background: 'rgba(59, 130, 246, 0.06)', 
                    border: '1px solid rgba(59, 130, 246, 0.15)', 
                    borderRadius: '10px', 
                    padding: '12px 14px', 
                    marginBottom: '16px', 
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.5'
                }}>
                    <span style={{ color: 'var(--hextech-gold)', fontWeight: 600 }}>Note:</span> Due to server-side ownership checks, equipping an icon you do not own will only display in chat and above the friends list.
                </div>

                {/* Search */}
                <div style={{ marginBottom: '12px', position: 'relative', width: '100%', flexShrink: 0 }}>
                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                        type="text"
                        placeholder="Search by name or ID..."
                        value={iconSearchTerm}
                        onChange={(e) => setIconSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px 10px 35px', fontSize: '0.82rem' }}
                    />
                </div>

                {/* Icon Grid */}
                <div
                    ref={gridRef}
                    className="icon-grid"
                    onScroll={handleScroll}
                    style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                        gap: '8px', flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '6px',
                        contentVisibility: 'auto'
                    }}
                >
                    {visibleIcons.map((icon) => (
                        <button
                            key={icon.id}
                            type="button"
                            className={`icon-item ${selectedIcon === icon.id ? 'selected' : ''}`}
                            onClick={() => setSelectedIcon(icon.id)}
                            style={{
                                cursor: 'pointer', borderRadius: '10px', 
                                background: selectedIcon === icon.id ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255,255,255,0.03)',
                                padding: '10px', textAlign: 'center', 
                                border: selectedIcon === icon.id ? '2px solid var(--hextech-gold)' : '2px solid transparent',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <img 
                                src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${icon.id}.jpg`} 
                                alt={icon.name} 
                                style={{ width: '100%', borderRadius: '8px', marginBottom: '6px', aspectRatio: '1/1', background: 'rgba(255,255,255,0.02)' }} 
                                loading="lazy" 
                            />
                            <div 
                                title={icon.name}
                                style={{ 
                                    fontSize: '0.62rem', 
                                    color: selectedIcon === icon.id ? 'var(--text-primary)' : 'var(--text-secondary)', 
                                    fontWeight: 600, 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis', 
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    lineHeight: '1.2',
                                    height: '2.4em',
                                }}
                            >
                                {icon.name}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Apply Button */}
                <button type="button"
                    className="primary-btn"
                    style={{ width: '100%', marginTop: '12px', padding: '12px', fontSize: '0.8rem', flexShrink: 0 }}
                    onClick={applyIcon}
                    disabled={!lcu || loading || selectedIcon === null}
                >
                    {loading ? 'APPLYING...' : 'APPLY ICON'}
                </button>
            </div>

            {!lcu && (
                <div style={{ marginTop: '16px', padding: '14px 16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', textAlign: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>Start League of Legends to enable this feature.</span>
                </div>
            )}
        </div>
    );
};

export default React.memo(IconTab);
