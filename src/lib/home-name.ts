// The first name Home greets them with. Kept on this device only (we don't ask
// for names at sign-up); set in Settings.

const KEY = "cc-name";
export const MAX_NAME = 30;

export function readName(): string {
  try {
    return (localStorage.getItem(KEY) ?? "").slice(0, MAX_NAME);
  } catch {
    return "";
  }
}

export function saveName(name: string) {
  try {
    const clean = name.trim().slice(0, MAX_NAME);
    if (clean) localStorage.setItem(KEY, clean);
    else localStorage.removeItem(KEY);
  } catch {
    // storage blocked: Home just says hello
  }
}
