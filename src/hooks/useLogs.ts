import { useState, useCallback } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

export interface LogEntry {
    time: string;
    msg: string;
}

export function useLogs() {
    const [logs, setLogs] = useState<LogEntry[]>([]);

    const addLog = useCallback((msg: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [{ time: timestamp, msg }, ...prev].slice(0, 50));
    }, []);

    const exportLogs = async (showToast: (text: string, type: string) => void) => {
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

    const clearLogs = () => setLogs([]);

    return { logs, addLog, exportLogs, clearLogs };
}
