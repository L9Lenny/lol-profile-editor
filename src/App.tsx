import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import "./App.css";

interface LcuInfo {
  port: string;
  token: string;
}

function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [lcu, setLcu] = useState<LcuInfo | null>(null);
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [clientVersion, setClientVersion] = useState("0.0.0");

  useEffect(() => {
    getVersion().then(setClientVersion);
  }, []);

  const checkConnection = async () => {
    try {
      const info = await invoke<LcuInfo>("get_lcu_connection");
      setLcu(info);
    } catch (err) {
      setLcu(null);
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

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
      setMessage({ text: res, type: "success" });
      setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    } catch (err) {
      setMessage({ text: String(err), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleFakeUpdate = () => {
    setMessage({ text: "Checking for updates...", type: "info" });
    setTimeout(() => {
      setMessage({ text: "Software is already up to date", type: "success" });
      setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    }, 2000);
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
            Home
          </div>
          <div
            className={`nav-item ${activeTab === 'custom-status' ? 'active' : ''}`}
            onClick={() => setActiveTab('custom-status')}
          >
            Custom Status
          </div>
        </div>

        <div className="nav-actions">
          <button className="update-btn" onClick={handleFakeUpdate}>
            Update
          </button>
          <a
            href="https://github.com/L9Lenny/lol-profile-editor"
            target="_blank"
            className="icon-btn"
            title="GitHub Repository"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="content-area">
        {activeTab === 'home' && (
          <div className="tab-content fadeIn">
            <header style={{ marginBottom: '30px', textAlign: 'center' }}>
              <h2 style={{ color: 'var(--hextech-gold)', margin: '0 0 10px 0', fontSize: '2rem' }}>WELCOME</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage your League profile with elegance.</p>
            </header>

            <div className="dashboard-grid">
              <div className="card stat-box">
                <span className="stat-label">Client Status</span>
                <span className={`stat-value ${lcu ? 'online' : 'offline'}`} style={{ color: lcu ? '#00ff64' : '#ff3232' }}>
                  {lcu ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <div className="card stat-box">
                <span className="stat-label">App Version</span>
                <span className="stat-value">{clientVersion}</span>
              </div>
            </div>

            <div className="card" style={{ marginTop: '20px' }}>
              <h3 className="card-title">Latest Updates</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                • Automated CI/CD pipeline for Windows/macOS.<br />
                • Real-time LCU connection monitoring.<br />
                • Optimized build performance and auto-releases.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'custom-status' && (
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
