import React, { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { isEnabled } from "@tauri-apps/plugin-autostart";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  Award,
  Coffee,
  Disc3,
  Github as GithubIcon,
  Home,
  Loader2,
  Settings,
  ShieldCheck,
  Terminal,
  Trophy,
  UserCircle
} from 'lucide-react';
import "./App.css";

// Hooks
import { useToast } from "./hooks/useToast";
import { useLogs } from "./hooks/useLogs";
import { useLcu } from "./hooks/useLcu";
import { useIcons } from "./hooks/useIcons";
import { useMusicSync } from "./hooks/useMusicSync";

// Components
import HomeTab from "./components/tabs/HomeTab";
import ProfileTab from "./components/tabs/ProfileTab";
import MusicTab from "./components/tabs/MusicTab";
import RankTab from "./components/tabs/RankTab";
import IconTab from "./components/tabs/IconTab";
import LogsTab from "./components/tabs/LogsTab";
import TokensTab from "./components/tabs/TokensTab";
import SettingsTab from "./components/tabs/SettingsTab";

function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [appReady, setAppReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientVersion, setClientVersion] = useState("0.0.0");
  const [latestVersion, setLatestVersion] = useState("");
  const [isAutostartEnabled, setIsAutostartEnabled] = useState(false);
  const [minimizeToTray, setMinimizeToTray] = useState(true);

  const { message, showToast } = useToast();
  const { logs, addLog, exportLogs, clearLogs } = useLogs();
  const { lcu, lcuRequest } = useLcu(addLog);
  const { musicBio, setMusicBio, applyIdleBio } = useMusicSync(lcu, addLog);
  const icons = useIcons(addLog);

  const closingRef = useRef(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const init = async () => {
      try {
        const [v, autostart, tray] = await Promise.all([
          getVersion(),
          isEnabled(),
          invoke<boolean>("get_minimize_to_tray").catch(() => true)
        ]);
        if (!active) return;
        setClientVersion(v);
        setIsAutostartEnabled(autostart);
        setMinimizeToTray(tray);

        fetch('https://api.github.com/repos/L9Lenny/lol-profile-editor/releases/latest', {
          signal: controller.signal
        })
          .then(res => res.ok ? res.json() : Promise.reject(new Error("Failed to load latest release from GitHub API")))
          .then(releaseData => {
            if (active && releaseData.tag_name) {
              const version = releaseData.tag_name.replace(/^v/, '');
              setLatestVersion(version);
            }
          })
          .catch((err) => {
            if (active) addLog(`Update Check Error: ${err.message}`);
          });

        setAppReady(true);
        addLog(`Application ready. v${v}`);
      } catch (err) {
        if (!active) return;
        setAppReady(true);
        addLog(`Init Error: ${err}`);
      }
    };

    init();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const appWindow = getCurrentWindow();

    appWindow.onCloseRequested(async (event) => {
      if (closingRef.current) return;
      closingRef.current = true;
      event.preventDefault();

      try {
        if (musicBio.enabled && lcu) {
          await Promise.race([
            applyIdleBio(),
            new Promise((resolve) => setTimeout(resolve, 1200))
          ]);
        }
      } catch {
        // no-op
      } finally {
        await invoke("force_quit").catch(() => { });
      }
    }).then((fn) => { unlisten = fn; });

    return () => { if (unlisten) unlisten(); };
  }, [musicBio.enabled, lcu, applyIdleBio]);

  const toggleMinimizeToTray = async () => {
    try {
      const newState = !minimizeToTray;
      await invoke("set_minimize_to_tray", { enabled: newState });
      setMinimizeToTray(newState);
      addLog(`Minimize to tray ${newState ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      addLog(`Failed to toggle minimize to tray: ${err}`);
    }
  };

  if (!appReady) {
    return (
      <div className="main-app" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 className="intel-spinner" size={48} style={{ color: 'var(--hextech-gold)', marginBottom: '20px' }} />
          <h2 style={{ color: 'var(--hextech-gold)', letterSpacing: '4px', fontSize: '0.8rem' }}>INITIALIZING LCU BRIDGE...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="main-app">
      <nav className="nav-bar">
        <div className="nav-links">
          <NavItem icon={<Home size={16} />} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavItem icon={<ShieldCheck size={16} />} label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          <NavItem icon={<Disc3 size={16} />} label="Music" active={activeTab === 'music'} onClick={() => setActiveTab('music')} />
          <NavItem icon={<Award size={16} />} label="Tokens" active={activeTab === 'tokens'} onClick={() => setActiveTab('tokens')} />
          <NavItem icon={<Trophy size={16} />} label="Rank" active={activeTab === 'rank'} onClick={() => setActiveTab('rank')} />
          <NavItem icon={<UserCircle size={16} />} label="Icons" active={activeTab === 'icons'} onClick={() => setActiveTab('icons')} />
          <NavItem icon={<Terminal size={16} />} label="Logs" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
          <NavItem icon={<Settings size={16} />} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} hasUpdate={!!latestVersion && clientVersion !== latestVersion} />
        </div>
        <div className="nav-social">
          <a href="https://github.com/L9Lenny/lol-profile-editor" target="_blank" rel="noreferrer" className="social-link-top" aria-label="GitHub Repository"><GithubIcon size={18} /></a>
          <a href="https://ko-fi.com/profumato" target="_blank" rel="noreferrer" className="social-link-top" aria-label="Support on Ko-fi"><Coffee size={18} /></a>
        </div>
      </nav>

      <main className="content-area">
        {activeTab === 'home' && <HomeTab lcu={lcu} clientVersion={clientVersion} setActiveTab={setActiveTab} />}
        {activeTab === 'profile' && <ProfileTab lcu={lcu} loading={loading} setLoading={setLoading} showToast={showToast} addLog={addLog} lcuRequest={lcuRequest} />}
        {activeTab === 'music' && <MusicTab lcu={lcu} musicBio={musicBio} setMusicBio={setMusicBio} showToast={showToast} addLog={addLog} applyIdleBio={applyIdleBio} />}
        {activeTab === 'tokens' && <TokensTab lcu={lcu} loading={loading} setLoading={setLoading} showToast={showToast} addLog={addLog} lcuRequest={lcuRequest} />}
        {activeTab === 'rank' && <RankTab lcu={lcu} loading={loading} setLoading={setLoading} showToast={showToast} addLog={addLog} />}
        {activeTab === 'icons' && <IconTab lcu={lcu} loading={loading} setLoading={setLoading} showToast={showToast} addLog={addLog} {...icons} />}
        {activeTab === 'logs' && <LogsTab logs={logs} exportLogs={exportLogs} clearLogs={clearLogs} showToast={showToast} />}
        {activeTab === 'settings' && <SettingsTab isAutostartEnabled={isAutostartEnabled} setIsAutostartEnabled={setIsAutostartEnabled} minimizeToTray={minimizeToTray} toggleMinimizeToTray={toggleMinimizeToTray} latestVersion={latestVersion} clientVersion={clientVersion} addLog={addLog} />}
      </main>

      <footer className="status-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className={`status-dot ${lcu ? 'online' : 'offline'}`}></div>
          <span style={{ textTransform: 'uppercase', fontWeight: 700, fontSize: '0.7rem' }}>{lcu ? 'LCU Connected' : 'Waiting...'}</span>
        </div>
        <div style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '0.65rem', letterSpacing: '2px' }}>
          LEAGUE PROFILE TOOL v{clientVersion}
        </div>
      </footer>

      {message.text && (
        <div className={`toast ${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}

function NavItem({ icon, label, active, onClick, hasUpdate }: Readonly<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void, hasUpdate?: boolean }>) {
  return (
    <div className={`nav-item ${active ? 'active' : ''}`} onClick={onClick} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()} role="tab" tabIndex={0}>
      {icon} <span>{label}</span>
      {hasUpdate && <div className="nav-update-beacon"></div>}
    </div>
  );
}

export default App;

