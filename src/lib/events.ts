/**
 * Puzzle events across both formats. csTimer sessions carry a scramble type ('222so', 'pyrso', …);
 * PTimer sessions carry a WCA event id ('222', 'pyram', …). The mapping mirrors PTimer's own
 * (PTimer/src/scramble/events.ts) so sessions moved between formats land on the same event.
 */

/** Short display names, keyed by csTimer scramble type or PTimer event id. */
const NAMES: Record<string, string> = {
  // PTimer / WCA event ids
  '333': '3x3', '222': '2x2', '444': '4x4', '555': '5x5', '666': '6x6', '777': '7x7',
  '333bf': '3BLD', '333fm': 'FMC', '333oh': 'OH', clock: 'Clock', minx: 'Megaminx', pyram: 'Pyraminx',
  skewb: 'Skewb', sq1: 'Square-1', '444bf': '4BLD', '555bf': '5BLD', '333mbf': 'MBLD',
  r234: '2-4 relay', r2345: '2-5 relay', r23456: '2-6 relay', r234567: '2-7 relay', mguild: 'Mini Guildford',
  // csTimer scramble types
  '333o': '3x3', nocache_333: '3x3', '222so': '2x2', '222o': '2x2', '444wca': '4x4', '444m': '4x4',
  '555wca': '5x5', '666wca': '6x6', '777wca': '7x7', '333ni': '3BLD', clkwca: 'Clock', mgmp: 'Megaminx',
  pyrso: 'Pyraminx', skbso: 'Skewb', sqrs: 'Square-1', '444bld': '4BLD', '555bld': '5BLD', r3ni: 'MBLD',
  r234w: '2-4 relay', r2345w: '2-5 relay', r23456w: '2-6 relay', r234567w: '2-7 relay', rmngf: 'Mini Guildford',
  input: 'Typed',
};

export const eventName = (t: string) => NAMES[t] ?? t;

/** PTimer's event ids. */
export const PTIMER_EVENTS = [
  '333', '222', '444', '555', '666', '777', '333bf', '333fm', '333oh', 'clock', 'minx', 'pyram', 'skewb',
  'sq1', '444bf', '555bf', '333mbf', 'r234', 'r2345', 'r23456', 'r234567', 'mguild',
] as const;
export type PTimerEvent = (typeof PTIMER_EVENTS)[number];
export const isPTimerEvent = (v: unknown): v is PTimerEvent => PTIMER_EVENTS.includes(v as PTimerEvent);

/** csTimer scramble types → WCA events. The WCA-scrambled relays come first so exports use them. */
const CSTIMER_TYPES: Record<string, PTimerEvent> = {
  '333': '333', '333o': '333', '222so': '222', '222o': '222', '444wca': '444', '444m': '444',
  '555wca': '555', '666wca': '666', '777wca': '777', '333ni': '333bf', '333fm': '333fm', '333oh': '333oh',
  clkwca: 'clock', mgmp: 'minx', pyrso: 'pyram', skbso: 'skewb', sqrs: 'sq1', '444bld': '444bf',
  '555bld': '555bf', r3ni: '333mbf',
  r234w: 'r234', r2345w: 'r2345', r23456w: 'r23456', r234567w: 'r234567',
  r234: 'r234', r2345: 'r2345', r23456: 'r23456', r234567: 'r234567', rmngf: 'mguild',
};

/** The WCA event for a csTimer scramble type, falling back to 3x3 like PTimer does. */
export const eventFromCstimer = (scrType: string | undefined): PTimerEvent => (scrType ? CSTIMER_TYPES[scrType] : undefined) ?? '333';

/** The csTimer scramble type PTimer uses when exporting an event. */
export function cstimerType(event: string): string {
  const hit = Object.entries(CSTIMER_TYPES).find(([, e]) => e === event);
  return hit ? hit[0] : '333';
}

/** One id per puzzle, whichever format a session came from, for "same puzzle?" checks. */
export const puzzleOf = (t: string): string => (isPTimerEvent(t) ? t : (CSTIMER_TYPES[t] ?? t));
