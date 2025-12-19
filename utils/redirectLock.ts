// Global flag to prevent race conditions between LoginScreen and AuthCallback
// This ensures only one redirectToApp execution happens at a time
let globalRedirectInProgress = false;

export const setGlobalRedirectInProgress = (value: boolean) => {
    globalRedirectInProgress = value;
};

export const getGlobalRedirectInProgress = () => {
    return globalRedirectInProgress;
};

// Global lock to prevent race conditions when processing OAuth callback tokens.
// Supabase refresh tokens are single-use (rotation). If two screens call setSession
// with the same refresh token, one of them will fail with "Invalid Refresh Token".
const AUTH_SESSION_LOCK_TTL_MS = 5 * 60 * 1000; // 5 minutes
let authSessionLockOwner: string | null = null;
let authSessionLockStartedAt = 0;

export const getAuthSessionLockOwner = () => authSessionLockOwner;

export const isAuthSessionLockActive = () => {
    if (!authSessionLockOwner) return false;
    if (Date.now() - authSessionLockStartedAt > AUTH_SESSION_LOCK_TTL_MS) {
        authSessionLockOwner = null;
        authSessionLockStartedAt = 0;
        return false;
    }
    return true;
};

export const tryAcquireAuthSessionLock = (owner: string) => {
    if (isAuthSessionLockActive()) return false;
    authSessionLockOwner = owner;
    authSessionLockStartedAt = Date.now();
    return true;
};

export const releaseAuthSessionLock = (owner: string) => {
    if (authSessionLockOwner !== owner) return;
    authSessionLockOwner = null;
    authSessionLockStartedAt = 0;
};
