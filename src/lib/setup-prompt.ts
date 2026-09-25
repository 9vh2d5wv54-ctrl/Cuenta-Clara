// New accounts should start in the setup wizard, not on an empty dashboard.
// Remembered per person in this browser, so someone who skips setup isn't
// sent back to it every time they open Home.

const key = (userId: string) => `cc-setup-seen-${userId}`;

export function setupSeen(userId: string): boolean {
  try {
    return localStorage.getItem(key(userId)) === "1";
  } catch {
    return true; // storage blocked: never loop anyone into setup
  }
}

export function markSetupSeen(userId: string) {
  try {
    localStorage.setItem(key(userId), "1");
  } catch {
    // nothing to remember with
  }
}
