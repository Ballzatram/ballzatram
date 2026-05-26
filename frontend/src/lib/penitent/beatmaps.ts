export type PenitentLane = {
  id: string;
  key: string;
  numberKey: string;
  codes: string[];
  label: string;
  ability: string;
  side: "player" | "enemy";
};

export type PenitentNote = {
  id: string;
  lane: number;
  time: number;
  phrase: "march" | "wrath" | "revive" | "coda";
};

export type PenitentBeatmap = {
  id: string;
  title: string;
  encounter: string;
  bpm: number;
  durationMs: number;
  travelMs: number;
  notes: PenitentNote[];
};

export const RHYTHM_CRUSADE_CONFIG = {
  bpm: 132,
  noteTravelMs: 2300,
  songDurationMs: 78000,
  allyDownAtMs: 26000,
  timingWindows: {
    perfect: 60,
    good: 110,
    earlyLate: 160,
  },
  health: {
    playerMax: 100,
    enemyMax: 100,
    perfectDamage: 3.8,
    goodDamage: 2.2,
    earlyLateDamage: 1.1,
    missDamage: 7,
  },
  energy: {
    max: 100,
    perfectGain: 10,
    goodGain: 6,
    earlyLateGain: 3,
    missLoss: 8,
  },
  revive: {
    perfectGain: 20,
    goodGain: 12,
    earlyLateGain: 7,
    missLoss: 4,
  },
  scoring: {
    perfect: 1200,
    good: 750,
    earlyLate: 320,
    comboBonus: 16,
  },
} as const;

export const penitentLanes: PenitentLane[] = [
  { id: "lightning", key: "A", numberKey: "1", codes: ["KeyA", "Digit1"], label: "Lightning", ability: "Lightning", side: "player" },
  { id: "burst", key: "S", numberKey: "2", codes: ["KeyS", "Digit2"], label: "Burst", ability: "Burst Shockwave", side: "player" },
  { id: "shield", key: "D", numberKey: "3", codes: ["KeyD", "Digit3"], label: "Shield", ability: "Shield", side: "player" },
  { id: "flame", key: "J", numberKey: "4", codes: ["KeyJ", "Digit4"], label: "Flame", ability: "Flame", side: "enemy" },
  { id: "skull", key: "K", numberKey: "5", codes: ["KeyK", "Digit5"], label: "Skull", ability: "Demon Skull", side: "enemy" },
  { id: "meteor", key: "L", numberKey: "6", codes: ["KeyL", "Digit6"], label: "Meteor", ability: "Meteor", side: "enemy" },
];

const beatMs = 60000 / RHYTHM_CRUSADE_CONFIG.bpm;

const rhythmCrusadePattern: Array<[lane: number, beat: number, phrase?: PenitentNote["phrase"]]> = [
  [0, 0], [1, 1], [2, 2], [0, 3],
  [3, 4], [4, 5], [5, 6], [3, 7],
  [0, 8], [2, 8.5], [1, 9], [3, 10], [5, 10.5], [4, 11],
  [0, 12], [1, 13], [4, 14], [5, 15],
  [2, 16], [0, 17], [3, 18], [5, 19],
  [1, 20], [2, 20.5], [4, 21], [3, 22], [5, 22.5], [0, 23],
  [0, 24, "revive"], [1, 25, "revive"], [2, 26, "revive"], [3, 27, "revive"],
  [4, 28, "revive"], [5, 29, "revive"], [2, 30, "revive"], [3, 31, "revive"],
  [0, 32, "revive"], [4, 32.5, "revive"], [1, 33, "revive"], [5, 33.5, "revive"],
  [2, 34, "revive"], [3, 35, "revive"], [0, 36], [5, 37],
  [1, 38], [4, 39], [2, 40], [3, 41],
  [0, 42, "wrath"], [3, 42.5, "wrath"], [1, 43, "wrath"], [4, 43.5, "wrath"],
  [2, 44, "wrath"], [5, 44.5, "wrath"], [0, 46], [1, 47], [2, 48],
  [3, 49], [4, 50], [5, 51], [0, 52, "coda"], [2, 52.5, "coda"],
  [3, 53, "coda"], [5, 53.5, "coda"], [1, 55, "coda"], [4, 56, "coda"],
  [0, 58, "coda"], [5, 59, "coda"], [2, 60, "coda"], [3, 61, "coda"],
  [1, 62, "coda"], [4, 62.5, "coda"], [0, 64, "coda"], [5, 64, "coda"],
];

function buildNotes(): PenitentNote[] {
  const startMs = 1800;
  return rhythmCrusadePattern.map(([lane, beat, phrase = beat < 24 ? "march" : "wrath"], index) => ({
    id: `rhythm-crusade-${index}`,
    lane,
    time: Math.round(startMs + beat * beatMs),
    phrase,
  }));
}

export const firstCanticle: PenitentBeatmap = {
  id: "rhythm-crusade",
  title: "Penitent 2: Rhythm Crusade",
  encounter: "Infernal March",
  bpm: RHYTHM_CRUSADE_CONFIG.bpm,
  durationMs: RHYTHM_CRUSADE_CONFIG.songDurationMs,
  travelMs: RHYTHM_CRUSADE_CONFIG.noteTravelMs,
  notes: buildNotes(),
};
