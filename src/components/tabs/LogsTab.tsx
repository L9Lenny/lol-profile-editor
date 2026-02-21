import React from 'react';
import { LogEntry } from '../../hooks/useLogs';

interface LogsTabProps {
    logs: LogEntry[];
    exportLogs: (showToast: (text: string, type: string) => void) => Promise<void>;
    clearLogs: () => void;
    showToast: (text: string, type: string) => void;
}

const LogsTab: React.FC<LogsTabProps> = ({ logs, exportLogs, clearLogs, showToast }) => {
    return (
        <div className="tab-content fadeIn">
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 className="card-title" style={{ margin: 0 }}>System Logs</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="button" className="ghost-btn" onClick={() => exportLogs(showToast)}>EXPORT</button>
                        <button type="button" className="ghost-btn" onClick={clearLogs}>CLEAR</button>
                    </div>
                </div>
                <div className="log-container" style={{ height: '400px', overflowY: 'auto' }}>
                    {logs.map((log) => (
                        <div key={log.id} className="log-entry">
                            <span style={{ color: 'var(--hextech-gold-dark)', marginRight: '10px' }}>[{log.time}]</span>
                            {log.msg}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LogsTab;
