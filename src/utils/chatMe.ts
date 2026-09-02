/**
 * Serialized read-modify-write helper for the `/lol-chat/v1/me` `lol` sub-object.
 *
 * The LCU endpoint replaces the entire `lol` field on PUT, so concurrent
 * RMW cycles from different components (enforcer, rank tab, background tab, etc.)
 * can clobber each other. This module-level promise-chain mutex serializes
 * all `lol` patches so they apply cleanly.
 */

export type LcuRequestFn = (
    method: string,
    endpoint: string,
    body?: Record<string, unknown>
) => Promise<unknown>;

let lolMutex: Promise<void> = Promise.resolve();

/**
 * Read the current `lol` object from `/lol-chat/v1/me`, apply `patch` to it,
 * and PUT the result back — all serialized so concurrent callers don't race.
 *
 * Returns the updated `lol` object that was written.
 */
export async function patchChatLol(
    lcuRequest: LcuRequestFn,
    patch: (current: Record<string, unknown>) => Record<string, unknown>
): Promise<Record<string, unknown>> {
    const run = async (): Promise<Record<string, unknown>> => {
        let baseLol: Record<string, unknown> = {};
        try {
            const chatRes = await lcuRequest("GET", "/lol-chat/v1/me") as { lol?: string | Record<string, unknown> } | null;
            if (chatRes?.lol) {
                baseLol = typeof chatRes.lol === 'string'
                    ? JSON.parse(chatRes.lol) as Record<string, unknown>
                    : chatRes.lol as Record<string, unknown>;
            }
        } catch {
            // If we can't read or parse current state, apply overrides on a fresh object
        }
        const updatedLol = patch(baseLol);
        await lcuRequest("PUT", "/lol-chat/v1/me", { lol: updatedLol });
        return updatedLol;
    };

    // Chain onto the mutex so calls are serialized.  Both fulfilment and
    // rejection of the previous link should still run the next call.
    const next = lolMutex.then(run, run);
    // Swallow errors in the mutex chain so one failure doesn't block all future calls
    lolMutex = next.then(() => undefined, () => undefined);
    return next;
}

/**
 * Read current ranked stats from the LCU.
 * Returns the ranked stats object or null if unavailable.
 */
export async function getCurrentRankedStats(
    lcuRequest: LcuRequestFn
): Promise<Record<string, unknown> | null> {
    try {
        const res = await lcuRequest("GET", "/lol-ranked/v1/current-ranked-stats") as Record<string, unknown> | null;
        return res;
    } catch {
        return null;
    }
}
