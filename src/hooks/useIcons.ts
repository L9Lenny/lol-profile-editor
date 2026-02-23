import { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react';

export interface Icon {
    id: number;
    name: string;
}

export function useIcons(addLog: (msg: string) => void) {
    const [allIcons, setAllIcons] = useState<Icon[]>([]);
    const [iconSearchTerm, setIconSearchTerm] = useState("");
    const [ddragonVersion, setDdragonVersion] = useState("14.3.1");
    const [visibleIconsCount, setVisibleIconsCount] = useState(100);
    const deferredSearchTerm = useDeferredValue(iconSearchTerm);
    const gridRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
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
        loadCachedIcons();
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const fetchIcons = async () => {
            try {
                const resV = await fetch("https://ddragon.leagueoflegends.com/api/versions.json", {
                    signal: controller.signal
                });
                if (!resV.ok) throw new Error("Failed to load Data Dragon versions");
                const versions = await resV.json();
                const latest = versions[0];
                setDdragonVersion(latest);

                const resI = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latest}/data/en_US/profileicon.json`, {
                    signal: controller.signal
                });
                if (!resI.ok) throw new Error("Failed to load profile icons");
                const data = await resI.json();
                const icons = Object.values(data.data).map((icon: any) => ({
                    id: Number.parseInt(icon.id),
                    name: icon.name || `Icon ${icon.id}`
                }));
                setAllIcons(icons);
                localStorage.setItem("ddragon_version", latest);
                localStorage.setItem("profile_icons", JSON.stringify(icons));
            } catch (err) {
                if (!controller.signal.aborted) {
                    addLog(`Icon cache refresh failed: ${err}`);
                }
            }
        };
        fetchIcons();
        return () => controller.abort();
    }, [addLog]);

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

    return {
        allIcons,
        iconSearchTerm,
        setIconSearchTerm,
        ddragonVersion,
        visibleIcons,
        handleScroll,
        gridRef
    };
}
