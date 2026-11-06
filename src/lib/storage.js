// Per-phone memory: which member this phone is in each squad, and form state.
const safe = (fn, fallback = null) => {
  try { return fn(); } catch { return fallback; }
};

export const getMemberId = (code) => safe(() => localStorage.getItem(`squadar:member:${code}`));
export const setMemberId = (code, id) => safe(() => localStorage.setItem(`squadar:member:${code}`, id));
export const isFeedbackDone = (code) => safe(() => localStorage.getItem(`squadar:feedback:${code}`) === '1', false);
export const setFeedbackDone = (code) => safe(() => localStorage.setItem(`squadar:feedback:${code}`, '1'));
export const getLocationConsent = (code) => safe(() => localStorage.getItem(`squadar:loc:${code}`) === '1', false);
export const setLocationConsent = (code) => safe(() => localStorage.setItem(`squadar:loc:${code}`, '1'));
export const getPin = () => safe(() => sessionStorage.getItem('squadar:pin'));
export const setPin = (pin) => safe(() => sessionStorage.setItem('squadar:pin', pin));
