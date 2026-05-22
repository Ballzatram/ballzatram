export type PenitentLane = {
  id: string;
  key: string;
  code: string;
  label: string;
};

export type PenitentNote = {
  id: string;
  lane: number;
  time: number;
  phrase: string;
};

export type PenitentBeatmap = {
  id: string;
  title: string;
  bpm: number;
  travelMs: number;
  demonName: string;
  notes: PenitentNote[];
};

export const penitentLanes: PenitentLane[] = [
  { id: "bell", key: "A", code: "KeyA", label: "Bell" },
  { id: "drone", key: "S", code: "KeyS", label: "Drone" },
  { id: "blade", key: "K", code: "KeyK", label: "Blade" },
  { id: "choir", key: "L", code: "KeyL", label: "Choir" },
];

const pattern = [
  [0, 1, 2, 3],
  [0, 2, 1, 3],
  [3, 2, 1, 0],
  [0, 1, 3, 2],
  [1, 1, 2, 3],
  [0, 2, 2, 3],
  [3, 1, 0, 2],
  [0, 3, 1, 2],
];

function buildNotes() {
  const notes: PenitentNote[] = [];
  const start = 1800;
  const beat = 430;
  pattern.forEach((measure, measureIndex) => {
    measure.forEach((lane, beatIndex) => {
      const time = start + measureIndex * beat * 4 + beatIndex * beat;
      notes.push({
        id: `canticle-${measureIndex}-${beatIndex}`,
        lane,
        time,
        phrase: measureIndex < 4 ? "ash" : "flame",
      });
    });
  });

  notes.push(
    { id: "canticle-bridge-0", lane: 0, time: 15880, phrase: "seal" },
    { id: "canticle-bridge-1", lane: 3, time: 16100, phrase: "seal" },
    { id: "canticle-bridge-2", lane: 1, time: 16540, phrase: "seal" },
    { id: "canticle-bridge-3", lane: 2, time: 16760, phrase: "seal" },
    { id: "canticle-coda-0", lane: 0, time: 17480, phrase: "amen" },
    { id: "canticle-coda-1", lane: 1, time: 17910, phrase: "amen" },
    { id: "canticle-coda-2", lane: 2, time: 18340, phrase: "amen" },
    { id: "canticle-coda-3", lane: 3, time: 18770, phrase: "amen" },
  );

  return notes;
}

export const firstCanticle: PenitentBeatmap = {
  id: "first-canticle",
  title: "First Canticle Against the Horned Clerk",
  bpm: 140,
  travelMs: 2300,
  demonName: "The Horned Clerk",
  notes: buildNotes(),
};
