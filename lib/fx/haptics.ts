"use client";

const STORAGE_KEY = "bw-haptics-enabled";

let _enabled: boolean | null = null;

function isEnabled(): boolean {
  if (_enabled !== null) return _enabled;
  if (typeof window === "undefined") return false;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    _enabled = stored === null ? true : stored === "1";
  } catch {
    _enabled = true;
  }
  return _enabled;
}

export function setHapticsEnabled(enabled: boolean) {
  _enabled = enabled;
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // ignore
  }
}

export function getHapticsEnabled() {
  return isEnabled();
}

type HapticPattern =
  | "tap"
  | "double"
  | "soft"
  | "success"
  | "fail"
  | "alert"
  | "long";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 10,
  double: [12, 40, 12],
  soft: 6,
  success: [8, 30, 8, 30, 16],
  fail: [40, 50, 40],
  alert: [25, 80, 25],
  long: 80
};

export function vibrate(pattern: HapticPattern | number | number[]) {
  if (!isEnabled()) return;
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  const value =
    typeof pattern === "string"
      ? PATTERNS[pattern]
      : pattern;
  try {
    navigator.vibrate(value);
  } catch {
    // ignore
  }
}
