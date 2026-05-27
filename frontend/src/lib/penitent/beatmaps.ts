import type { PenitentAbilityAssetId } from "./assets";

export type GameDifficulty = "easy" | "medium" | "penitent";

export type TimingWindows = {
  perfect: number;
  good: number;
  earlyLate: number;
};

export type PenitentLane = {
  id: PenitentAbilityAssetId;
  key: string;
  numberKey: string;
  codes: string[];
  label: string;
  ability: string;
  side: "p1" | "p2";
};

export type PenitentNote = {
  id: string;
  lane: number;
  time: number;
  phrase: "march" | "wrath" | "revive" | "coda";
  chordId?: string;
};

export type PenitentBeatmap = {
  id: string;
  title: string;
  encounter: string;
  bpm: number;
  durationMs: number;
  travelMs: number;
  difficulty: GameDifficulty;
  seed: string;
  notes: PenitentNote[];
};

export type PenitentSongDefinition = {
  id: string;
  title: string;
  encounter: string;
  bpm: number;
  durationMs: number;
  hordeTheme: "infernal" | "dragon" | "ash";
  motifs: number[][];
};

export const penitentLanes: PenitentLane[] = [
  { id: "lightning", key: "A", numberKey: "1", codes: ["KeyA", "Digit1"], label: "Lightning", ability: "Lightning", side: "p1" },
  { id: "burst", key: "S", numberKey: "2", codes: ["KeyS", "Digit2"], label: "Burst", ability: "Burst Shockwave", side: "p1" },
  { id: "shield", key: "D", numberKey: "3", codes: ["KeyD", "Digit3"], label: "Shield", ability: "Shield", side: "p1" },
  { id: "flame", key: "J", numberKey: "4", codes: ["KeyJ", "Digit4"], label: "Flame", ability: "Flame", side: "p2" },
  { id: "skull", key: "K", numberKey: "5", codes: ["KeyK", "Digit5"], label: "Skull", ability: "Demon Skull", side: "p2" },
  { id: "meteor", key: "L", numberKey: "6", codes: ["KeyL", "Digit6"], label: "Meteor", ability: "Meteor", side: "p2" },
];

export const PENITENT_SONGS: PenitentSongDefinition[] = [
  {
    id: "infernal-march",
    title: "Infernal March",
    encounter: "Infernal March",
    bpm: 132,
    durationMs: 78000,
    hordeTheme: "infernal",
    motifs: [
      [0, 1, 2, 0, 3, 4, 5, 3],
      [0, 2, 1, 3, 5, 4, 2, 3],
      [1, 2, 4, 5, 0, 3, 1, 4],
      [0, 1, 4, 5, 2, 0, 3, 5],
    ],
  },
  {
    id: "dragon-litany",
    title: "Dragon Litany",
    encounter: "Dragon Litany",
    bpm: 146,
    durationMs: 82000,
    hordeTheme: "dragon",
    motifs: [
      [0, 3, 1, 4, 2, 5, 1, 4],
      [2, 1, 0, 5, 4, 3, 2, 5],
      [0, 0, 3, 4, 1, 2, 5, 5],
      [1, 4, 2, 5, 0, 3, 2, 4],
    ],
  },
  {
    id: "siege-of-ash",
    title: "Siege of Ash",
    encounter: "Siege of Ash",
    bpm: 118,
    durationMs: 90000,
    hordeTheme: "ash",
    motifs: [
      [2, 0, 1, 2, 4, 3, 5, 4],
      [0, 2, 0, 5, 3, 5, 1, 4],
      [1, 1, 2, 0, 3, 4, 5, 3],
      [0, 3, 2, 5, 1, 4, 0, 5],
    ],
  },
];

export const DIFFICULTY_CONFIG = {
  easy: {
    label: "Easy",
    noteTravelMs: 2700,
    timingWindows: { perfect: 85, good: 145, earlyLate: 210 },
    density: 0.72,
    eighthChance: 0.16,
    chordChance: 0,
    missDamage: 2,
    allyDownAtMs: 33000,
    hordePressureGain: 1,
    reviveGainMultiplier: 1.18,
    damageMultiplier: 0.85,
  },
  medium: {
    label: "Medium",
    noteTravelMs: 2300,
    timingWindows: { perfect: 60, good: 110, earlyLate: 160 },
    density: 0.9,
    eighthChance: 0.34,
    chordChance: 0.04,
    missDamage: 3,
    allyDownAtMs: 26000,
    hordePressureGain: 2,
    reviveGainMultiplier: 1,
    damageMultiplier: 1,
  },
  penitent: {
    label: "Penitent",
    noteTravelMs: 1900,
    timingWindows: { perfect: 45, good: 85, earlyLate: 125 },
    density: 1,
    eighthChance: 0.58,
    chordChance: 0.18,
    missDamage: 5,
    allyDownAtMs: 21000,
    hordePressureGain: 3,
    reviveGainMultiplier: 0.88,
    damageMultiplier: 1.15,
  },
} as const satisfies Record<GameDifficulty, {
  label: string;
  noteTravelMs: number;
  timingWindows: TimingWindows;
  density: number;
  eighthChance: number;
  chordChance: number;
  missDamage: number;
  allyDownAtMs: number;
  hordePressureGain: number;
  reviveGainMultiplier: number;
  damageMultiplier: number;
}>;

export const RHYTHM_CRUSADE_CONFIG = {
  health: {
    playerMax: 100,
    enemyMax: 100,
    perfectDamage: 3.8,
    goodDamage: 2.2,
    earlyLateDamage: 1.1,
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

function hashSeed(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: string) {
  let state = hashSeed(seed) || 1;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return (state >>> 0) / 4294967296;
  };
}

function pickPhrase(beat: number, totalBeats: number): PenitentNote["phrase"] {
  if (beat > totalBeats - 16) return "coda";
  if (beat >= 24 && beat <= 38) return "revive";
  return beat > totalBeats * 0.55 ? "wrath" : "march";
}

function mirrorLane(lane: number) {
  if (lane < 3) return lane + 3;
  return lane - 3;
}

export function getPenitentSong(songId: string) {
  return PENITENT_SONGS.find((song) => song.id === songId) ?? PENITENT_SONGS[0];
}

export function generatePenitentBeatmap({
  songId,
  difficulty,
  seed,
}: {
  songId: string;
  difficulty: GameDifficulty;
  seed: string;
}): PenitentBeatmap {
  const song = getPenitentSong(songId);
  const config = DIFFICULTY_CONFIG[difficulty];
  const random = seededRandom(`${song.id}:${difficulty}:${seed}`);
  const beatMs = 60000 / song.bpm;
  const startMs = 1800;
  const endBeat = Math.floor((song.durationMs - 3600) / beatMs);
  const notes: PenitentNote[] = [];
  let noteIndex = 0;

  for (let beat = 0; beat < endBeat; beat += 4) {
    const motif = song.motifs[Math.floor(random() * song.motifs.length)] ?? song.motifs[0];
    motif.forEach((lane, step) => {
      const beatOffset = step * 0.5;
      const absoluteBeat = beat + beatOffset;
      const isDownbeat = step % 2 === 0;
      if (!isDownbeat && random() > config.eighthChance) return;
      if (random() > config.density) return;

      const time = Math.round(startMs + absoluteBeat * beatMs);
      const phrase = pickPhrase(absoluteBeat, endBeat);
      notes.push({
        id: `${song.id}-${difficulty}-${seed}-${noteIndex}`,
        lane,
        time,
        phrase,
      });
      noteIndex += 1;

      if (config.chordChance > 0 && isDownbeat && random() < config.chordChance) {
        notes.push({
          id: `${song.id}-${difficulty}-${seed}-${noteIndex}`,
          lane: mirrorLane(lane),
          time,
          phrase,
          chordId: `${song.id}-${difficulty}-${seed}-chord-${noteIndex}`,
        });
        noteIndex += 1;
      }
    });
  }

  return {
    id: song.id,
    title: song.title,
    encounter: song.encounter,
    bpm: song.bpm,
    durationMs: song.durationMs,
    travelMs: config.noteTravelMs,
    difficulty,
    seed,
    notes: notes.sort((a, b) => a.time - b.time || a.lane - b.lane),
  };
}

export const firstCanticle = generatePenitentBeatmap({
  songId: PENITENT_SONGS[0].id,
  difficulty: "medium",
  seed: "default",
});
