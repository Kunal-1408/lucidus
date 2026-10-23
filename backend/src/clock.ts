// The one place the app asks for the time, so tests can pin it.
export const CLOCK = Symbol('CLOCK');

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };

// Students are in India, so "today" is the date in India Standard Time
// (an ISO date, YYYY-MM-DD).
export function indiaDate(now: Date): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}
