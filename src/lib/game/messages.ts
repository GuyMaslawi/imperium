/**
 * Shared limits for player-to-player mail. They live here rather than in the
 * action module because a `"use server"` file may only export async functions —
 * the compose form needs these values at render time.
 */

/** Hard cap on how many players one message may be addressed to. */
export const MESSAGE_MAX_RECIPIENTS = 10;
export const MESSAGE_TITLE_MAX = 80;
export const MESSAGE_BODY_MAX = 1000;
