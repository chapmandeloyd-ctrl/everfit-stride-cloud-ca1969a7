/**
 * Detect if running inside a native app wrapper (Capacitor / Cordova).
 */
export function isNativePlatform(): boolean {
  return typeof (window as any).Capacitor !== "undefined";
}

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}
