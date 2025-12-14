// Global flag to prevent race conditions between LoginScreen and AuthCallback
// This ensures only one redirectToApp execution happens at a time
let globalRedirectInProgress = false;

export const setGlobalRedirectInProgress = (value: boolean) => {
    globalRedirectInProgress = value;
};

export const getGlobalRedirectInProgress = () => {
    return globalRedirectInProgress;
};
