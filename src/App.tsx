import React, {useDeferredValue, useEffect, useMemo, useRef, useState} from "react";
import {invoke} from "@tauri-apps/api/core";
import {save} from "@tauri-apps/plugin-dialog";
import {getVersion} from "@tauri-apps/api/app";
import {disable, enable, isEnabled} from "@tauri-apps/plugin-autostart";
import {openUrl} from "@tauri-apps/plugin-opener";
import {getCurrentWindow} from "@tauri-apps/api/window";
import {
  ChevronRight,
  Coffee,
  Cpu,
  Disc3,
  Github,
  Home,
  Layout,
  Loader2,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Terminal,
  Trophy,
  UserCircle
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

interface MusicBioSettings {
  enabled: boolean;
  pollIntervalSec: number;
  template: string;
  idleText: string;
  lastfmApiKey: string;
  lastfmUsername: string;
}

interface NowPlayingTrack {
  sourceLabel: string;
  artist: string;
  title: string;
  album: string;
}

const MUSIC_BIO_STORAGE_KEY = "music_bio_settings_v1";
const DEFAULT_IDLE_BIO = "Not listening now";

const defaultMusicBioSettings = (): MusicBioSettings => ({
  enabled: false,
  pollIntervalSec: 15,
  template: "Listening to {title} - {artist}",
  idleText: DEFAULT_IDLE_BIO,
  lastfmApiKey: "",
  lastfmUsername: "",
});

const clampPollInterval = (value: number) => {
  if (!Number.isFinite(value)) return 15;
  return Math.max(5, Math.min(120, Math.round(value)));
};

const truncateBio = (value: string, max = 127) => {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 3)}...`;
};

const buildBioFromTemplate = (template: string, track: NowPlayingTrack) => {
  const replaceToken = (input: string, token: string, value: string) => input.split(token).join(value);
  return truncateBio(
    replaceToken(
      replaceToken(
        replaceToken(
          replaceToken(template, "{title}", track.title),
          "{artist}",
          track.artist
        ),
        "{album}",
        track.album
      ),
      "{source}",
      track.sourceLabel
    )
  );
};

const normalizeLastFmUsername = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/last\.fm\/user\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]) : trimmed;
};

function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [lcu, setLcu] = useState<LcuInfo | null>(null);
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [clientVersion, setClientVersion] = useState("0.0.0");
  const [latestVersion, setLatestVersion] = useState("");
  const [isAutostartEnabled, setIsAutostartEnabled] = useState(false);
  const [minimizeToTray, setMinimizeToTray] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [musicBio, setMusicBio] = useState<MusicBioSettings>(defaultMusicBioSettings);
  const [lastFmCheckLoading, setLastFmCheckLoading] = useState(false);
  const [musicSettingsHydrated, setMusicSettingsHydrated] = useState(false);

  // Rank Overrides
  const [soloTier, setSoloTier] = useState("CHALLENGER");
  const [soloDiv, setSoloDiv] = useState("I");

  // Icon Swapper State
  const [selectedIcon, setSelectedIcon] = useState<number | null>(null);
  const [allIcons, setAllIcons] = useState<{ id: number; name: string }[]>([]);
  const [iconSearchTerm, setIconSearchTerm] = useState("");
  const [ddragonVersion, setDdragonVersion] = useState("14.3.1");
  const [visibleIconsCount, setVisibleIconsCount] = useState(100);
  const gridRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<number | undefined>(undefined);
  const deferredSearchTerm = useDeferredValue(iconSearchTerm);
  const [availability, setAvailability] = useState("chat");
  const musicSyncRunningRef = useRef(false);
  const lastAutoBioRef = useRef<string>("");
  const musicSyncLastErrorRef = useRef<string>("");
  const closingRef = useRef(false);

  // Track previous connection state to detect changes
  const prevLcuRef = useRef<LcuInfo | null>(null);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [{ time: timestamp, msg }, ...prev].slice(0, 50));
  };

  const loadMusicBioSettings = () => {
    try {
      const raw = localStorage.getItem(MUSIC_BIO_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<MusicBioSettings>;
      const parsedIdle = String(parsed?.idleText ?? "").trim();
      setMusicBio({
        ...defaultMusicBioSettings(),
        ...parsed,
        idleText: parsedIdle || DEFAULT_IDLE_BIO,
        pollIntervalSec: clampPollInterval(Number(parsed?.pollIntervalSec ?? 15))
      });
    } catch {
      // Ignore broken local storage values
    }
  };

  const fetchLastFmNowPlaying = async (settings: MusicBioSettings): Promise<NowPlayingTrack | null> => {
    const username = settings.lastfmUsername.trim();
    const apiKey = settings.lastfmApiKey.trim();
    if (!username || !apiKey) return null;
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${encodeURIComponent(apiKey)}&format=json&limit=1`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Last.fm HTTP ${response.status}`);
    const payload = await response.json() as any;
    const recentTracks = payload?.recenttracks?.track;
    const track = Array.isArray(recentTracks) ? recentTracks[0] : recentTracks;
    if (!track) return null;
    const nowPlaying = String(track?.["@attr"]?.nowplaying || "").toLowerCase() === "true";
    if (!nowPlaying) return null;

    return {
      sourceLabel: "Last.fm",
      artist: String(track?.artist?.["#text"] || "").trim(),
      title: String(track?.name || "").trim(),
      album: String(track?.album?.["#text"] || "").trim()
    };
  };

  const loadCachedIcons = () => {
    try {
      const cachedVersion = localStorage.getItem("ddragon_version");
      const cachedIcons = localStorage.getItem("profile_icons");
      if (cachedVersion) setDdragonVersion(cachedVersion);
      if (cachedIcons) {
        const parsed = JSON.parse(cachedIcons);
        if (Array.isArray(parsed) && parsed.length) {
          setAllIcons(parsed);
        }
      }
    } catch {
      // Ignore cache read errors
    }
  };

  const exportLogs = async () => {
    if (!logs.length) {
      showToast("No logs to export", "error");
      return;
    }
    const lines = logs.map(log => `[${log.time}] ${log.msg}`);
    const content = lines.join("\n");
    try {
      const defaultName = `league-profile-tool-logs-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.txt`;
      const path = await save({
        defaultPath: defaultName,
        filters: [{ name: "Text", extensions: ["txt"] }]
      });
      if (!path) {
        return;
      }
      const target = Array.isArray(path) ? path[0] : path;
      const saved = await invoke<string>("save_logs_to_path", { path: target, content });
      addLog(`Logs exported to: ${saved}`);
      showToast("Logs exported", "success");
    } catch (err) {
      addLog(`Log export failed: ${err}`);
      showToast("Log export failed", "error");
    }
  };

  const showToast = (text: string, type: string) => {
    setMessage({ text, type });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setMessage({ text: "", type: "" });
    }, 3000);
  };

  const lcuRequest = async (method: string, endpoint: string, body?: Record<string, unknown>) => {
    if (!lcu) throw new Error("LCU not connected");
    const payload: Record<string, unknown> = {
      method,
      endpoint,
      port: lcu.port,
      token: lcu.token
    };
    if (body) payload.body = body;
    return invoke("lcu_request", payload);
  };

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

        // Fetch latest version from GitHub
        fetch(`https://raw.githubusercontent.com/L9Lenny/lol-profile-editor/main/updater.json?t=${Date.now()}`, {
          signal: controller.signal
        })
          .then(res => res.ok ? res.json() : Promise.reject(new Error("Failed to load updater.json")))
          .then(updateData => {
            if (active) setLatestVersion(updateData.version);
          })
          .catch(() => { });

        setAppReady(true);
        addLog(`Application ready. v${v}`);

        loadCachedIcons();

        try {
          const resV = await fetch("https://ddragon.leagueoflegends.com/api/versions.json", {
            signal: controller.signal
          });
          if (!resV.ok) throw new Error("Failed to load Data Dragon versions");
          const versions = await resV.json();
          const latest = versions[0];
          if (!active) return;
          setDdragonVersion(latest);

          const resI = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latest}/data/en_US/profileicon.json`, {
            signal: controller.signal
          });
          if (!resI.ok) throw new Error("Failed to load profile icons");
          const data = await resI.json();
          const icons = Object.values(data.data).map((icon: any) => ({
            id: parseInt(icon.id),
            name: icon.name || `Icon ${icon.id}`
          }));
          if (!active) return;
          setAllIcons(icons);
          localStorage.setItem("ddragon_version", latest);
          localStorage.setItem("profile_icons", JSON.stringify(icons));
        } catch (err) {
          addLog(`Icon cache refresh failed: ${err}`);
        }

      } catch (err) {
        if (!active) return;
        setAppReady(true);
        addLog(`Init Error: ${err}`);
      }
    };

    init().then(() => {});
    return () => {
      active = false;
      controller.abort();
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const checkConnection = async () => {
    try {
      const info = await invoke<LcuInfo>("get_lcu_connection");
      // Only log if transitioning from disconnected to connected
      if (!prevLcuRef.current && info) {
        addLog("League client connected.");
      }
      prevLcuRef.current = info;
      setLcu(info);
    } catch (err) {
      // Only log if transitioning from connected to disconnected
      if (prevLcuRef.current) {
        addLog("League client disconnected.");
      }
      prevLcuRef.current = null;
      setLcu(null);
    }
  };

  useEffect(() => {
    checkConnection().then(() => {}); // Immediate check
    const interval = setInterval(checkConnection, 2000); // Check every 2 seconds instead of 5
    return () => clearInterval(interval);
  }, []); // Remove lcu from dependencies to prevent interval churn

  useEffect(() => {
    loadMusicBioSettings();
    setMusicSettingsHydrated(true);
  }, []);

  useEffect(() => {
    if (!musicSettingsHydrated) return;
    localStorage.setItem(MUSIC_BIO_STORAGE_KEY, JSON.stringify({
      ...musicBio,
      pollIntervalSec: clampPollInterval(musicBio.pollIntervalSec)
    }));
  }, [musicBio, musicSettingsHydrated]);

  const handleUpdateBio = async () => {
    if (!lcu) return;
    setLoading(true);
    try {
      await invoke("update_bio", { port: lcu.port, token: lcu.token, newBio: bio });
      addLog(`Bio updated: "${bio}"`);
      showToast("Bio Updated!", "success");
    } catch (err) {
      showToast("Failed to update bio", "error");
    } finally { setLoading(false); }
  };

  const canEnableCurrentSource = !!musicBio.lastfmUsername.trim() && !!musicBio.lastfmApiKey.trim();
  const musicIsActive = musicBio.enabled && !!lcu;

  const enableMusicSync = () => {
    if (!canEnableCurrentSource) {
      showToast("Complete account fields first", "error");
      return;
    }
    setMusicBio(prev => ({ ...prev, enabled: true }));
    showToast("Music sync enabled", "success");
  };

  const disableMusicSync = async () => {
    await applyIdleBio();
    setMusicBio(prev => ({ ...prev, enabled: false }));
    showToast("Music sync disabled", "success");
  };

  const applyIdleBio = async () => {
    if (!lcu) return;
    const idle = truncateBio(musicBio.idleText.trim() || DEFAULT_IDLE_BIO);
    if (!idle) return;
    try {
      await invoke("update_bio", { port: lcu.port, token: lcu.token, newBio: idle });
      lastAutoBioRef.current = idle;
      addLog(`Music idle bio restored: "${idle}"`);
    } catch (err) {
      addLog(`Failed to restore idle bio: ${err}`);
    }
  };

  const quickSetupLastFm = async () => {
    try {
      await openUrl("https://www.last.fm/api/account/create");
    } catch {
      // no-op
    }
  };

  const testLastFmSetup = async () => {
    const username = musicBio.lastfmUsername.trim();
    const apiKey = musicBio.lastfmApiKey.trim();
    if (!username || !apiKey) {
      showToast("Insert Last.fm username and API key", "error");
      return;
    }
    setLastFmCheckLoading(true);
    try {
      const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${encodeURIComponent(apiKey)}&format=json&limit=1`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json() as any;
      const track = payload?.recenttracks?.track;
      if (!track) {
        throw new Error("Invalid response");
      }
      showToast("Last.fm connected", "success");
      addLog("Last.fm credentials validated.");
    } catch (err) {
      showToast("Last.fm validation failed", "error");
      addLog(`Last.fm validation failed: ${err}`);
    } finally {
      setLastFmCheckLoading(false);
    }
  };

  useEffect(() => {
    if (!musicBio.enabled || !lcu) return;

    let cancelled = false;
    let intervalId: number | undefined;

    const syncNowPlaying = async () => {
      if (cancelled || musicSyncRunningRef.current) return;
      musicSyncRunningRef.current = true;
      try {
        const settings = { ...musicBio, pollIntervalSec: clampPollInterval(musicBio.pollIntervalSec) };
        const track = await fetchLastFmNowPlaying(settings);

        let nextBio = "";
        if (track) {
          nextBio = buildBioFromTemplate(settings.template, track);
        } else if (settings.idleText.trim()) {
          nextBio = truncateBio(settings.idleText);
        }

        if (!nextBio || nextBio === lastAutoBioRef.current) return;
        await invoke("update_bio", { port: lcu.port, token: lcu.token, newBio: nextBio });
        lastAutoBioRef.current = nextBio;
        musicSyncLastErrorRef.current = "";
        addLog(`Music bio updated (lastfm): "${nextBio}"`);
      } catch (err) {
        const errorText = String(err);
        if (errorText !== musicSyncLastErrorRef.current) {
          musicSyncLastErrorRef.current = errorText;
          addLog(`Music bio sync error: ${errorText}`);
        }
      } finally {
        musicSyncRunningRef.current = false;
      }
    };

    syncNowPlaying().then(() => {});
    intervalId = window.setInterval(syncNowPlaying, clampPollInterval(musicBio.pollIntervalSec) * 1000);

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [musicBio, lcu]);

  useEffect(() => {
    if (musicBio.enabled && lcu) return;
    musicSyncRunningRef.current = false;
    musicSyncLastErrorRef.current = "";
    lastAutoBioRef.current = "";
  }, [musicBio.enabled, lcu]);

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
        await invoke("force_quit").catch(() => {
          // no-op
        });
      }
    }).then((fn) => {
      unlisten = fn;
    }).catch(() => {
      // no-op
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, [musicBio.enabled, musicBio.idleText, lcu?.port, lcu?.token]);

  const refreshAvailability = async () => {
    if (!lcu) return;
    try {
      const chatRes = await lcuRequest("GET", "/lol-chat/v1/me");
      if ((chatRes as any)?.availability) {
        const next = (chatRes as any).availability;
        if (next !== availability) {
          setAvailability(next);
          addLog(`Status synced: ${statusLabel(next)}.`);
        }
      }
    } catch (err) {
      addLog(`Status sync failed: ${err}`);
    }
  };

  const statusLabel = (value: string) => {
    switch (value) {
      case "chat":
        return "ONLINE";
      case "away":
        return "AWAY";
      case "mobile":
        return "MOBILE";
      case "offline":
        return "OFFLINE";
      default:
        return value.toUpperCase();
    }
  };

  const applyAvailability = async (next?: string) => {
    if (!lcu) return;
    const target = (next || availability).trim();
    if (!target) return;
    const previous = availability;
    if (next) setAvailability(next);
    setLoading(true);
    try {
      await lcuRequest("PUT", "/lol-chat/v1/me", { availability: target });
      showToast(`Status set to ${statusLabel(target)}`, "success");
      addLog(`Status updated: ${statusLabel(target)}.`);
    } catch (err) {
      if (next) setAvailability(previous);
      showToast("Failed to update status", "error");
      addLog(`Status update failed: ${err}`);
    } finally {
      setLoading(false);
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

  const filteredIcons = useMemo(() => {
    const term = deferredSearchTerm.trim().toLowerCase();
    if (!term) return allIcons;
    return allIcons.filter(icon =>
      icon.name.toLowerCase().includes(term) ||
      icon.id.toString().includes(term)
    );
  }, [allIcons, deferredSearchTerm]);

  const visibleIcons = useMemo(() => {
    return filteredIcons.slice(0, visibleIconsCount);
  }, [filteredIcons, visibleIconsCount]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (visibleIconsCount < filteredIcons.length) {
        setVisibleIconsCount(prev => prev + 100);
      }
    }
  };

  useEffect(() => {
    setVisibleIconsCount(100);
    if (gridRef.current) gridRef.current.scrollTop = 0;
  }, [deferredSearchTerm]);

  useEffect(() => {
    if (activeTab === "bio" && lcu) {
      refreshAvailability().then(() => {});
    }
  }, [activeTab, lcu]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!musicBio.enabled || !lcu) return;
      invoke("update_bio", {
        port: lcu.port,
        token: lcu.token,
        newBio: truncateBio(musicBio.idleText.trim() || DEFAULT_IDLE_BIO)
      }).catch(() => {
        // no-op
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [musicBio.enabled, musicBio.idleText, lcu?.port, lcu?.token]);

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
          <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
            <Home size={16} /> <span>Home</span>
          </div>
          <div className={`nav-item ${activeTab === 'bio' ? 'active' : ''}`} onClick={() => setActiveTab('bio')}>
            <ShieldCheck size={16} /> <span>Bio</span>
          </div>
          <div className={`nav-item ${activeTab === 'music' ? 'active' : ''}`} onClick={() => setActiveTab('music')}>
            <Disc3 size={16} /> <span>Music</span>
          </div>
          <div className={`nav-item ${activeTab === 'rank' ? 'active' : ''}`} onClick={() => setActiveTab('rank')}>
            <Trophy size={16} /> <span>Rank</span>
          </div>
          <div className={`nav-item ${activeTab === 'icons' ? 'active' : ''}`} onClick={() => setActiveTab('icons')}>
            <UserCircle size={16} /> <span>Icons</span>
          </div>
          <div className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
            <Terminal size={16} /> <span>Logs</span>
          </div>
          <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <Settings size={16} /> <span>Settings</span>
            {latestVersion && clientVersion !== latestVersion && (
              <div className="nav-update-beacon"></div>
            )}
          </div>
        </div>
        <div className="nav-social">
          <a href="https://github.com/L9Lenny/lol-profile-editor" target="_blank" rel="noreferrer" className="social-link-top"><Github size={18} /></a>
          <a href="https://ko-fi.com/profumato" target="_blank" rel="noreferrer" className="social-link-top"><Coffee size={18} /></a>
        </div>
      </nav>

      <main className="content-area">
        {activeTab === 'home' && (
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
              <div className="feature-card" onClick={() => setActiveTab('bio')}>
                <div className="feature-icon"><Layout size={24} /></div>
                <div className="feature-body"><h3>Profile Bio</h3><p>Update status message and biography.</p></div>
                <ChevronRight size={18} className="feature-arrow" />
              </div>
              <div className="feature-card" onClick={() => setActiveTab('music')}>
                <div className="feature-icon"><Disc3 size={24} /></div>
                <div className="feature-body"><h3>Music Sync</h3><p>Auto-update bio with your current track.</p></div>
                <ChevronRight size={18} className="feature-arrow" />
              </div>
              <div className="feature-card" onClick={() => setActiveTab('rank')}>
                <div className="feature-icon"><Trophy size={24} /></div>
                <div className="feature-body"><h3>Rank Overrides</h3><p>Modify visible Solo/Duo rankings.</p></div>
                <ChevronRight size={18} className="feature-arrow" />
              </div>
              <div className="feature-card" onClick={() => setActiveTab('icons')}>
                <div className="feature-icon"><UserCircle size={24} /></div>
                <div className="feature-body"><h3>Icon Swapper</h3><p>Equip hidden summoner icons instantly.</p></div>
                <ChevronRight size={18} className="feature-arrow" />
              </div>
            </div>
            <div className="home-footer">
              <span className="version-label">Application Build</span>
              <span className="version-value">v{clientVersion}</span>
            </div>
          </div>
        )}

        {activeTab === 'bio' && (
          <div className="tab-content fadeIn">
            <div className="card">
              <h3 className="card-title">Profile Bio</h3>
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
              <button className="primary-btn" onClick={handleUpdateBio} disabled={!lcu || loading || !bio.trim()} style={{ width: '100%', marginTop: '20px' }}>APPLY</button>
              {!lcu && <p style={{ color: '#ff3232', fontSize: '0.8rem', marginTop: '15px', textAlign: 'center' }}>⚠ Start League of Legends to enable this feature.</p>}

              {lcu && (
                <div style={{ marginTop: '25px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Chat Availability</span>
                    <span className={`availability-pill ${availability}`}>
                      <span className="availability-dot"></span>
                      {availability.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select className="availability-select" value={availability} onChange={(e) => setAvailability(e.target.value)} style={{ flex: 2 }}>
                      {[
                        { value: "chat", label: "ONLINE" },
                        { value: "away", label: "AWAY" },
                        { value: "mobile", label: "MOBILE" },
                        { value: "offline", label: "OFFLINE" }
                      ].map(state => (
                        <option key={state.value} value={state.value}>{state.label}</option>
                      ))}
                    </select>
                    <button className="primary-btn availability-apply" onClick={() => applyAvailability()} disabled={!lcu || loading} style={{ flex: 1 }}>
                      APPLY
                    </button>
                  </div>
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.55rem', color: 'var(--text-secondary)' }}>
                    Select a status and apply it to the League chat.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'music' && (
          <div className="tab-content fadeIn">
            <div className="card">
              <h3 className="card-title">Music Auto Bio</h3>
              <p className="music-subtitle">
                Configure Last.fm once. Then your League bio updates automatically while you listen.
              </p>

              <div className="music-badges">
                <span className={`music-badge ${lcu ? "ok" : "warn"}`}>LCU {lcu ? "Connected" : "Not Connected"}</span>
                <span className={`music-badge ${canEnableCurrentSource ? "ok" : "warn"}`}>Last.fm {canEnableCurrentSource ? "Ready" : "Missing Data"}</span>
                <span className={`music-badge ${musicIsActive ? "ok" : "warn"}`}>Auto Bio {musicBio.enabled ? "Enabled" : "Disabled"}</span>
              </div>

              <div className="music-step-grid">
                <div className="music-step-card">
                  <div className="music-step-kicker">Step 1</div>
                  <h4>Get Last.fm API Key</h4>
                  <p>Open Last.fm and create your API key in one click.</p>
                  <button type="button" className="ghost-btn" onClick={quickSetupLastFm}>
                    Open Last.fm API Page
                  </button>
                </div>
                <div className="music-step-card">
                  <div className="music-step-kicker">Step 2</div>
                  <h4>Connect Account</h4>
                  <p>Paste username and API key, then test if everything is valid.</p>
                  <button type="button" className="ghost-btn" onClick={testLastFmSetup} disabled={lastFmCheckLoading || !canEnableCurrentSource}>
                    {lastFmCheckLoading ? "Checking..." : "Test Last.fm Connection"}
                  </button>
                </div>
                <div className="music-step-card">
                  <div className="music-step-kicker">Step 3</div>
                  <h4>Enable Auto Bio</h4>
                  <p>Turn on automatic sync and keep your bio always updated.</p>
                  <button type="button" className="primary-btn" onClick={enableMusicSync} disabled={!lcu || !canEnableCurrentSource}>
                    Enable Auto Bio
                  </button>
                </div>
              </div>

              <div className="music-form-grid">
                <div className="input-group" style={{ margin: 0 }}>
                  <label>Last.fm Username or Profile URL</label>
                  <input
                    value={musicBio.lastfmUsername}
                    onChange={(e) => setMusicBio(prev => ({ ...prev, lastfmUsername: normalizeLastFmUsername(e.target.value) }))}
                    placeholder="last.fm/user/yourname or yourname"
                  />
                </div>
                <div className="input-group" style={{ margin: 0 }}>
                  <label>Last.fm API Key</label>
                  <input
                    value={musicBio.lastfmApiKey}
                    onChange={(e) => setMusicBio(prev => ({ ...prev, lastfmApiKey: e.target.value.trim() }))}
                    placeholder="paste your Last.fm API key"
                  />
                </div>
              </div>

              <div className="music-form-grid" style={{ marginTop: '12px' }}>
                <div className="input-group" style={{ margin: 0 }}>
                  <label>Bio Template</label>
                  <input
                    value={musicBio.template}
                    onChange={(e) => setMusicBio(prev => ({ ...prev, template: e.target.value }))}
                    placeholder="Listening to {title} - {artist}"
                  />
                  <p className="music-help">Use: {"{title}"} {"{artist}"} {"{album}"} {"{source}"}</p>
                </div>
                <div className="input-group" style={{ margin: 0 }}>
                  <label>Idle Text</label>
                  <input
                    value={musicBio.idleText}
                    onChange={(e) => setMusicBio(prev => ({ ...prev, idleText: e.target.value }))}
                    placeholder={DEFAULT_IDLE_BIO}
                  />
                </div>
              </div>

              <div className="music-actions-row">
                <div className="input-group" style={{ margin: 0, minWidth: 170 }}>
                  <label>Sync Interval (sec)</label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    step={1}
                    value={musicBio.pollIntervalSec}
                    onChange={(e) => setMusicBio(prev => ({ ...prev, pollIntervalSec: clampPollInterval(Number(e.target.value)) }))}
                  />
                </div>
                <button type="button" className="primary-btn" onClick={enableMusicSync} disabled={!lcu || !canEnableCurrentSource}>
                  {musicBio.enabled ? "Update Auto Bio" : "Connect & Enable"}
                </button>
                <button type="button" className="ghost-btn" onClick={disableMusicSync} disabled={!musicBio.enabled}>
                  Disable
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rank' && (
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

              <button className="primary-btn" style={{ width: '100%', marginTop: '20px' }} onClick={async () => {
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
                } catch (err) { showToast("Error", "error"); }
                finally { setLoading(false); }
              }}>APPLY</button>
            </div>
          </div>
        )}

        {activeTab === 'icons' && (
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
                  <div
                    key={icon.id}
                    className={`icon-item ${selectedIcon === icon.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedIcon(icon.id);
                    }}
                    style={{
                      cursor: 'pointer', borderRadius: '10px', background: 'rgba(255,255,255,0.03)',
                      padding: '10px', textAlign: 'center', border: selectedIcon === icon.id ? '2px solid var(--hextech-gold)' : '2px solid transparent',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <img src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/profileicon/${icon.id}.png`} alt={icon.name} style={{ width: '100%', borderRadius: '6px', marginBottom: '8px' }} loading="lazy" />
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{icon.name}</div>
                    <div style={{ fontSize: '0.5rem', opacity: 0.5 }}>ID: {icon.id}</div>
                  </div>
                ))}
              </div>

              <button
                className="primary-btn"
                style={{ width: '100%', marginTop: '20px' }}
                onClick={async () => {
                  const id = selectedIcon;
                  if (!lcu || id === null) return;
                  setLoading(true);
                  try {
                    // Method 1: Official Endpoint (might fail for unowned)
                    await invoke("lcu_request", {
                      method: "PUT",
                      endpoint: "/lol-summoner/v1/current-summoner/icon",
                      body: { profileIconId: id },
                      port: lcu.port,
                      token: lcu.token
                    }).catch(() => addLog("Official icon update failed (likely unowned). Trying Force method..."));

                    // Method 2: Chat Overlay (often works for unowned icons visually)
                    await invoke("lcu_request", {
                      method: "PUT",
                      endpoint: "/lol-chat/v1/me",
                      body: { icon: id },
                      port: lcu.port,
                      token: lcu.token
                    });

                    addLog(`Icon ID ${id} applied (Force sync).`);
                    showToast("Icon Applied!", "success");
                  } catch (err) {
                    addLog(`Icon Error: ${err}`);
                    showToast("Failed to apply icon", "error");
                  } finally { setLoading(false); }
                }}
                disabled={!lcu || loading || selectedIcon === null}
              >
                APPLY ICON
              </button>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="tab-content fadeIn">
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 className="card-title" style={{ margin: 0 }}>System Logs</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="ghost-btn" onClick={exportLogs}>EXPORT</button>
                  <button type="button" className="ghost-btn" onClick={() => setLogs([])}>CLEAR</button>
                </div>
              </div>
              <div className="log-container" style={{ height: '400px', overflowY: 'auto' }}>
                {logs.map((log, i) => (
                  <div key={i} className="log-entry">
                    <span style={{ color: 'var(--hextech-gold-dark)', marginRight: '10px' }}>[{log.time}]</span>
                    {log.msg}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="tab-content fadeIn">
            <div className="card">
              <h3 className="card-title">Technical Settings</h3>
              <div className="settings-row" onClick={async () => {
                const newState = !isAutostartEnabled;
                if (newState) await enable(); else await disable();
                setIsAutostartEnabled(newState);
                addLog(`Auto-launch ${newState ? 'enabled' : 'disabled'}.`);
              }}>
                <div className="settings-info">
                  <span className="settings-label">Auto-launch</span>
                  <p className="settings-desc">Launch the app automatically when your PC starts.</p>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={isAutostartEnabled} readOnly />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="settings-row" onClick={toggleMinimizeToTray} style={{ marginTop: '10px' }}>
                <div className="settings-info">
                  <span className="settings-label">Minimize to Tray</span>
                  <p className="settings-desc">Close button will minimize the app to the system tray.</p>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={minimizeToTray} readOnly />
                  <span className="slider"></span>
                </label>
              </div>

            </div>

            {latestVersion && clientVersion !== latestVersion && (
              <div className="card update-panel-hero">
                <div className="update-content">
                  <div className="update-intel">
                    <RefreshCw size={24} className="intel-spinner" />
                    <div>
                      <h3 className="update-title-hero">New Enhancement Available</h3>
                      <p className="update-desc-hero">A fresh build of the toolkit is ready to be installed (<b>v{latestVersion}</b>).</p>
                    </div>
                  </div>
                  <a href="https://github.com/L9Lenny/lol-profile-editor/releases/latest" target="_blank" rel="noreferrer" className="update-action-btn-hero">
                    UPDATE NOW
                  </a>
                </div>
              </div>
            )}

            <div className="card" style={{ marginTop: '20px', background: 'rgba(200, 155, 60, 0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <Cpu size={24} style={{ color: 'var(--hextech-gold)' }} />
                <div>
                  <h4 style={{ margin: 0, color: 'var(--hextech-gold)', fontSize: '0.9rem' }}>Bridge Interface</h4>
                  <p style={{ margin: '5px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    High-performance LCU communication layer via Tauri v2 Core.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

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

export default App;
