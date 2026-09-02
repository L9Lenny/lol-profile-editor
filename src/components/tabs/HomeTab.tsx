import React, { useState, useEffect } from 'react';
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
    Gem
} from 'lucide-react';
import { LcuInfo } from '../../hooks/useLcu';
import { LcuRequestFn } from '../../utils/chatMe';

interface HomeTabProps {
    lcu: LcuInfo | null;
    clientVersion: string;
    setActiveTab: (tab: string) => void;
    lcuRequest: LcuRequestFn;
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

const HomeTab: React.FC<HomeTabProps> = ({ lcu, clientVersion, setActiveTab, lcuRequest }) => {
    const [view, setView] = useState<'categories' | 'category-detail'>('categories');
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [summoner, setSummoner] = useState<SummonerInfo | null>(null);

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
                { id: 'challenge', title: 'Challenge Level', desc: 'Customize your challenge crystal and score.', icon: <Gem size={24} /> },
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
            
            {/* Profile Banner */}
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
                    </div>
                </div>
            </div>

            {/* View Title / Back Button */}
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
