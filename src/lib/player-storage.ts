/** Cookie-uri setate la join (server); `player_id` e httpOnly. */
export const PLAYER_ID_COOKIE = "kahoot-live-player-id";
export const PLAYER_NICKNAME_COOKIE = "kahoot-live-nickname";
export const PLAYER_SESSION_PIN_COOKIE = "kahoot-live-session-pin";

/** Cookie httpOnly pentru Admin (control sesiune). */
export const ADMIN_SESSION_KEY_COOKIE = "kahoot-live-admin-key";

/** Chei LocalStorage pentru același jucător după refresh pe client. */
export const LS_PLAYER_ID_KEY = "kahoot-live:playerId";
export const LS_NICKNAME_KEY = "kahoot-live:nickname";
export const LS_PIN_KEY = "kahoot-live:pin";

export const PLAYER_COOKIE_MAX_AGE = 60 * 60 * 24; // 24 ore
