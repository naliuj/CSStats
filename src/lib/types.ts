export type Penalty = 0 | 2000 | -1;

export interface Solve {
  /** Final time in ms including +2; Infinity for DNF. */
  time: number;
  /** Time as recorded, before penalties, in ms. */
  raw: number;
  penalty: Penalty;
  scramble: string;
  comment: string;
  /** Epoch ms. */
  date: number;
}

export interface Session {
  id: string;
  name: string;
  scrType: string;
  rank: number;
  solves: Solve[];
}
