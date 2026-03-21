export function isNativeApp(): boolean {
  return typeof (window as any).Capacitor !== "undefined";
}

export function isNativePlatform(): boolean {
  return isNativeApp();
}

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}
