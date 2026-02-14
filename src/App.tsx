import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import {
  Home,
  Settings,
  Terminal,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Cpu
} from 'lucide-react';
import "./App.css";

interface LcuInfo {
  port: string;
  token: string;
}

interface LogEntry {
  time: string;
  msg: string;
}

function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [lcu, setLcu] = useState<LcuInfo | null>(null);
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [clientVersion, setClientVersion] = useState("0.0.0");
  const [latestVersion, setLatestVersion] = useState("Checking...");
  const [isAutostartEnabled, setIsAutostartEnabled] = useState(false);
  const [minimizeToTray, setMinimizeToTray] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [{ time: timestamp, msg }, ...prev].slice(0, 50));
  };

  useEffect(() => {
    getVersion().then(setClientVersion);

    // Fetch latest version from GitHub with cache-buster
    fetch(`https://raw.githubusercontent.com/L9Lenny/lol-profile-editor/main/updater.json?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        setLatestVersion(data.version);
        addLog(`Latest version on GitHub: v${data.version}`);
      })
      .catch((err) => {
        addLog(`Failed to fetch latest version: ${err}`);
        setLatestVersion("N/A");
      });

    // Check autostart status
    isEnabled().then(setIsAutostartEnabled);

    // Load minimize to tray setting
    invoke<boolean>("get_minimize_to_tray")
      .then(setMinimizeToTray)
      .catch(() => setMinimizeToTray(true));

    addLog("Application initialized.");
  }, []);

  const checkConnection = async () => {
    try {
      const info = await invoke<LcuInfo>("get_lcu_connection");
      if (!lcu && info) {
        addLog("League of Legends client detected.");
      }
      setLcu(info);
    } catch (err) {
      if (lcu) addLog("League of Legends client disconnected.");
      setLcu(null);
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, [lcu]);

  const handleUpdateBio = async () => {
    if (!lcu) return;
    setLoading(true);
    setMessage({ text: "Updating...", type: "" });
    try {
      const res = await invoke<string>("update_bio", {
        port: lcu.port,
        token: lcu.token,
        newBio: bio,
      });
      addLog(`Bio updated: "${bio}"`);
      setMessage({ text: res, type: "success" });
      setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    } catch (err) {
      addLog(`Error updating bio: ${err}`);
      setMessage({ text: String(err), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const toggleAutostart = async () => {
    try {
      if (isAutostartEnabled) {
        await disable();
        addLog("Auto-launch disabled.");
      } else {
        await enable();
        addLog("Auto-launch enabled.");
      }
      setIsAutostartEnabled(!isAutostartEnabled);
    } catch (err) {
      addLog(`Failed to toggle auto-launch: ${err}`);
    }
  };

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

  return (
    <div className="main-app">
      {/* Top Navigation */}
      <nav className="nav-bar">
        <div className="nav-links">
          <div
            className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            <Home size={16} /> <span>Home</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'status' ? 'active' : ''}`}
            onClick={() => setActiveTab('status')}
          >
            <ShieldCheck size={16} /> <span>Status</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <Terminal size={16} /> <span>Logs</span>
          </div>
          <div
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={16} /> <span>Settings</span>
          </div>
        </div>

      </nav>

      {/* Main Content */}
      <main className="content-area">
        {activeTab === 'home' && (
          <div className="tab-content fadeIn">
            <header style={{ marginBottom: '30px', textAlign: 'center' }}>
              <h2 style={{ color: 'var(--hextech-gold)', margin: '0 0 10px 0', fontSize: '2rem', letterSpacing: '2px' }}>WELCOME</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage your League profile with elegance.</p>
            </header>

            {/* Update Recommendation Banner */}
            {clientVersion !== latestVersion && latestVersion !== "Checking..." && latestVersion !== "N/A" && (
              <div className="card update-banner-premium">
                <div className="update-banner-content">
                  <div className="update-icon-wrapper">
                    <RefreshCw size={24} className="spin-slow" />
                  </div>
                  <div className="update-text">
                    <h3 style={{ color: 'var(--hextech-gold)', margin: '0 0 5px 0' }}>Elevate Your Experience</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                      Version <b>v{latestVersion}</b> is now available. We've refined the engine for better stability and introduced new aesthetic improvements. Stay ahead with the latest Hextech refinements.
                    </p>
                  </div>
                  <a
                    href={`https://github.com/L9Lenny/lol-profile-editor/releases/latest`}
                    target="_blank"
                    rel="noreferrer"
                    className="primary-btn update-link-btn"
                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', minWidth: 'fit-content' }}
                  >
                    GET v{latestVersion}
                  </a>
                </div>
              </div>
            )}

            <div className="dashboard-grid">
              <div className="card stat-box">
                <span className="stat-label">Installed Version</span>
                <span className="stat-value">{clientVersion}</span>
              </div>
              <div className="card stat-box">
                <span className="stat-label">Latest Release</span>
                <span className="stat-value" style={{ color: clientVersion !== latestVersion && latestVersion !== "Checking..." ? 'var(--league-blue-light)' : 'var(--hextech-gold)' }}>
                  {latestVersion}
                </span>
              </div>
            </div>

            <div className="card" style={{ marginTop: '20px' }}>
              <h3 className="card-title">Project Vision</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                • <b>Absolute Precision:</b> LCU interaction optimized for speed.<br />
                • <b>Tailored UI:</b> A premium interface inspired by the Hextech aesthetic.<br />
                • <b>User-Centric:</b> Configurable behavior to fit your ritual.<br />
                • <b>Open Excellence:</b> Community-driven improvements and transparency.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'status' && (
          <div className="tab-content fadeIn">
            <div className="card">
              <h3 className="card-title">Edit Profile Bio</h3>

              <div className="input-group">
                <label>New Status Message</label>
                <textarea
                  placeholder="Tell your friends what you're up to..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  disabled={!lcu || loading}
                  rows={4}
                />
              </div>

              <button
                className="primary-btn"
                onClick={handleUpdateBio}
                disabled={!lcu || loading || !bio.trim()}
              >
                {loading ? 'UPDATING...' : 'APPLY CHANGES'}
              </button>

              {!lcu && (
                <p style={{ color: '#ff3232', fontSize: '0.8rem', marginTop: '15px', textAlign: 'center' }}>
                  ⚠ Start League of Legends to enable this feature.
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="tab-content fadeIn">
            <div className="card">
              <h3 className="card-title">Technical Settings</h3>

              <div className="settings-row">
                <div className="settings-info">
                  <span className="settings-label">Auto-launch</span>
                  <p className="settings-desc">Launch the app automatically when your PC starts.</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={isAutostartEnabled}
                    onChange={toggleAutostart}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              <div className="settings-row" style={{ marginTop: '20px' }}>
                <div className="settings-info">
                  <span className="settings-label">Minimize to Tray</span>
                  <p className="settings-desc">When you close the app, it will stay active in the system tray.</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={minimizeToTray}
                    onChange={toggleMinimizeToTray}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
            </div>

            <div className="card" style={{ marginTop: '20px' }}>
              <h3 className="card-title">System Information</h3>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Cpu size={14} /> <span>OS: Windows</span>
                </div>
                <p>Tauri Version: 2.0</p>
                <p>Identifier: com.leenny.league-profile-tool</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="tab-content fadeIn">
            <div className="log-card" style={{ height: '400px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h2 className="card-title" style={{ margin: 0, border: 'none' }}>System Logs</h2>
                <button className="icon-btn" onClick={() => setLogs([])} title="Clear Logs">
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="log-container">
                {logs.length > 0 ? (
                  logs.map((log, i) => (
                    <div key={i} className="log-entry">
                      <span style={{ color: '#c89b3c' }}>[{log.time}]</span> {log.msg}
                    </div>
                  ))
                ) : (
                  <div className="empty-logs">No logs recorded yet...</div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Status Bar */}
      <footer className="status-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`status-dot ${lcu ? 'online' : 'offline'}`}></span>
          {lcu ? `Connected: Port ${lcu.port}` : 'Waiting for client...'}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          {message.text && (
            <span style={{
              color: message.type === 'error' ? '#ff3232' : message.type === 'success' ? '#00ff64' : 'var(--league-blue-light)',
              fontWeight: 'bold'
            }}>
              {message.text}
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}

export default App;
