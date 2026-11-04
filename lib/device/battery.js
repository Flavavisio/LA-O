/** Device telemetry only: this module never requests location or reads identifiers. */
export function normalizeBattery(info, source) {
  if (!info || !['web', 'native'].includes(source)) return null;
  const level = info.batteryLevel;
  if (typeof level !== 'number' || !Number.isFinite(level) || level < 0 || level > 1 || typeof info.isCharging !== 'boolean') return null;
  return { battery: Math.round(level * 100), charging: info.isCharging, source };
}

export async function readBattery({ nativeDevice, navigator: nav = globalThis.navigator } = {}) {
  try {
    if (nativeDevice) return normalizeBattery(await nativeDevice.getBatteryInfo(), 'native');
    if (typeof nav?.getBattery !== 'function') return null;
    const result = await nav.getBattery();
    return normalizeBattery({ batteryLevel: result.level, isCharging: result.charging }, 'web');
  } catch { return null; }
}

/**
 * Foreground-only reporter. No queued location, no fabricated fallback values.
 * A cleanup cancels an in-flight request; the server independently checks consent.
 * Retries use the NEXT current reading rather than replaying stale offline samples.
 */
export function createBatteryReporter({ read, send, visible = () => true, clock = () => Date.now(), intervalMs = 60000, timers = globalThis, onError = () => {} }) {
  let stopped = false, inFlight = false, lastSuccess = 0, lastReading = null;
  const controller = new AbortController();
  async function tick() {
    if (stopped || inFlight || !visible()) return;
    inFlight = true;
    try {
      const reading = await read();
      if (!reading || stopped || !visible()) return;
      const changed = !lastReading || reading.battery !== lastReading.battery || reading.charging !== lastReading.charging || reading.source !== lastReading.source;
      if (!changed && clock() - lastSuccess < intervalMs) return;
      await send(reading, controller.signal);
      if (!stopped) { lastSuccess = clock(); lastReading = reading; }
    } catch (error) { if (!stopped) onError(error); }
    finally { inFlight = false; }
  }
  const timer = timers.setInterval(tick, intervalMs);
  return { tick, start: tick, stop() { stopped = true; controller.abort(); timers.clearInterval(timer); } };
}

export function batteryFreshness(updated, now = Date.now()) {
  const at = typeof updated === 'string' ? Date.parse(updated) : NaN;
  if (!Number.isFinite(at)) return 'unknown';
  const age = now - at;
  if (age < -60000) return 'unknown';
  return age <= 5 * 60 * 1000 ? 'recent' : 'stale';
}
