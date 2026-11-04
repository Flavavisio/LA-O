import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { readBattery } from './battery';
/** The native application must register/sync the official Device plugin. */
export function readCurrentBattery() {
  return readBattery({ nativeDevice: Capacitor.isNativePlatform() ? Device : undefined });
}
