import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from "@tauri-apps/api/core";

export interface LcuInfo {
    port: string;
    token: string;
}

export function useLcu(addLog: (msg: string) => void) {
    const [lcu, setLcu] = useState<LcuInfo | null>(null);
    const prevLcuRef = useRef<LcuInfo | null>(null);

    const checkConnection = async () => {
        try {
            const info = await invoke<LcuInfo>("get_lcu_connection");
            if (!prevLcuRef.current && info) {
                addLog("League client connected.");
            }
            if (!prevLcuRef.current || prevLcuRef.current?.port !== info?.port || prevLcuRef.current?.token !== info?.token) {
                prevLcuRef.current = info;
                setLcu(info);
            }
        } catch (err) {
            if (prevLcuRef.current) {
                addLog(`League client disconnected: ${err}`);
                prevLcuRef.current = null;
                setLcu(null);
            }
        }
    };

    useEffect(() => {
        checkConnection();
        const interval = setInterval(checkConnection, 2000);
        return () => clearInterval(interval);
    }, []);

    const lcuRequest = useCallback(async (method: string, endpoint: string, body?: Record<string, unknown>): Promise<unknown> => {
        if (!lcu) throw new Error("LCU not connected");
        const payload: Record<string, unknown> = {
            method,
            endpoint,
            port: lcu.port,
            token: lcu.token
        };
        if (body) payload.body = body;
        return invoke("lcu_request", payload);
    }, [lcu]);

    return { lcu, lcuRequest };
}
