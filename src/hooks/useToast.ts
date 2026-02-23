import { useState, useRef, useCallback } from 'react';

export function useToast() {
    const [message, setMessage] = useState({ text: "", type: "" });
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const showToast = useCallback((text: string, type: string) => {
        setMessage({ text, type });
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => {
            setMessage({ text: "", type: "" });
        }, 3000);
    }, []);

    return { message, showToast };
}
