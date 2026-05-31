"use client";

import Link from "next/link";
import type { Route } from "next";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { penitentAssetPaths, penitentRuntimeAssets } from "@/lib/penitent/assets";
import {
  DIFFICULTY_CONFIG,
  PENITENT_SONGS,
  RHYTHM_CRUSADE_CONFIG,
  generatePenitentBeatmap,
  getPenitentSong,
  penitentLanes,
  type GameDifficulty,
  type PenitentBeatmap,
  type PenitentLane,
  type PenitentNote,
} from "@/lib/penitent/beatmaps";

type GameState = "ready" | "tutorial" | "playing" | "allyDown" | "resurrection" | "victory" | "defeat";
type Judgment = "perfect" | "good" | "early" | "late" | "miss";
type NoteState = PenitentNote & { state: "pending" | "hit" | "miss"; judgment?: Judgment };
type HitEffect = { id: number; lane: number; judgment: Judgment };
type ImpactKind = "perfect" | "good" | "miss" | null;
type ActorLayer = { id: string; src: string; className: string; x: number; y: number; scale: number; delay: number };
type HordeVisualState = "advancing" | "attacking" | "staggered" | "pulverized" | "retreating" | "resurrectionSurge";
type HordeActor = ActorLayer & { row: "rear" | "middle" | "front"; mirror?: boolean };

const IS_DEVELOPMENT = process.env.NODE_ENV !== "production";
const ACTIVE_STATES: GameState[] = ["playing", "allyDown", "resurrection"];
const laneRows = [17, 30, 43, 57, 70, 83];
const difficultyOrder: GameDifficulty[] = ["easy", "medium", "penitent"];
const tutorialTargets = [0, 3, 1];

const hordeActors: HordeActor[] = [
  { id: "rear-trident-1", src: penitentAssetPaths.demons.trident, className: "trident", row: "rear", x: 35, y: 42, scale: 0.62, delay: -0.1 },
  { id: "rear-axe-1", src: penitentAssetPaths.demons.axe, className: "axe", row: "rear", x: 44, y: 44, scale: 0.66, delay: -0.7, mirror: true },
  { id: "rear-hand-1", src: penitentAssetPaths.demons.hand, className: "hand", row: "rear", x: 52, y: 43, scale: 0.56, delay: -1.1 },
  { id: "rear-trident-2", src: penitentAssetPaths.demons.trident, className: "trident", row: "rear", x: 61, y: 44, scale: 0.64, delay: -0.35, mirror: true },
  { id: "rear-beast-1", src: penitentAssetPaths.demons.beast, className: "beast", row: "rear", x: 69, y: 43, scale: 0.7, delay: -1.35 },
  { id: "mid-axe-1", src: penitentAssetPaths.demons.axe, className: "axe", row: "middle", x: 38, y: 57, scale: 0.8, delay: -0.5 },
  { id: "mid-trident-1", src: penitentAssetPaths.demons.trident, className: "trident", row: "middle", x: 47, y: 59, scale: 0.84, delay: -0.2, mirror: true },
  { id: "mid-beast-1", src: penitentAssetPaths.demons.beast, className: "beast", row: "middle", x: 56, y: 58, scale: 0.94, delay: -0.9 },
  { id: "mid-axe-2", src: penitentAssetPaths.demons.axe, className: "axe", row: "middle", x: 65, y: 59, scale: 0.82, delay: -1.25, mirror: true },
  { id: "front-trident-1", src: penitentAssetPaths.demons.trident, className: "trident", row: "front", x: 41, y: 73, scale: 1.02, delay: -0.1 },
  { id: "front-beast-1", src: penitentAssetPaths.demons.beast, className: "beast", row: "front", x: 50, y: 75, scale: 1.18, delay: -0.55 },
  { id: "front-axe-1", src: penitentAssetPaths.demons.axe, className: "axe", row: "front", x: 59, y: 74, scale: 1.02, delay: -0.85, mirror: true },
  { id: "front-hand-1", src: penitentAssetPaths.demons.hand, className: "hand", row: "front", x: 68, y: 73, scale: 0.72, delay: -1.2 },
];

const dragonActors: ActorLayer[] = [
  { id: "dragon-left", src: penitentAssetPaths.dragons.largeLeft, className: "large-left", x: 17, y: 13, scale: 1, delay: -0.25 },
  { id: "dragon-right", src: penitentAssetPaths.dragons.largeRight, className: "large-right", x: 72, y: 13, scale: 1, delay: -0.85 },
  { id: "dragon-small-left", src: penitentAssetPaths.dragons.smallLeft, className: "small-left", x: 7, y: 33, scale: 0.9, delay: -1.1 },
  { id: "dragon-small-mid", src: penitentAssetPaths.dragons.smallMid, className: "small-mid", x: 32, y: 34, scale: 0.82, delay: -0.55 },
  { id: "dragon-medium", src: penitentAssetPaths.dragons.mediumFire, className: "medium", x: 63, y: 35, scale: 0.88, delay: -1.35 },
  { id: "dragon-low", src: penitentAssetPaths.dragons.lowRight, className: "low-right", x: 87, y: 33, scale: 0.9, delay: -0.4 },
];

function isActiveState(state: GameState) {
  return ACTIVE_STATES.includes(state);
}

function freshNotes(beatmap: PenitentBeatmap): NoteState[] {
  return beatmap.notes.map((note) => ({ ...note, state: "pending" }));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = `${totalSeconds % 60}`.padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function densityLabel(density: number) {
  if (density >= 0.98) return "Relentless";
  if (density >= 0.85) return "Marching";
  return "Merciful";
}

function difficultySummary(difficulty: GameDifficulty) {
  if (difficulty === "easy") return "Wide timing, slower notes";
  if (difficulty === "penitent") return "Tight timing, denser chords";
  return "Balanced battle tempo";
}

function makeRunSeed() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function judgeDelta(delta: number, difficulty: GameDifficulty): Exclude<Judgment, "miss"> | null {
  const distance = Math.abs(delta);
  const windows = DIFFICULTY_CONFIG[difficulty].timingWindows;
  if (distance <= windows.perfect) return "perfect";
  if (distance <= windows.good) return "good";
  if (distance <= windows.earlyLate) return delta > 0 ? "early" : "late";
  return null;
}

function judgmentLabel(judgment: Judgment) {
  if (judgment === "perfect") return "PERFECT";
  if (judgment === "good") return "GOOD";
  if (judgment === "early") return "EARLY";
  if (judgment === "late") return "LATE";
  return "MISS";
}

function hordeStateLabel(state: HordeVisualState) {
  if (state === "attacking") return "Attacking";
  if (state === "staggered") return "Staggered";
  if (state === "pulverized") return "Pulverized";
  if (state === "retreating") return "Retreating";
  if (state === "resurrectionSurge") return "Swarming";
  return "Advancing";
}

function hordePressureClass(enemyEnergy: number) {
  if (enemyEnergy >= 84) return "is-pressure-critical";
  if (enemyEnergy >= 62) return "is-pressure-high";
  if (enemyEnergy <= 24) return "is-pressure-low";
  return "is-pressure-mid";
}

function getHordeVisualState({
  combo,
  enemyEnergy,
  enemyHealth,
  impactKind,
  resurrectionActive,
}: {
  combo: number;
  enemyEnergy: number;
  enemyHealth: number;
  impactKind: ImpactKind;
  resurrectionActive: boolean;
}): HordeVisualState {
  if (impactKind === "miss") return "attacking";
  if (impactKind === "perfect" || (combo >= 8 && combo % 8 === 0)) return "pulverized";
  if (impactKind === "good") return "staggered";
  if (resurrectionActive) return "resurrectionSurge";
  if (enemyHealth <= 28 || enemyEnergy <= 18) return "retreating";
  return "advancing";
}

function impactHoldMs(kind: ImpactKind) {
  if (kind === "perfect") return 620;
  if (kind === "good") return 380;
  if (kind === "miss") return 520;
  return 240;
}

function scoreFor(judgment: Exclude<Judgment, "miss">) {
  if (judgment === "perfect") return RHYTHM_CRUSADE_CONFIG.scoring.perfect;
  if (judgment === "good") return RHYTHM_CRUSADE_CONFIG.scoring.good;
  return RHYTHM_CRUSADE_CONFIG.scoring.earlyLate;
}

function damageFor(judgment: Exclude<Judgment, "miss">, difficulty: GameDifficulty) {
  const base =
    judgment === "perfect"
      ? RHYTHM_CRUSADE_CONFIG.health.perfectDamage
      : judgment === "good"
        ? RHYTHM_CRUSADE_CONFIG.health.goodDamage
        : RHYTHM_CRUSADE_CONFIG.health.earlyLateDamage;
  return base * DIFFICULTY_CONFIG[difficulty].damageMultiplier;
}

function energyFor(judgment: Exclude<Judgment, "miss">) {
  if (judgment === "perfect") return RHYTHM_CRUSADE_CONFIG.energy.perfectGain;
  if (judgment === "good") return RHYTHM_CRUSADE_CONFIG.energy.goodGain;
  return RHYTHM_CRUSADE_CONFIG.energy.earlyLateGain;
}

function reviveFor(judgment: Exclude<Judgment, "miss">, difficulty: GameDifficulty) {
  const base =
    judgment === "perfect"
      ? RHYTHM_CRUSADE_CONFIG.revive.perfectGain
      : judgment === "good"
        ? RHYTHM_CRUSADE_CONFIG.revive.goodGain
        : RHYTHM_CRUSADE_CONFIG.revive.earlyLateGain;
  return base * DIFFICULTY_CONFIG[difficulty].reviveGainMultiplier;
}

function notePosition(note: PenitentNote, currentTime: number, beatmap: PenitentBeatmap) {
  const lane = penitentLanes[note.lane];
  const remaining = note.time - currentTime;
  const progress = clamp(1 - remaining / beatmap.travelMs, 0, 1.15);
  const x = lane.side === "p1" ? 8 + progress * 42 : 92 - progress * 42;
  return { x, y: laneRows[note.lane] ?? 50 };
}

export function RhythmCrusadeGame() {
  const [status, setStatus] = useState<GameState>("ready");
  const [isPaused, setIsPaused] = useState(false);
  const [songId, setSongId] = useState(PENITENT_SONGS[0].id);
  const [difficulty, setDifficulty] = useState<GameDifficulty>("medium");
  const [runSeed, setRunSeed] = useState("DEFAULT");
  const beatmap = useMemo(() => generatePenitentBeatmap({ songId, difficulty, seed: runSeed }), [difficulty, runSeed, songId]);
  const song = useMemo(() => getPenitentSong(songId), [songId]);
  const difficultyConfig = DIFFICULTY_CONFIG[difficulty];

  const [notes, setNotes] = useState<NoteState[]>(() => freshNotes(beatmap));
  const [time, setTime] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [bestCombo, setBestCombo] = useState<number>(0);
  const [playerHealth, setPlayerHealth] = useState<number>(RHYTHM_CRUSADE_CONFIG.health.playerMax);
  const [enemyHealth, setEnemyHealth] = useState<number>(RHYTHM_CRUSADE_CONFIG.health.enemyMax);
  const [playerEnergy, setPlayerEnergy] = useState<number>(0);
  const [enemyEnergy, setEnemyEnergy] = useState<number>(72);
  const [reviveProgress, setReviveProgress] = useState<number>(0);
  const [message, setMessage] = useState("Strike A S D and J K L to drive the demon horde back.");
  const [judgmentText, setJudgmentText] = useState("READY");
  const [laneFlash, setLaneFlash] = useState<number | null>(null);
  const [hitEffects, setHitEffects] = useState<HitEffect[]>([]);
  const [impactKind, setImpactKind] = useState<ImpactKind>(null);
  const [screenShake, setScreenShake] = useState(false);
  const [reviveCompleteNotice, setReviveCompleteNotice] = useState(false);
  const [tutorialHits, setTutorialHits] = useState(0);
  const [tutorialPrompt, setTutorialPrompt] = useState("Strike the glowing lane when the note reaches the sacred line.");

  const startTimeRef = useRef(0);
  const pauseStartedRef = useRef(0);
  const statusRef = useRef<GameState>("ready");
  const pausedRef = useRef(false);
  const comboRef = useRef(0);
  const hitEffectIdRef = useRef(0);
  const autoAllyDownTriggeredRef = useRef(false);

  useEffect(() => {
    const preloadTimer = window.setTimeout(() => {
      for (const src of penitentRuntimeAssets) {
        const image = new window.Image();
        image.decoding = "async";
        image.src = src;
      }
    }, 120);

    return () => window.clearTimeout(preloadTimer);
  }, []);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    comboRef.current = combo;
  }, [combo]);

  useEffect(() => {
    if (status !== "ready") return;
    setNotes(freshNotes(beatmap));
    setTime(0);
  }, [beatmap, status]);

  const visibleNotes = useMemo(() => {
    const missWindow = difficultyConfig.timingWindows.earlyLate;
    if (!isActiveState(status)) return [];
    return notes.filter((note) => {
      const untilHit = note.time - time;
      return note.state === "pending" && untilHit < beatmap.travelMs && untilHit > -missWindow;
    });
  }, [beatmap.travelMs, difficultyConfig.timingWindows.earlyLate, notes, status, time]);

  const progressPercent = clamp((time / beatmap.durationMs) * 100, 0, 100);
  const resurrectionActive = status === "allyDown" || status === "resurrection";
  const tutorialActive = status === "tutorial";
  const tutorialTargetLane = tutorialTargets[Math.min(tutorialHits, tutorialTargets.length - 1)] ?? 0;
  const gameActive = (isActiveState(status) || tutorialActive || status === "ready") && !isPaused;
  const activeForInput = status === "playing" || status === "resurrection";
  const laneInputEnabled = activeForInput || tutorialActive;
  const modeLabel = resurrectionActive ? "RESURRECTION" : tutorialActive ? "LEARN THE RITE" : beatmap.encounter;
  const beatMs = 60000 / beatmap.bpm;
  const beatPhase = (time % beatMs) / beatMs;
  const downbeatPulse = Math.max(0, 1 - beatPhase / 0.16);
  const afterbeatPulse = beatPhase > 0.23 && beatPhase < 0.4 ? Math.max(0, 1 - Math.abs(beatPhase - 0.3) / 0.08) * 0.62 : 0;
  const heartPulse = gameActive ? clamp(downbeatPulse + afterbeatPulse, 0, 1) : 0.22;
  const heartFrame = clamp(Math.round(heartPulse * (penitentAssetPaths.heart.frames.length - 1)), 0, penitentAssetPaths.heart.frames.length - 1);
  const hordeVisualState = getHordeVisualState({ combo, enemyEnergy, enemyHealth, impactKind, resurrectionActive });

  const clearImpact = useCallback((kind: ImpactKind) => {
    window.setTimeout(() => {
      setImpactKind((current) => (current === kind ? null : current));
    }, impactHoldMs(kind));
    window.setTimeout(() => {
      setScreenShake(false);
    }, 170);
  }, []);

  const triggerImpact = useCallback((kind: ImpactKind) => {
    setImpactKind(kind);
    if (kind === "perfect" || kind === "miss") setScreenShake(true);
    clearImpact(kind);
  }, [clearImpact]);

  const flashLane = useCallback((lane: number) => {
    setLaneFlash(lane);
    window.setTimeout(() => setLaneFlash((current) => (current === lane ? null : current)), 150);
  }, []);

  const addHitEffect = useCallback((lane: number, judgment: Judgment) => {
    const id = hitEffectIdRef.current + 1;
    hitEffectIdRef.current = id;
    setHitEffects((current) => [...current.slice(-7), { id, lane, judgment }]);
    window.setTimeout(() => {
      setHitEffects((current) => current.filter((effect) => effect.id !== id));
    }, 520);
  }, []);

  const start = useCallback(() => {
    startTimeRef.current = performance.now();
    pauseStartedRef.current = 0;
    autoAllyDownTriggeredRef.current = false;
    setNotes(freshNotes(beatmap));
    setTime(0);
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setPlayerHealth(RHYTHM_CRUSADE_CONFIG.health.playerMax);
    setEnemyHealth(RHYTHM_CRUSADE_CONFIG.health.enemyMax);
    setPlayerEnergy(0);
    setEnemyEnergy(72);
    setReviveProgress(0);
    setTutorialHits(0);
    setTutorialPrompt("Strike the glowing lane when the note reaches the sacred line.");
    setMessage(`${beatmap.title} begins.`);
    setJudgmentText("PLAY");
    setIsPaused(false);
    setStatus("playing");
  }, [beatmap]);

  const startTutorial = useCallback(() => {
    setNotes(freshNotes(beatmap));
    setTime(0);
    setCombo(0);
    setScore(0);
    setBestCombo(0);
    setTutorialHits(0);
    setTutorialPrompt("Strike the glowing A lane. Notes are judged on the sacred center line.");
    setJudgmentText("LEARN");
    setMessage("Practice three hits, then the real battle begins.");
    setIsPaused(false);
    setStatus("tutorial");
    flashLane(tutorialTargets[0]);
  }, [beatmap, flashLane]);

  const rerollSeed = useCallback(() => {
    if (isActiveState(statusRef.current)) return;
    setRunSeed(makeRunSeed());
  }, []);

  const triggerAllyDown = useCallback(() => {
    if (statusRef.current !== "playing") return;
    setStatus("allyDown");
    setReviveProgress(0);
    setJudgmentText("ALLY FALLEN");
    setMessage("P1 falls. P2 keeps the rhythm alive.");
    triggerImpact("miss");
  }, [triggerImpact]);

  const applyMiss = useCallback((reason = "MISS", missCount = 1) => {
    const state = statusRef.current;
    if (!isActiveState(state)) return;
    const healthLoss =
      state === "allyDown"
        ? 0
        : state === "resurrection"
          ? 0
          : difficultyConfig.missDamage * missCount;
    setJudgmentText("MISS");
    setMessage(reason);
    setCombo(0);
    setPlayerHealth((current) => Math.max(0, current - healthLoss));
    setPlayerEnergy((current) => Math.max(0, current - RHYTHM_CRUSADE_CONFIG.energy.missLoss * missCount));
    setEnemyEnergy((current) => Math.min(RHYTHM_CRUSADE_CONFIG.energy.max, current + difficultyConfig.hordePressureGain * missCount));
    if (state === "resurrection") {
      setReviveProgress((current) => Math.max(0, current - RHYTHM_CRUSADE_CONFIG.revive.missLoss * missCount));
    }
    triggerImpact("miss");
  }, [difficultyConfig.hordePressureGain, difficultyConfig.missDamage, triggerImpact]);

  const applySuccessfulHit = useCallback((judgment: Exclude<Judgment, "miss">, lane: number) => {
    const comboBeforeHit = comboRef.current;
    setScore((current) => current + scoreFor(judgment) + comboBeforeHit * RHYTHM_CRUSADE_CONFIG.scoring.comboBonus);
    setCombo((current) => {
      const next = current + 1;
      setBestCombo((best) => Math.max(best, next));
      return next;
    });
    setEnemyHealth((current) => Math.max(0, current - damageFor(judgment, difficulty)));
    setPlayerEnergy((current) => Math.min(RHYTHM_CRUSADE_CONFIG.energy.max, current + energyFor(judgment)));
    setEnemyEnergy((current) => Math.max(0, current - (judgment === "perfect" ? 4 : 2)));
    if (statusRef.current === "resurrection") {
      setReviveProgress((current) => Math.min(100, current + reviveFor(judgment, difficulty)));
    }
    setJudgmentText(judgmentLabel(judgment));
    setMessage(
      judgment === "perfect"
        ? "Sacred lightning pulverizes the front line."
        : judgment === "good"
          ? "The hymn drives the horde back."
          : "The note survives by a thread.",
    );
    flashLane(lane);
    addHitEffect(lane, judgment);
    triggerImpact(judgment === "perfect" ? "perfect" : "good");
  }, [addHitEffect, difficulty, flashLane, triggerImpact]);

  const hitTutorialLane = useCallback((lane: number) => {
    if (statusRef.current !== "tutorial") return;
    const target = tutorialTargets[Math.min(tutorialHits, tutorialTargets.length - 1)] ?? 0;
    flashLane(lane);

    if (lane !== target) {
      setJudgmentText("TRY AGAIN");
      setTutorialPrompt(`Watch the glowing ${penitentLanes[target].key} lane and strike it on the center line.`);
      triggerImpact("miss");
      return;
    }

    const nextHits = tutorialHits + 1;
    addHitEffect(lane, "perfect");
    triggerImpact("perfect");
    setTutorialHits(nextHits);
    setCombo(nextHits);
    setJudgmentText("PERFECT");

    if (nextHits >= tutorialTargets.length) {
      setTutorialPrompt("Good. The hymn is yours.");
      setMessage("Tutorial complete. Enter the real battle.");
      window.setTimeout(() => start(), 650);
      return;
    }

    const nextLane = tutorialTargets[nextHits];
    setTutorialPrompt(`Now strike ${penitentLanes[nextLane].key} or ${penitentLanes[nextLane].numberKey} as the note crosses the sacred line.`);
    window.setTimeout(() => flashLane(nextLane), 90);
  }, [addHitEffect, flashLane, start, triggerImpact, tutorialHits]);

  const hitLane = useCallback((lane: number) => {
    if (statusRef.current === "tutorial") {
      hitTutorialLane(lane);
      return;
    }
    if (!activeForInput || isPaused) return;
    const target = notes
      .filter((note) => note.state === "pending" && note.lane === lane)
      .sort((a, b) => Math.abs(a.time - time) - Math.abs(b.time - time))[0];
    const judgment = target ? judgeDelta(target.time - time, difficulty) : null;
    flashLane(lane);

    if (!target || !judgment) {
      applyMiss("The horde finds the silence.");
      return;
    }

    setNotes((current) =>
      current.map((note) =>
        note.id === target.id && note.state === "pending" ? { ...note, state: "hit", judgment } : note,
      ),
    );
    applySuccessfulHit(judgment, lane);
  }, [activeForInput, applyMiss, applySuccessfulHit, difficulty, flashLane, hitTutorialLane, isPaused, notes, time]);

  const simulatePerfectHit = useCallback(() => {
    if (!isActiveState(statusRef.current) || pausedRef.current) return;
    const target = notes
      .filter((note) => note.state === "pending")
      .sort((a, b) => Math.abs(a.time - time) - Math.abs(b.time - time))[0];
    const lane = target?.lane ?? 0;
    if (target) {
      setNotes((current) =>
        current.map((note) =>
          note.id === target.id && note.state === "pending" ? { ...note, state: "hit", judgment: "perfect" } : note,
        ),
      );
    }
    applySuccessfulHit("perfect", lane);
  }, [applySuccessfulHit, notes, time]);

  const togglePause = useCallback(() => {
    if (!isActiveState(statusRef.current)) return;
    if (pausedRef.current) {
      startTimeRef.current += performance.now() - pauseStartedRef.current;
      pauseStartedRef.current = 0;
      setIsPaused(false);
      setMessage("The page exhales.");
    } else {
      pauseStartedRef.current = performance.now();
      setIsPaused(true);
      setMessage("The page holds its breath.");
    }
  }, []);

  useEffect(() => {
    if (status !== "allyDown") return;
    const timer = window.setTimeout(() => {
      setStatus("resurrection");
      setJudgmentText("RESURRECTION");
      setMessage("Keep hitting notes to resurrect your ally.");
    }, 900);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (status !== "resurrection" || reviveProgress < 100) return;
    setStatus("playing");
    setJudgmentText("ALLY RESURRECTED");
    setMessage("ALLY RESURRECTED. The duet returns.");
    setReviveCompleteNotice(true);
    setPlayerHealth((current) => Math.min(RHYTHM_CRUSADE_CONFIG.health.playerMax, current + 18));
    setPlayerEnergy((current) => Math.min(RHYTHM_CRUSADE_CONFIG.energy.max, current + 16));
    triggerImpact("perfect");
    window.setTimeout(() => setReviveProgress(0), 900);
    window.setTimeout(() => setReviveCompleteNotice(false), 1800);
  }, [reviveProgress, status, triggerImpact]);

  useEffect(() => {
    if (!isActiveState(status) || isPaused) return;
    let frame = 0;

    // The rhythm clock is anchored to a single start timestamp. The beatmap is
    // generated before play starts, then notes are judged against absolute times.
    function loop(now: number) {
      const elapsed = now - startTimeRef.current;
      setTime(elapsed);

      if (
        statusRef.current === "playing" &&
        !autoAllyDownTriggeredRef.current &&
        elapsed >= difficultyConfig.allyDownAtMs
      ) {
        autoAllyDownTriggeredRef.current = true;
        triggerAllyDown();
      }

      setNotes((current) => {
        let missed = 0;
        const next = current.map((note) => {
          if (
            note.state === "pending" &&
            elapsed - note.time > difficultyConfig.timingWindows.earlyLate
          ) {
            missed += 1;
            return { ...note, state: "miss" as const, judgment: "miss" as const };
          }
          return note;
        });
        if (missed > 0) {
          applyMiss(missed > 1 ? "The horde surges through the broken rhythm." : "A note falls into ash.", missed);
        }
        return missed > 0 ? next : current;
      });

      frame = window.requestAnimationFrame(loop);
    }

    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [applyMiss, difficultyConfig.allyDownAtMs, difficultyConfig.timingWindows.earlyLate, isPaused, status, triggerAllyDown]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;
      if (event.code === "Enter" && statusRef.current === "tutorial") {
        start();
        return;
      }
      if (event.code === "Enter" && !isActiveState(statusRef.current)) {
        startTutorial();
        return;
      }

      if (IS_DEVELOPMENT) {
        if (event.code === "KeyR") {
          event.preventDefault();
          triggerAllyDown();
          return;
        }
        if (event.code === "KeyP") {
          event.preventDefault();
          togglePause();
          return;
        }
        if (event.code === "KeyM") {
          event.preventDefault();
          applyMiss("Debug miss.");
          return;
        }
        if (event.code === "KeyH") {
          event.preventDefault();
          simulatePerfectHit();
          return;
        }
      }

      const laneIndex = penitentLanes.findIndex((lane) => lane.codes.includes(event.code));
      if (laneIndex >= 0) {
        event.preventDefault();
        hitLane(laneIndex);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [applyMiss, hitLane, simulatePerfectHit, start, startTutorial, togglePause, triggerAllyDown]);

  useEffect(() => {
    function onVisibilityChange() {
      if (!document.hidden || !isActiveState(statusRef.current) || pausedRef.current) return;
      pausedRef.current = true;
      pauseStartedRef.current = performance.now();
      setIsPaused(true);
      setMessage("The page waits in the margin.");
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!isActiveState(status)) return;
    if (playerHealth <= 0) {
      setStatus("defeat");
      setJudgmentText("DEFEAT");
      setMessage("The horde overruns the page.");
    } else if (enemyHealth <= 0) {
      setStatus("victory");
      setJudgmentText("VICTORY");
      setMessage("The demon horde is annotated out of existence.");
    } else if (time >= beatmap.durationMs) {
      setStatus("victory");
      setJudgmentText("VICTORY");
      setMessage("The final amen seals the march.");
    }
  }, [beatmap.durationMs, enemyHealth, playerHealth, status, time]);

  return (
    <main
      className={[
        "rhythm-shell",
        "rhythm-crusade-shell",
        "rhythm-crusade-shell--asset",
        `is-difficulty-${difficulty}`,
        `is-song-${song.hordeTheme}`,
        tutorialActive ? "is-tutorial" : "",
        resurrectionActive ? "is-resurrection" : "",
        isPaused ? "is-paused" : "",
        impactKind ? `is-impact-${impactKind}` : "",
        screenShake ? "is-shaking" : "",
      ].filter(Boolean).join(" ")}
    >
      <Link href={"/penitent" as Route} className="penitent-return rhythm-return rhythm-crusade-return">
        Back to manuscript
      </Link>

      <section className="rhythm-crusade-stage" aria-label="Penitent 2 Rhythm Crusade battlefield">
        <BattleHud resurrectionActive={resurrectionActive} />
        <AssetBattlefield
          active={gameActive}
          combo={combo}
          enemyEnergy={enemyEnergy}
          heartFrame={heartFrame}
          hordeState={hordeVisualState}
          resurrectionActive={resurrectionActive}
        />
        <SacredHeartAsset frame={heartFrame} pulse={heartPulse} resurrectionActive={resurrectionActive} />
        {resurrectionActive ? <div className="rhythm-fallen-ally" aria-hidden="true"><span /><b>+ DOWN +</b></div> : null}

        <NoteHighway
          beatmap={beatmap}
          modeLabel={modeLabel}
          notes={visibleNotes}
          time={time}
          laneFlash={laneFlash}
          hitEffects={hitEffects}
          tutorialActive={tutorialActive}
          tutorialTargetLane={tutorialTargetLane}
          onLaneHit={hitLane}
        />

        {tutorialActive ? (
          <TutorialGate
            hits={tutorialHits}
            prompt={tutorialPrompt}
            targetLane={tutorialTargetLane}
            onSkip={start}
          />
        ) : null}

        {resurrectionActive ? (
          <ResurrectionPanel status={status} progress={reviveProgress} />
        ) : null}

        {reviveCompleteNotice ? (
          <div className="rhythm-revive-complete" aria-live="polite">ALLY RESURRECTED</div>
        ) : null}

        <div className="rhythm-crusade-verdict" aria-live="polite">
          <span>{judgmentText}</span>
          <strong>{combo}</strong>
          <small>{status === "resurrection" ? "REVIVE COMBO" : "COMBO"}</small>
        </div>

        <div className="rhythm-crusade-bottom">
          <HealthEnergyPanel
            side="p1"
            title={resurrectionActive ? "Ally Status" : "P1 Ally"}
            status={resurrectionActive ? "Down" : "Keys Crusader"}
            health={playerHealth}
            energy={playerEnergy}
          />

          <div className="rhythm-crusade-command">
            <AbilityBar disabled={!laneInputEnabled || isPaused} onLaneHit={hitLane} />
            <div className="rhythm-crusade-progress" aria-label="Song progress">
              <img src={penitentAssetPaths.hud.songProgress} alt="" aria-hidden="true" />
              <b>+ {beatmap.title} +</b>
              <span>
                <i style={{ width: `${progressPercent}%` }} />
              </span>
              <small>{formatTime(time)} / {formatTime(beatmap.durationMs)}</small>
            </div>
          </div>

          <HealthEnergyPanel
            side="horde"
            title="Demon Horde"
            status={hordeStateLabel(hordeVisualState)}
            health={enemyHealth}
            energy={enemyEnergy}
            healthLabel="Horde"
            energyLabel="Pressure"
          />
        </div>

        <div className="rhythm-crusade-score">
          <span>Score {Math.round(score).toLocaleString()}</span>
          <span>Best {bestCombo}</span>
          <span>{isPaused ? "Paused" : status.toUpperCase()}</span>
          <span>{DIFFICULTY_CONFIG[difficulty].label}</span>
        </div>

        <p className="rhythm-crusade-message">{message}</p>

        {IS_DEVELOPMENT ? (
          <div className="rhythm-crusade-debug">
            DEV R resurrect P pause M miss H perfect
          </div>
        ) : null}

        {((!isActiveState(status) && !tutorialActive) || isPaused) ? (
          <SetupOverlay
            beatmap={beatmap}
            difficulty={difficulty}
            isPaused={isPaused}
            runSeed={runSeed}
            songId={songId}
            status={status}
            onDifficultyChange={setDifficulty}
            onRerollSeed={rerollSeed}
            onResume={togglePause}
            onSongChange={setSongId}
            onSkipTutorial={start}
            onStart={startTutorial}
          />
        ) : null}
      </section>
    </main>
  );
}

export function RhythmCombat() {
  return <RhythmCrusadeGame />;
}

function BattleHud({ resurrectionActive }: { resurrectionActive: boolean }) {
  return (
    <div className="rhythm-battle-hud" aria-label="Battle status">
      <div className="rhythm-battle-hud__side rhythm-battle-hud__side--player">
        <strong>{resurrectionActive ? "ALLY FALLEN" : "P1"}</strong>
        <span>{resurrectionActive ? "ALLY STATUS: DOWN" : "KEYS CRUSADER"}</span>
        <i aria-hidden="true" />
      </div>
      <div className="rhythm-battle-hud__side rhythm-battle-hud__side--enemy">
        <strong>{resurrectionActive ? "YOU ACTIVE" : "P2"}</strong>
        <span>{resurrectionActive ? "GUITAR CRUSADER" : "ALLY CRUSADER"}</span>
        <i aria-hidden="true" />
      </div>
    </div>
  );
}

function AssetBattlefield({
  active,
  combo,
  enemyEnergy,
  heartFrame,
  hordeState,
  resurrectionActive,
}: {
  active: boolean;
  combo: number;
  enemyEnergy: number;
  heartFrame: number;
  hordeState: HordeVisualState;
  resurrectionActive: boolean;
}) {
  const pressure = clamp(enemyEnergy, 0, 100);
  return (
    <div className={`rhythm-asset-scene ${active ? "is-playing" : ""} ${resurrectionActive ? "is-resurrection" : ""}`} aria-hidden="true">
      <img className="rhythm-asset rhythm-asset-cloud rhythm-asset-cloud--wide" src={penitentAssetPaths.scene.cloudWide} alt="" />
      <img className="rhythm-asset rhythm-asset-cloud rhythm-asset-cloud--small" src={penitentAssetPaths.scene.cloudSmall} alt="" />
      <img className="rhythm-asset rhythm-asset-cloud rhythm-asset-cloud--right" src={penitentAssetPaths.scene.cloudRight} alt="" />
      <img className="rhythm-asset rhythm-asset-volcano" src={penitentAssetPaths.scene.volcano} alt="" />
      <img className="rhythm-asset rhythm-asset-mountain rhythm-asset-mountain--left" src={penitentAssetPaths.scene.mountainLeft} alt="" />
      <img className="rhythm-asset rhythm-asset-mountain rhythm-asset-mountain--right" src={penitentAssetPaths.scene.mountainRight} alt="" />
      <HordeLayer combo={combo} pressure={pressure} state={hordeState} />
      {dragonActors.map((actor) => (
        <img
          key={actor.id}
          className={`rhythm-asset rhythm-asset-dragon rhythm-asset-dragon--${actor.className}`}
          src={actor.src}
          alt=""
          style={{
            "--actor-x": `${actor.x}%`,
            "--actor-y": `${actor.y}%`,
            "--actor-scale": actor.scale,
            "--actor-delay": `${actor.delay}s`,
          } as CSSProperties}
        />
      ))}
      <Performer side="left" active={active && !resurrectionActive} fallen={resurrectionActive} />
      <Performer side="right" active={active} fallen={false} />
      <img className="rhythm-asset rhythm-asset-lightning rhythm-asset-lightning--left" src={penitentAssetPaths.scene.lightningBolts} alt="" />
      <img className="rhythm-asset rhythm-asset-lightning rhythm-asset-lightning--right" src={penitentAssetPaths.scene.lightningBolts} alt="" />
      <img className="rhythm-asset rhythm-asset-fireballs rhythm-asset-fireballs--one" src={penitentAssetPaths.scene.fireballs} alt="" />
      <img className="rhythm-asset rhythm-asset-fireballs rhythm-asset-fireballs--two" src={penitentAssetPaths.scene.fireballs} alt="" />
      <span className="rhythm-asset-heart-aura" data-frame={heartFrame} />
    </div>
  );
}

function HordeLayer({ combo, pressure, state }: { combo: number; pressure: number; state: HordeVisualState }) {
  const comboTier = clamp(Math.floor(combo / 8), 0, 5);
  return (
    <div
      className={`rhythm-horde-layer rhythm-horde-layer--${state} ${hordePressureClass(pressure)}`}
      style={{
        "--horde-pressure": pressure,
        "--horde-advance": `${pressure * -0.12}%`,
        "--combo-tier": comboTier,
      } as CSSProperties}
    >
      <img className="rhythm-asset rhythm-asset-battlefield" src={penitentAssetPaths.scene.battlefield} alt="" />
      <span className="rhythm-horde-dust rhythm-horde-dust--rear" />
      <span className="rhythm-horde-dust rhythm-horde-dust--front" />
      <span className="rhythm-horde-blast rhythm-horde-blast--left" />
      <span className="rhythm-horde-blast rhythm-horde-blast--right" />
      <span className="rhythm-horde-lightning rhythm-horde-lightning--left" />
      <span className="rhythm-horde-lightning rhythm-horde-lightning--right" />
      {hordeActors.map((actor) => (
        <img
          key={actor.id}
          className={[
            "rhythm-asset",
            "rhythm-horde-demon",
            `rhythm-horde-demon--${actor.className}`,
            `rhythm-horde-demon--${actor.row}`,
            actor.mirror ? "is-mirrored" : "",
          ].filter(Boolean).join(" ")}
          src={actor.src}
          alt=""
          style={{
            "--actor-x": `${actor.x}%`,
            "--actor-y": `${actor.y}%`,
            "--actor-scale": actor.scale,
            "--actor-delay": `${actor.delay}s`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}

function Performer({ side, active, fallen }: { side: "left" | "right"; active: boolean; fallen: boolean }) {
  const isLeft = side === "left";
  return (
    <div className={`rhythm-performer rhythm-performer--${side} ${active ? "is-playing" : ""} ${fallen ? "is-fallen" : ""}`}>
      <img
        className="rhythm-performer__body rhythm-performer__body--combined"
        src={isLeft ? penitentAssetPaths.crusaders.keyboardClean : penitentAssetPaths.crusaders.guitarClean}
        alt=""
      />
    </div>
  );
}

function SacredHeartAsset({
  frame,
  pulse,
  resurrectionActive,
}: {
  frame: number;
  pulse: number;
  resurrectionActive: boolean;
}) {
  const style = {
    "--heart-scale": 1 + pulse * 0.13,
    "--heart-glow": 0.55 + pulse * 0.45,
  } as CSSProperties;
  return (
    <div className="rhythm-sacred-heart rhythm-sacred-heart--asset" style={style} aria-hidden="true">
      <img className="rhythm-sacred-heart__waveform" src={penitentAssetPaths.heart.large} alt="" />
      <img className="rhythm-sacred-heart__frame" src={penitentAssetPaths.heart.frames[frame]} alt="" />
      {resurrectionActive ? <span /> : null}
    </div>
  );
}

function NoteHighway({
  beatmap,
  modeLabel,
  notes,
  time,
  laneFlash,
  hitEffects,
  tutorialActive,
  tutorialTargetLane,
  onLaneHit,
}: {
  beatmap: PenitentBeatmap;
  modeLabel: string;
  notes: NoteState[];
  time: number;
  laneFlash: number | null;
  hitEffects: HitEffect[];
  tutorialActive: boolean;
  tutorialTargetLane: number;
  onLaneHit: (lane: number) => void;
}) {
  const tutorialLane = penitentLanes[tutorialTargetLane] ?? penitentLanes[0];
  return (
    <div className="rhythm-note-highway rhythm-note-highway--asset" aria-label="Rhythm note highway">
      <img src={penitentAssetPaths.hud.noteTrack} alt="" aria-hidden="true" />
      <div className="rhythm-note-highway__label">{modeLabel}</div>
      <div className="rhythm-note-highway__pulse" aria-hidden="true" />
      <div className="rhythm-note-highway__lanes">
        {penitentLanes.map((lane, index) => (
          <RhythmLane key={lane.id} lane={lane} index={index} active={laneFlash === index} onLaneHit={onLaneHit} />
        ))}
      </div>
      <div className="rhythm-note-highway__judgment" aria-hidden="true" />
      {tutorialActive ? (
        <span
          className={`rhythm-crusade-note rhythm-crusade-note--tutorial rhythm-crusade-note--${tutorialLane.side}`}
          style={{ "--note-y": `${laneRows[tutorialTargetLane] ?? 50}%` } as CSSProperties}
          aria-hidden="true"
        />
      ) : null}
      {notes.map((note) => (
        <Note key={note.id} beatmap={beatmap} note={note} time={time} />
      ))}
      {hitEffects.map((effect) => {
        const y = laneRows[effect.lane] ?? 50;
        return (
          <span
            key={effect.id}
            className={`rhythm-hit-effect rhythm-hit-effect--${effect.judgment}`}
            style={{ "--effect-y": `${y}%` } as CSSProperties}
          >
            {judgmentLabel(effect.judgment)}
          </span>
        );
      })}
    </div>
  );
}

function RhythmLane({
  lane,
  index,
  active,
  onLaneHit,
}: {
  lane: PenitentLane;
  index: number;
  active: boolean;
  onLaneHit: (lane: number) => void;
}) {
  const y = laneRows[index] ?? 50;
  const hit = useCallback(() => onLaneHit(index), [index, onLaneHit]);
  const hitTouch = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse") return;
    event.preventDefault();
    onLaneHit(index);
  }, [index, onLaneHit]);

  return (
    <button
      type="button"
      className={`rhythm-lane-track rhythm-lane-track--${lane.side} ${active ? "is-hit" : ""}`}
      style={{ "--lane-y": `${y}%` } as CSSProperties}
      onClick={hit}
      onPointerDown={hitTouch}
      aria-label={`${lane.ability} lane ${lane.key} or ${lane.numberKey}`}
    >
      <span>{lane.key}</span>
    </button>
  );
}

function Note({ beatmap, note, time }: { beatmap: PenitentBeatmap; note: NoteState; time: number }) {
  const lane = penitentLanes[note.lane];
  const position = notePosition(note, time, beatmap);
  return (
    <span
      className={`rhythm-crusade-note rhythm-crusade-note--${lane.side} rhythm-crusade-note--${note.phrase} ${note.chordId ? "is-chord" : ""}`}
      style={{ "--note-x": `${position.x}%`, "--note-y": `${position.y}%` } as CSSProperties}
      aria-hidden="true"
    />
  );
}

function HealthEnergyPanel({
  side,
  title,
  status,
  health,
  energy,
  healthLabel = "Health",
  energyLabel = "Energy",
}: {
  side: "p1" | "horde";
  title: string;
  status: string;
  health: number;
  energy: number;
  healthLabel?: string;
  energyLabel?: string;
}) {
  const isP1 = side === "p1";
  return (
    <aside className={`rhythm-stat-panel rhythm-stat-panel--${side}`}>
      <img className="rhythm-stat-panel__art" src={isP1 ? penitentAssetPaths.hud.p1Health : penitentAssetPaths.hud.p2Health} alt="" aria-hidden="true" />
      <img className="rhythm-stat-panel__seal-art" src={isP1 ? penitentAssetPaths.hud.p1Seal : penitentAssetPaths.demons.head} alt="" aria-hidden="true" />
      <div className="rhythm-stat-panel__copy">
        <span>{title}</span>
        <strong>{status}</strong>
        <Meter label={healthLabel} value={health} tone={isP1 ? "p1" : "horde"} />
        <Meter label={energyLabel} value={energy} tone={isP1 ? "p1-energy" : "horde-energy"} />
      </div>
    </aside>
  );
}

function Meter({ label, value, tone }: { label: string; value: number; tone: string }) {
  const segments = 16;
  const filled = Math.round(clamp(value, 0, 100) / 100 * segments);
  return (
    <div className={`rhythm-meter rhythm-meter--${tone}`} aria-label={`${label} ${Math.round(value)} percent`}>
      <div>
        <b>{label}</b>
        <small>{Math.round(value)}%</small>
      </div>
      <span>
        {Array.from({ length: segments }, (_, index) => (
          <i key={index} className={index < filled ? "is-filled" : ""} />
        ))}
      </span>
    </div>
  );
}

function AbilityBar({
  disabled,
  onLaneHit,
}: {
  disabled: boolean;
  onLaneHit: (lane: number) => void;
}) {
  return (
    <div className="rhythm-ability-bar" aria-label="Ability controls">
      {penitentLanes.slice(0, 3).map((lane, index) => (
        <AbilityCard key={lane.id} lane={lane} index={index} disabled={disabled} onLaneHit={onLaneHit} />
      ))}
      <div className="rhythm-ability-bar__gap" aria-hidden="true" />
      {penitentLanes.slice(3).map((lane, offset) => {
        const index = offset + 3;
        return <AbilityCard key={lane.id} lane={lane} index={index} disabled={disabled} onLaneHit={onLaneHit} />;
      })}
    </div>
  );
}

function AbilityCard({
  lane,
  index,
  disabled,
  onLaneHit,
}: {
  lane: PenitentLane;
  index: number;
  disabled: boolean;
  onLaneHit: (lane: number) => void;
}) {
  const hit = useCallback(() => onLaneHit(index), [index, onLaneHit]);
  const hitTouch = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse") return;
    event.preventDefault();
    onLaneHit(index);
  }, [index, onLaneHit]);

  return (
    <button
      type="button"
      className={`rhythm-ability-card rhythm-ability-card--asset rhythm-ability-card--${lane.side}`}
      aria-label={`${lane.ability} lane ${lane.key} or ${lane.numberKey}`}
      onClick={hit}
      onPointerDown={hitTouch}
      disabled={disabled}
    >
      <img src={penitentAssetPaths.abilities[lane.id]} alt="" aria-hidden="true" />
      <strong>{lane.numberKey}</strong>
      <span>{lane.ability}</span>
      <small>{lane.key}</small>
    </button>
  );
}

function TutorialGate({
  hits,
  prompt,
  targetLane,
  onSkip,
}: {
  hits: number;
  prompt: string;
  targetLane: number;
  onSkip: () => void;
}) {
  const target = penitentLanes[targetLane] ?? penitentLanes[0];
  return (
    <aside className="rhythm-tutorial-gate" aria-live="polite">
      <span>How to Play</span>
      <strong>Hit notes on the sacred center line</strong>
      <p>{prompt}</p>
      <div className="rhythm-tutorial-keys" aria-label="Controls">
        <b>Blue</b>
        <i>A</i>
        <i>S</i>
        <i>D</i>
        <b>Orange</b>
        <i>J</i>
        <i>K</i>
        <i>L</i>
      </div>
      <div className="rhythm-tutorial-target">
        <small>Now strike</small>
        <b>{target.key}</b>
        <span>or {target.numberKey}</span>
      </div>
      <div className="rhythm-tutorial-progress" aria-label={`${hits} of ${tutorialTargets.length} practice hits complete`}>
        {tutorialTargets.map((_, index) => (
          <i key={index} className={index < hits ? "is-complete" : ""} />
        ))}
      </div>
      <button type="button" onClick={onSkip}>Skip Rite</button>
    </aside>
  );
}

function SetupOverlay({
  beatmap,
  difficulty,
  isPaused,
  runSeed,
  songId,
  status,
  onDifficultyChange,
  onRerollSeed,
  onResume,
  onSongChange,
  onSkipTutorial,
  onStart,
}: {
  beatmap: PenitentBeatmap;
  difficulty: GameDifficulty;
  isPaused: boolean;
  runSeed: string;
  songId: string;
  status: GameState;
  onDifficultyChange: (difficulty: GameDifficulty) => void;
  onRerollSeed: () => void;
  onResume: () => void;
  onSongChange: (songId: string) => void;
  onSkipTutorial: () => void;
  onStart: () => void;
}) {
  const settingsLocked = isPaused;
  const selectedSong = getPenitentSong(songId);
  const selectedConfig = DIFFICULTY_CONFIG[difficulty];
  const heroText = isPaused
    ? "The page holds."
    : status === "ready"
      ? "The horde waits in the margin."
      : status === "victory"
        ? "Victory inscribed."
        : "The horde overruns the page.";

  return (
    <div className={`rhythm-crusade-state rhythm-crusade-state--setup is-${status} ${isPaused ? "is-pause" : ""}`}>
      <div className="rhythm-setup-header">
        <span>Penitent 2</span>
        <p>{heroText}</p>
        <small>{isPaused ? "Resume the rite when ready." : "Choose the canticle, difficulty, and seed."}</small>
      </div>

      {!isPaused ? (
        <div className="rhythm-setup-quickstart" aria-label="How to play">
          <b>Play the center line</b>
          <span>Strike <i>A S D</i> and <i>J K L</i> as diamonds cross the sacred gold line.</span>
          <small>Touch the six cards or use 1-6 as alternates.</small>
        </div>
      ) : null}

      <div className="rhythm-setup-section rhythm-setup-section--songs">
        <span className="rhythm-setup-kicker">Song</span>
        <div className="rhythm-setup-row" aria-label="Song selection">
          {PENITENT_SONGS.map((song) => (
            <button
              key={song.id}
              type="button"
              className={song.id === songId ? "is-selected" : ""}
              aria-pressed={song.id === songId}
              disabled={settingsLocked}
              onClick={() => onSongChange(song.id)}
            >
              <strong>{song.title}</strong>
              <small>{song.bpm} BPM</small>
            </button>
          ))}
        </div>
      </div>

      <div className="rhythm-setup-section rhythm-setup-section--difficulty">
        <span className="rhythm-setup-kicker">Difficulty</span>
        <div className="rhythm-setup-row" aria-label="Difficulty selection">
          {difficultyOrder.map((option) => (
            <button
              key={option}
              type="button"
              className={option === difficulty ? "is-selected" : ""}
              aria-pressed={option === difficulty}
              disabled={settingsLocked}
              onClick={() => onDifficultyChange(option)}
            >
              <strong>{DIFFICULTY_CONFIG[option].label}</strong>
              <small>{difficultySummary(option)}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="rhythm-setup-ledger" aria-label="Current run details">
        <span><b>{beatmap.notes.length}</b> notes</span>
        <span><b>{selectedSong.bpm}</b> BPM</span>
        <span><b>{formatTime(selectedSong.durationMs)}</b> duration</span>
        <span><b>{selectedConfig.timingWindows.perfect}ms</b> perfect</span>
        <span><b>{densityLabel(selectedConfig.density)}</b> density</span>
      </div>

      <div className="rhythm-setup-seed">
        <span>Seed <b>{runSeed}</b></span>
        <button type="button" disabled={settingsLocked} onClick={onRerollSeed}>Reroll</button>
      </div>

      <button className="rhythm-setup-start" type="button" onClick={isPaused ? onResume : onStart}>
        {isPaused ? "Resume" : status === "ready" ? "Learn Controls" : "Play again"}
      </button>
      {!isPaused ? (
        <button className="rhythm-setup-skip" type="button" onClick={onSkipTutorial}>
          Skip Tutorial / Begin Battle
        </button>
      ) : null}
      <small>Enter opens the tutorial. The battle begins after three practice hits.</small>
    </div>
  );
}

function ResurrectionPanel({ status, progress }: { status: GameState; progress: number }) {
  return (
    <div className="rhythm-resurrection-panel" aria-live="polite">
      <span>{status === "allyDown" ? "ALLY FALLEN" : "RESURRECTION"}</span>
      <strong>Revive Progress</strong>
      <div>
        <i style={{ width: `${clamp(progress, 0, 100)}%` }} />
      </div>
      <p>Keep hitting notes to resurrect your ally.</p>
    </div>
  );
}
