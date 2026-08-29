import React, { useState, useEffect, useCallback } from 'react';
import { 
    ChevronRight, 
    Layout, 
    Disc3, 
    Image, 
    Trophy, 
    UserCircle, 
    Award, 
    ArrowLeft, 
    Settings, 
    Terminal, 
    Layers,
    Sparkles,
    Cpu,
    Users,
    UserMinus,
    Shield,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { LcuInfo } from '../../hooks/useLcu';
import { LcuRequestFn, patchChatLol } from '../../utils/chatMe';
import { 
    SAVED_RANK_QUEUE_KEY, 
    SAVED_RANK_TIER_KEY, 
    SAVED_RANK_DIV_KEY
} from '../../storageKeys';

interface HomeTabProps {
    lcu: LcuInfo | null;
    clientVersion: string;
    setActiveTab: (tab: string) => void;
    lcuRequest: LcuRequestFn;
    showToast: (text: string, type: string) => void;
}

interface SummonerInfo {
    displayName: string;
    gameName: string;
    tagLine: string;
    summonerLevel: number;
    profileIconId: number;
}

interface FeatureOption {
    id: string;
    title: string;
    desc: string;
    icon: React.ReactNode;
}

interface Category {
    id: string;
    title: string;
    desc: string;
    icon: React.ReactNode;
    options: FeatureOption[];
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

const HomeTab: React.FC<HomeTabProps> = ({ lcu, clientVersion, setActiveTab, lcuRequest, showToast }) => {
    const [view, setView] = useState<'categories' | 'category-detail'>('categories');
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [summoner, setSummoner] = useState<SummonerInfo | null>(null);

    const [rankExpanded, setRankExpanded] = useState(false);
    const [soloTier, setSoloTier] = useState("CHALLENGER");
    const [soloDiv, setSoloDiv] = useState("I");
    const [queueType, setQueueType] = useState("RANKED_SOLO_5x5");
    const [rankLoading, setRankLoading] = useState(false);

    useEffect(() => {
        if (!lcu) {
            setSummoner(null);
            return;
        }
        let cancelled = false;
        const fetchSummoner = async () => {
            try {
                const data = await lcuRequest("GET", "/lol-summoner/v1/current-summoner") as SummonerInfo | null;
                if (!cancelled && data) setSummoner(data);
            } catch (e) {
                console.error("Failed to fetch summoner", e);
            }
        };
        fetchSummoner();
        return () => { cancelled = true; };
    }, [lcu, lcuRequest]);

    const fetchRankData = useCallback(async () => {
        if (!lcu) return;
        try {
            const chatRes = await lcuRequest("GET", "/lol-chat/v1/me") as { lol?: string | Record<string, unknown> } | null;
            if (chatRes?.lol) {
                const lol = typeof chatRes.lol === 'string' ? JSON.parse(chatRes.lol) as Record<string, unknown> : chatRes.lol;
                if (lol.rankedLeagueTier) setSoloTier(lol.rankedLeagueTier as string);
                if (lol.rankedLeagueDivision) setSoloDiv(lol.rankedLeagueDivision as string);
                if (lol.rankedLeagueQueue) setQueueType(lol.rankedLeagueQueue as string);
            }
        } catch (e) {
            console.error("Failed to fetch rank", e);
        }
    }, [lcu, lcuRequest]);

    useEffect(() => {
        if (lcu) fetchRankData();
    }, [lcu, fetchRankData]);

    const applyRankChanges = async () => {
        if (!lcu) return;
        setRankLoading(true);
        try {
            // Apply via chat endpoint (for hover card and chat)
            await patchChatLol(lcuRequest, (current) => ({
                ...current,
                rankedLeagueTier: soloTier,
                rankedLeagueDivision: soloDiv,
                rankedLeagueQueue: queueType
            }));
            localStorage.setItem(SAVED_RANK_QUEUE_KEY, queueType);
            localStorage.setItem(SAVED_RANK_TIER_KEY, soloTier);
            localStorage.setItem(SAVED_RANK_DIV_KEY, soloDiv);
            showToast("Rank Updated!", "success");
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            showToast(`Rank update failed: ${errorMessage}`, "error");
        } finally {
            setRankLoading(false);
        }
    };

    const categories: Category[] = [
        {
            id: 'customization',
            title: 'Customization',
            desc: 'Profile visual elements and skins.',
            icon: <Layers size={24} />,
            options: [
                { id: 'profile', title: 'Profile Bio', desc: 'Update status message and biography.', icon: <Layout size={24} /> },
                { id: 'background', title: 'Background', desc: 'Set any champion skin as your background.', icon: <Image size={24} /> },
                { id: 'icons', title: 'Icon Swapper', desc: 'Equip hidden summoner icons instantly.', icon: <UserCircle size={24} /> },
                { id: 'tokens', title: 'Profile Tokens', desc: 'Customize your profile badges.', icon: <Award size={24} /> },
            ]
        },
        {
            id: 'enhancements',
            title: 'Enhancements',
            desc: 'Advanced tools and lobby management.',
            icon: <Sparkles size={24} />,
            options: [
                { id: 'lobby', title: 'Lobby Manager', desc: 'Mass invite friends and manage your lobby.', icon: <Users size={24} /> },
                { id: 'friends', title: 'Friend Cleaner', desc: 'Identify and remove inactive friends.', icon: <UserMinus size={24} /> },
                { id: 'rank', title: 'Rank Overrides', desc: 'Modify visible Solo/Duo rankings.', icon: <Trophy size={24} /> },
                { id: 'music', title: 'Music Sync', desc: 'Auto-update bio with your current track.', icon: <Disc3 size={24} /> },
            ]
        },
        {
            id: 'system',
            title: 'System',
            desc: 'Manage application and view logs.',
            icon: <Cpu size={24} />,
            options: [
                { id: 'logs', title: 'System Logs', desc: 'View technical bridge communication.', icon: <Terminal size={24} /> },
                { id: 'settings', title: 'Settings', desc: 'Update app and toggle autostart.', icon: <Settings size={24} /> },
            ]
        }
    ];

    const handleCategoryClick = (cat: Category) => {
        setSelectedCategory(cat);
        setView('category-detail');
    };

    const getSummonerName = () => {
        if (!summoner) return 'Connecting...';
        return summoner.gameName ? `${summoner.gameName}#${summoner.tagLine}` : summoner.displayName;
    };

    return (
        <div className="tab-content fadeIn" style={{ padding: '0 20px 40px 20px' }}>
            
            {/* Profile Banner - Now the only header */}
            <div className="card profile-header-card" style={{ 
                marginTop: '10px',
                marginBottom: '20px', 
                padding: '15px 20px', 
                background: 'linear-gradient(90deg, rgba(200, 155, 60, 0.1) 0%, rgba(0, 0, 0, 0.4) 100%)',
                border: '1px solid rgba(200, 155, 60, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                borderRadius: '12px'
            }}>
                <div style={{ position: 'relative' }}>
                    <div style={{ 
                        width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', 
                        border: '2px solid var(--hextech-gold)'
                    }}>
                        {summoner ? (
                            <img src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${summoner.profileIconId}.jpg`} alt="" style={{ width: '100%', height: '100%' }} />
                        ) : (
                            <div style={{ width: '100%', height: '100%', background: '#222' }} />
                        )}
                    </div>
                    <div style={{ 
                        position: 'absolute', bottom: '-4px', right: '-4px', 
                        background: 'var(--hextech-gold)', color: 'black', 
                        fontSize: '0.55rem', fontWeight: 'bold', padding: '1px 5px', borderRadius: '6px'
                    }}>
                        {summoner ? summoner.summonerLevel : '??'}
                    </div>
                </div>

                <div style={{ flex: 1 }}>
                    <h2 style={{ margin: 0, color: 'white', fontSize: '1.2rem', fontWeight: 700 }}>
                        {getSummonerName()}
                    </h2>
                    <div style={{ display: 'flex', gap: '15px', marginTop: '3px', alignItems: 'center' }}>
                        <div className={`connection-status-pill ${lcu ? 'connected' : 'disconnected'}`} style={{ margin: 0, fontSize: '0.55rem', padding: '2px 8px' }}>
                            <div className="status-dot"></div>
                            {lcu ? 'CONNECTED' : 'WAITING'}
                        </div>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem' }}>v{clientVersion}</span>
                        <span style={{ 
                            color: TIER_COLORS[soloTier] || '#ffffff', 
                            fontSize: '0.7rem', 
                            fontWeight: 700,
                            textShadow: `0 0 8px ${TIER_COLORS[soloTier] || '#ffffff'}40`
                        }}>
                            {soloTier} {["MASTER", "GRANDMASTER", "CHALLENGER"].includes(soloTier) ? '' : soloDiv} • {QUEUES.find(q => q.value === queueType)?.label || queueType}
                        </span>
                    </div>
                </div>

                <button type="button" 
                    onClick={() => setRankExpanded(!rankExpanded)}
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        color: 'var(--hextech-gold)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600
                    }}
                >
                    <Shield size={14} />
                    {rankExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
            </div>

            {/* Inline Rank Editor */}
            {rankExpanded && (
                <div className="card" style={{ 
                    padding: '20px', 
                    background: 'linear-gradient(135deg, rgba(17, 32, 56, 0.8) 0%, rgba(6, 11, 19, 0.9) 100%)',
                    border: '1px solid rgba(200, 155, 60, 0.2)',
                    borderRadius: '12px',
                    animation: 'fadeIn 0.2s ease'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Shield size={16} color="var(--hextech-gold)" />
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--hextech-gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>Quick Rank Edit</span>
                        </div>
                        <button type="button" onClick={fetchRankData} style={{ 
                            background: 'none', border: 'none', color: 'var(--text-secondary)', 
                            cursor: 'pointer', fontSize: '0.7rem', padding: '4px 8px',
                            borderRadius: '4px'
                        }}>
                            Sync from Client
                        </button>
                    </div>

                    {/* Queue Selection */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                        {QUEUES.map(q => (
                            <button type="button"
                                key={q.value}
                                onClick={() => setQueueType(q.value)}
                                style={{
                                    flex: 1,
                                    padding: '6px',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    background: queueType === q.value ? 'rgba(200, 155, 60, 0.2)' : 'rgba(0,0,0,0.3)',
                                    border: `1px solid ${queueType === q.value ? 'var(--hextech-gold)' : 'var(--glass-border)'}`,
                                    borderRadius: '6px',
                                    color: queueType === q.value ? 'var(--hextech-gold)' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {q.label}
                            </button>
                        ))}
                    </div>

                    {/* Tier Grid */}
                    <div className="tier-grid" style={{ marginBottom: '10px' }}>
                        {TIERS.map(t => {
                            const isActive = soloTier === t;
                            const color = TIER_COLORS[t] || "#ffffff";
                            return (
                                <button type="button"
                                    key={t}
                                    className={`tier-btn ${isActive ? 'active' : ''}`}
                                    style={{ 
                                        padding: '8px 4px',
                                        fontSize: '0.65rem',
                                        ...(isActive ? { color, borderColor: color, boxShadow: `0 0 12px ${color}30` } : {})
                                    }}
                                    onClick={() => setSoloTier(t)}
                                >
                                    <Shield size={16} color={isActive ? color : "var(--text-secondary)"} />
                                    {t}
                                </button>
                            );
                        })}
                    </div>

                    {/* Division Grid (conditional) */}
                    {!["MASTER", "GRANDMASTER", "CHALLENGER"].includes(soloTier) && (
                        <div className="division-grid" style={{ marginBottom: '15px' }}>
                            {DIVISIONS.map(d => (
                                <button type="button"
                                    key={d}
                                    className={`division-btn ${soloDiv === d ? 'active' : ''}`}
                                    style={{ padding: '8px', fontSize: '0.8rem' }}
                                    onClick={() => setSoloDiv(d)}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    )}

                    <button type="button"
                        onClick={applyRankChanges}
                        disabled={!lcu || rankLoading}
                        style={{
                            width: '100%',
                            padding: '10px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            letterSpacing: '1px',
                            background: 'linear-gradient(135deg, rgba(200, 155, 60, 0.3) 0%, rgba(200, 155, 60, 0.1) 100%)',
                            border: '1px solid var(--hextech-gold)',
                            borderRadius: '8px',
                            color: 'var(--hextech-gold)',
                            cursor: !lcu || rankLoading ? 'not-allowed' : 'pointer',
                            opacity: !lcu || rankLoading ? 0.5 : 1,
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {rankLoading ? 'APPLYING...' : 'APPLY RANK'}
                    </button>
                </div>
            )}

            {/* View Title / Back Button - Minimalist */}
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {view === 'category-detail' && (
                    <button type="button" className="ghost-btn" onClick={() => setView('categories')} style={{ padding: '5px 10px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <ArrowLeft size={14} /> BACK
                    </button>
                )}
                {view === 'category-detail' && (
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--hextech-gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {selectedCategory?.title}
                    </span>
                )}
            </div>

            {/* Quick Start Grid */}
            <div className="quick-start-grid">
                {view === 'categories' ? (
                    categories.map(cat => (
                        <button key={cat.id} type="button" className="feature-card" onClick={() => handleCategoryClick(cat)}>
                            <div className="feature-icon">{cat.icon}</div>
                            <div className="feature-body">
                                <h3>{cat.title}</h3>
                                <p>{cat.desc}</p>
                            </div>
                            <ChevronRight size={18} className="feature-arrow" />
                        </button>
                    ))
                ) : (
                    selectedCategory?.options.map(opt => (
                        <button key={opt.id} type="button" className="feature-card" onClick={() => setActiveTab(opt.id)}>
                            <div className="feature-icon">{opt.icon}</div>
                            <div className="feature-body">
                                <h3>{opt.title}</h3>
                                <p>{opt.desc}</p>
                            </div>
                            <ChevronRight size={18} className="feature-arrow" />
                        </button>
                    ))
                )}
            </div>
        </div>
    );
};

export default React.memo(HomeTab);
