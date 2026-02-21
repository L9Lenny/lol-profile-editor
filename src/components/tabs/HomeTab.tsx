import React from 'react';
import { ChevronRight, Layout, Disc3, Trophy, UserCircle } from 'lucide-react';
import { LcuInfo } from '../../hooks/useLcu';

interface HomeTabProps {
    lcu: LcuInfo | null;
    clientVersion: string;
    setActiveTab: (tab: string) => void;
}

const HomeTab: React.FC<HomeTabProps> = ({ lcu, clientVersion, setActiveTab }) => {
    return (
        <div className="tab-content fadeIn">
            <div className="home-hero">
                <h1 className="hero-title">League Profile Tool</h1>
                <p className="hero-subtitle">Elevate your presence in the League of Legends ecosystem with precision overrides.</p>
                <div className={`connection-status-pill ${lcu ? 'connected' : 'disconnected'}`}>
                    <div className="status-dot"></div>
                    {lcu ? 'CLIENT CONNECTED' : 'WAITING FOR CLIENT'}
                </div>
            </div>
            <div className="quick-start-grid">
                <button type="button" className="feature-card" onClick={() => setActiveTab('bio')}>
                    <div className="feature-icon"><Layout size={24} /></div>
                    <div className="feature-body"><h3>Profile Bio</h3><p>Update status message and biography.</p></div>
                    <ChevronRight size={18} className="feature-arrow" />
                </button>
                <button type="button" className="feature-card" onClick={() => setActiveTab('music')}>
                    <div className="feature-icon"><Disc3 size={24} /></div>
                    <div className="feature-body"><h3>Music Sync</h3><p>Auto-update bio with your current track.</p></div>
                    <ChevronRight size={18} className="feature-arrow" />
                </button>
                <button type="button" className="feature-card" onClick={() => setActiveTab('rank')}>
                    <div className="feature-icon"><Trophy size={24} /></div>
                    <div className="feature-body"><h3>Rank Overrides</h3><p>Modify visible Solo/Duo rankings.</p></div>
                    <ChevronRight size={18} className="feature-arrow" />
                </button>
                <button type="button" className="feature-card" onClick={() => setActiveTab('icons')}>
                    <div className="feature-icon"><UserCircle size={24} /></div>
                    <div className="feature-body"><h3>Icon Swapper</h3><p>Equip hidden summoner icons instantly.</p></div>
                    <ChevronRight size={18} className="feature-arrow" />
                </button>
            </div>
            <div className="home-footer">
                <span className="version-label">Application Build</span>
                <span className="version-value">v{clientVersion}</span>
            </div>
        </div>
    );
};

export default HomeTab;
