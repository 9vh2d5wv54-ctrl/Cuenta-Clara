// "Are you a veteran or military family?" asked once on Home. Yes shows the
// veteran tools card on Home; no hides the question for good. Remembered per
// person in this browser, and changeable in Settings.

export type VeteranPref = "yes" | "no";

const key = (userId: string) => `cc-veteran-${userId}`;

export function getVeteranPref(userId: string): VeteranPref | null {
  try {
    const v = localStorage.getItem(key(userId));
    return v === "yes" || v === "no" ? v : null;
  } catch {
    return "no"; // storage blocked: don't ask on every visit
  }
}

export function setVeteranPref(userId: string, pref: VeteranPref) {
  try {
    localStorage.setItem(key(userId), pref);
  } catch {
    // nothing to remember with
  }
}
