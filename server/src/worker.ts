// Entry point 2 of 2 (SDD 2.4): the Scheduler / Worker, SDD C-19. It runs beside the API, not under it
// (docs/feedback-changes.md), and calls the same application services.
// Jobs (SDD 5.5): expire no-card holds (FR-RES-05, US-28). How often it checks is the settings row C-19.
import { getSetting } from './data/settingsRepository.js';
import { releaseExpiredHolds } from './services/reservation/reservationService.js';

async function pollSeconds(): Promise<number> {
  const value = (await getSetting('C-19'))?.value as { poll_seconds?: unknown } | null | undefined;
  if (typeof value?.poll_seconds !== 'number' || value.poll_seconds <= 0) {
    throw new Error('Settings row C-19 is missing or invalid');
  }
  return value.poll_seconds;
}

async function tick(): Promise<void> {
  try {
    const released = await releaseExpiredHolds();
    if (released > 0) console.log(`worker: released ${String(released)} expired hold(s)`);
  } catch (error) {
    // One failed run must not stop the worker; the next run picks up the same due holds (SDD 5.5).
    console.error('worker: releasing expired holds failed', error);
  }
}

async function main(): Promise<void> {
  const seconds = await pollSeconds();
  console.log(`worker started, checking every ${String(seconds)} s`);
  await tick();
  setInterval(() => {
    void tick();
  }, seconds * 1000);
}

void main().catch((error: unknown) => {
  console.error('worker could not start', error);
  process.exit(1);
});
