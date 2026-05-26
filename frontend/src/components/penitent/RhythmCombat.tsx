"use client";

import Link from "next/link";
import type { Route } from "next";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  RHYTHM_CRUSADE_CONFIG,
  firstCanticle,
  penitentLanes,
  type PenitentLane,
  type PenitentNote,
} from "@/lib/penitent/beatmaps";

type GameState = "ready" | "playing" | "allyDown" | "resurrection" | "victory" | "defeat";
type Judgment = "perfect" | "good" | "early" | "late" | "miss";
type NoteState = PenitentNote & { state: "pending" | "hit" | "miss"; judgment?: Judgment };
type HitEffect = { id: number; lane: number; judgment: Judgment };
type ImpactKind = "perfect" | "good" | "miss" | null;

const IS_DEVELOPMENT = process.env.NODE_ENV !== "production";
const ACTIVE_STATES: GameState[] = ["playing", "allyDown", "resurrection"];
const laneRows = [17, 30, 43, 57, 70, 83];

function isActiveState(state: GameState) {
  return ACTIVE_STATES.includes(state);
}

function freshNotes(): NoteState[] {
  return firstCanticle.notes.map((note) => ({ ...note, state: "pending" }));
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

function judgeDelta(delta: number): Exclude<Judgment, "miss"> | null {
  const distance = Math.abs(delta);
  const windows = RHYTHM_CRUSADE_CONFIG.timingWindows;
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

function scoreFor(judgment: Exclude<Judgment, "miss">) {
  if (judgment === "perfect") return RHYTHM_CRUSADE_CONFIG.scoring.perfect;
  if (judgment === "good") return RHYTHM_CRUSADE_CONFIG.scoring.good;
  return RHYTHM_CRUSADE_CONFIG.scoring.earlyLate;
}

function damageFor(judgment: Exclude<Judgment, "miss">) {
  if (judgment === "perfect") return RHYTHM_CRUSADE_CONFIG.health.perfectDamage;
  if (judgment === "good") return RHYTHM_CRUSADE_CONFIG.health.goodDamage;
  return RHYTHM_CRUSADE_CONFIG.health.earlyLateDamage;
}

function energyFor(judgment: Exclude<Judgment, "miss">) {
  if (judgment === "perfect") return RHYTHM_CRUSADE_CONFIG.energy.perfectGain;
  if (judgment === "good") return RHYTHM_CRUSADE_CONFIG.energy.goodGain;
  return RHYTHM_CRUSADE_CONFIG.energy.earlyLateGain;
}

function reviveFor(judgment: Exclude<Judgment, "miss">) {
  if (judgment === "perfect") return RHYTHM_CRUSADE_CONFIG.revive.perfectGain;
  if (judgment === "good") return RHYTHM_CRUSADE_CONFIG.revive.goodGain;
  return RHYTHM_CRUSADE_CONFIG.revive.earlyLateGain;
}

function notePosition(note: PenitentNote, currentTime: number) {
  const lane = penitentLanes[note.lane];
  const remaining = note.time - currentTime;
  const progress = clamp(1 - remaining / firstCanticle.travelMs, 0, 1.15);
  const x = lane.side === "player" ? 8 + progress * 42 : 92 - progress * 42;
  return { x, y: laneRows[note.lane] ?? 50 };
}

export function RhythmCrusadeGame() {
  const [status, setStatus] = useState<GameState>("ready");
  const [isPaused, setIsPaused] = useState(false);
  const [notes, setNotes] = useState<NoteState[]>(freshNotes);
  const [time, setTime] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [bestCombo, setBestCombo] = useState<number>(0);
  const [playerHealth, setPlayerHealth] = useState<number>(RHYTHM_CRUSADE_CONFIG.health.playerMax);
  const [enemyHealth, setEnemyHealth] = useState<number>(RHYTHM_CRUSADE_CONFIG.health.enemyMax);
  const [playerEnergy, setPlayerEnergy] = useState<number>(0);
  const [enemyEnergy, setEnemyEnergy] = useState<number>(72);
  const [reviveProgress, setReviveProgress] = useState<number>(0);
  const [message, setMessage] = useState("Strike A S D and J K L as the notes cross the sacred line.");
  const [judgmentText, setJudgmentText] = useState("READY");
  const [laneFlash, setLaneFlash] = useState<number | null>(null);
  const [hitEffects, setHitEffects] = useState<HitEffect[]>([]);
  const [impactKind, setImpactKind] = useState<ImpactKind>(null);
  const [screenShake, setScreenShake] = useState(false);
  const [reviveCompleteNotice, setReviveCompleteNotice] = useState(false);

  const startTimeRef = useRef(0);
  const pauseStartedRef = useRef(0);
  const statusRef = useRef<GameState>("ready");
  const pausedRef = useRef(false);
  const comboRef = useRef(0);
  const hitEffectIdRef = useRef(0);
  const autoAllyDownTriggeredRef = useRef(false);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    comboRef.current = combo;
  }, [combo]);

  const visibleNotes = useMemo(() => {
    const missWindow = RHYTHM_CRUSADE_CONFIG.timingWindows.earlyLate;
    if (!isActiveState(status)) return [];
    return notes.filter((note) => {
      const untilHit = note.time - time;
      return note.state === "pending" && untilHit < firstCanticle.travelMs && untilHit > -missWindow;
    });
  }, [notes, status, time]);

  const progressPercent = clamp((time / firstCanticle.durationMs) * 100, 0, 100);
  const resurrectionActive = status === "allyDown" || status === "resurrection";
  const activeForInput = status === "playing" || status === "resurrection";
  const modeLabel = resurrectionActive ? "RESURRECTION" : firstCanticle.encounter;
  const beatMs = 60000 / firstCanticle.bpm;
  const beatPhase = (time % beatMs) / beatMs;
  const downbeatPulse = Math.max(0, 1 - beatPhase / 0.16);
  const afterbeatPulse = beatPhase > 0.23 && beatPhase < 0.4 ? Math.max(0, 1 - Math.abs(beatPhase - 0.3) / 0.08) * 0.62 : 0;
  const heartPulse = isActiveState(status) && !isPaused ? clamp(downbeatPulse + afterbeatPulse, 0, 1) : 0.22;

  const clearImpact = useCallback((kind: ImpactKind) => {
    window.setTimeout(() => {
      setImpactKind((current) => (current === kind ? null : current));
      setScreenShake(false);
    }, kind === "perfect" ? 220 : 160);
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
    setNotes(freshNotes());
    setTime(0);
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setPlayerHealth(RHYTHM_CRUSADE_CONFIG.health.playerMax);
    setEnemyHealth(RHYTHM_CRUSADE_CONFIG.health.enemyMax);
    setPlayerEnergy(0);
    setEnemyEnergy(72);
    setReviveProgress(0);
    setMessage("The infernal march begins.");
    setJudgmentText("PLAY");
    setIsPaused(false);
    setStatus("playing");
  }, []);

  const triggerAllyDown = useCallback(() => {
    if (statusRef.current !== "playing") return;
    setStatus("allyDown");
    setReviveProgress(0);
    setJudgmentText("ALLY FALLEN");
    setMessage("Your ally falls. Keep the rhythm alive.");
    triggerImpact("miss");
  }, [triggerImpact]);

  const applyMiss = useCallback((reason = "MISS", missCount = 1) => {
    const state = statusRef.current;
    if (!isActiveState(state)) return;
    const healthLoss =
      state === "allyDown"
        ? 0
        : state === "resurrection"
          ? Math.ceil(missCount * 2)
          : RHYTHM_CRUSADE_CONFIG.health.missDamage * missCount;
    setJudgmentText("MISS");
    setMessage(reason);
    setCombo(0);
    setPlayerHealth((current) => Math.max(0, current - healthLoss));
    setPlayerEnergy((current) => Math.max(0, current - RHYTHM_CRUSADE_CONFIG.energy.missLoss * missCount));
    setEnemyEnergy((current) => Math.min(RHYTHM_CRUSADE_CONFIG.energy.max, current + 3 * missCount));
    if (state === "resurrection") {
      setReviveProgress((current) => Math.max(0, current - RHYTHM_CRUSADE_CONFIG.revive.missLoss * missCount));
    }
    triggerImpact("miss");
  }, [triggerImpact]);

  const applySuccessfulHit = useCallback((judgment: Exclude<Judgment, "miss">, lane: number) => {
    const comboBeforeHit = comboRef.current;
    setScore((current) => current + scoreFor(judgment) + comboBeforeHit * RHYTHM_CRUSADE_CONFIG.scoring.comboBonus);
    setCombo((current) => {
      const next = current + 1;
      setBestCombo((best) => Math.max(best, next));
      return next;
    });
    setEnemyHealth((current) => Math.max(0, current - damageFor(judgment)));
    setPlayerEnergy((current) => Math.min(RHYTHM_CRUSADE_CONFIG.energy.max, current + energyFor(judgment)));
    setEnemyEnergy((current) => Math.max(0, current - (judgment === "perfect" ? 4 : 2)));
    if (statusRef.current === "resurrection") {
      setReviveProgress((current) => Math.min(100, current + reviveFor(judgment)));
    }
    setJudgmentText(judgmentLabel(judgment));
    setMessage(
      judgment === "perfect"
        ? "Sacred lightning tears the margin."
        : judgment === "good"
          ? "The hymn lands."
          : "The note survives by a thread.",
    );
    flashLane(lane);
    addHitEffect(lane, judgment);
    triggerImpact(judgment === "perfect" ? "perfect" : "good");
  }, [addHitEffect, flashLane, triggerImpact]);

  const hitLane = useCallback((lane: number) => {
    if (!activeForInput || isPaused) return;
    const target = notes
      .filter((note) => note.state === "pending" && note.lane === lane)
      .sort((a, b) => Math.abs(a.time - time) - Math.abs(b.time - time))[0];
    const judgment = target ? judgeDelta(target.time - time) : null;

    flashLane(lane);
    if (!target || !judgment) {
      applyMiss("A false chord stains the page.");
      return;
    }

    setNotes((current) =>
      current.map((note) =>
        note.id === target.id && note.state === "pending" ? { ...note, state: "hit", judgment } : note,
      ),
    );
    applySuccessfulHit(judgment, lane);
  }, [activeForInput, applyMiss, applySuccessfulHit, flashLane, isPaused, notes, time]);

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

    // The rhythm clock is derived from one start timestamp. Notes are judged against
    // their absolute beatmap time so later tuning can change BPM, travel, or windows
    // without rewriting the input path.
    function loop(now: number) {
      const elapsed = now - startTimeRef.current;
      setTime(elapsed);

      if (
        statusRef.current === "playing" &&
        !autoAllyDownTriggeredRef.current &&
        elapsed >= RHYTHM_CRUSADE_CONFIG.allyDownAtMs
      ) {
        autoAllyDownTriggeredRef.current = true;
        triggerAllyDown();
      }

      setNotes((current) => {
        let missed = 0;
        const next = current.map((note) => {
          if (
            note.state === "pending" &&
            elapsed - note.time > RHYTHM_CRUSADE_CONFIG.timingWindows.earlyLate
          ) {
            missed += 1;
            return { ...note, state: "miss" as const, judgment: "miss" as const };
          }
          return note;
        });
        if (missed > 0) {
          applyMiss(missed > 1 ? "The choir fractures." : "A note falls into ash.", missed);
        }
        return missed > 0 ? next : current;
      });

      frame = window.requestAnimationFrame(loop);
    }

    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [applyMiss, isPaused, status, triggerAllyDown]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;
      if (event.code === "Enter" && !isActiveState(statusRef.current)) {
        start();
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
          applySuccessfulHit("perfect", 0);
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
  }, [applyMiss, applySuccessfulHit, hitLane, start, togglePause, triggerAllyDown]);

  useEffect(() => {
    if (!isActiveState(status)) return;
    if (playerHealth <= 0) {
      setStatus("defeat");
      setJudgmentText("DEFEAT");
      setMessage("The manuscript closes over your hands.");
    } else if (enemyHealth <= 0) {
      setStatus("victory");
      setJudgmentText("VICTORY");
      setMessage("The demon is annotated out of existence.");
    } else if (time >= firstCanticle.durationMs) {
      setStatus("victory");
      setJudgmentText("VICTORY");
      setMessage("The final amen seals the march.");
    }
  }, [enemyHealth, playerHealth, status, time]);

  return (
    <main
      className={[
        "rhythm-shell",
        "rhythm-crusade-shell",
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
        <BattlefieldFigures resurrectionActive={resurrectionActive} />
        <SacredHeart resurrectionActive={resurrectionActive} pulse={heartPulse} />
        {resurrectionActive ? <div className="rhythm-fallen-ally" aria-hidden="true"><span /><b>+ DOWN +</b></div> : null}

        <NoteHighway
          modeLabel={modeLabel}
          notes={visibleNotes}
          time={time}
          laneFlash={laneFlash}
          hitEffects={hitEffects}
          onLaneHit={hitLane}
        />

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
            side="player"
            title={resurrectionActive ? "Ally Status" : "Player"}
            status={resurrectionActive ? "Down" : "Crusader"}
            health={playerHealth}
            energy={playerEnergy}
          />

          <div className="rhythm-crusade-command">
            <AbilityBar disabled={!activeForInput || isPaused} onLaneHit={hitLane} />
            <div className="rhythm-crusade-progress" aria-label="Song progress">
              <b>+ {firstCanticle.encounter} +</b>
              <span>
                <i style={{ width: `${progressPercent}%` }} />
              </span>
              <small>{formatTime(time)} / {formatTime(firstCanticle.durationMs)}</small>
            </div>
          </div>

          <HealthEnergyPanel
            side="enemy"
            title={resurrectionActive ? "You Active" : "Enemy"}
            status="Crusader"
            health={enemyHealth}
            energy={enemyEnergy}
          />
        </div>

        <div className="rhythm-crusade-score">
          <span>Score {Math.round(score).toLocaleString()}</span>
          <span>Best {bestCombo}</span>
          <span>{isPaused ? "Paused" : status.toUpperCase()}</span>
        </div>

        <p className="rhythm-crusade-message">{message}</p>

        {IS_DEVELOPMENT ? (
          <div className="rhythm-crusade-debug">
            DEV R resurrect P pause M miss H perfect
          </div>
        ) : null}

        {!isActiveState(status) ? (
          <div className="rhythm-crusade-state">
            <p>
              {status === "ready"
                ? "The demon waits in the margin."
                : status === "victory"
                  ? "Victory inscribed."
                  : "The page goes dark."}
            </p>
            <button type="button" onClick={start}>
              {status === "ready" ? "Begin Rhythm Crusade" : "Play again"}
            </button>
            <small>Enter also begins the rite.</small>
          </div>
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
        <strong>{resurrectionActive ? "ALLY FALLEN" : "PLAYER"}</strong>
        <span>{resurrectionActive ? "ALLY STATUS: DOWN" : "CRUSADER"}</span>
        <i aria-hidden="true" />
      </div>
      <div className="rhythm-battle-hud__side rhythm-battle-hud__side--enemy">
        <strong>{resurrectionActive ? "YOU ACTIVE" : "ENEMY"}</strong>
        <span>CRUSADER</span>
        <i aria-hidden="true" />
      </div>
    </div>
  );
}

function BattlefieldFigures({ resurrectionActive }: { resurrectionActive: boolean }) {
  return (
    <div className="rhythm-battlefield-figures" aria-hidden="true">
      <div className="rhythm-battlefield-crowd" />
      <div className="rhythm-mountain rhythm-mountain--left">
        <div className="rhythm-mountain__slope" />
        <CrusaderFigure side="left" fallen={resurrectionActive} />
      </div>
      <div className="rhythm-mountain rhythm-mountain--right">
        <div className="rhythm-mountain__slope" />
        <CrusaderFigure side="right" fallen={false} />
      </div>
    </div>
  );
}

function CrusaderFigure({ side, fallen }: { side: "left" | "right"; fallen: boolean }) {
  return (
    <svg className={`rhythm-crusader rhythm-crusader--${side} ${fallen ? "is-fallen" : ""}`} viewBox="0 0 170 220">
      <path className="crusader-halo" d="M48 22c21-12 58-10 76 3" />
      <path className="crusader-cloak" d="M83 34c36 0 55 31 50 76l22 92H22l21-91C38 65 52 34 83 34Z" />
      <path className="crusader-hood" d="M83 15c22 0 40 17 40 42 0 28-15 48-40 48S43 85 43 57c0-25 18-42 40-42Z" />
      <path className="crusader-visor" d="M59 53c17-7 34-8 51-2M59 67c17-5 34-5 51 0M63 81c14-2 28-2 42 1" />
      <path className="crusader-cross" d="M83 117v42M66 137h34" />
      {side === "left" ? (
        <>
          <path className="crusader-arm" d="M35 109c20 14 38 21 57 21M131 109c-20 14-38 21-57 21" />
          <path className="crusader-instrument" d="M28 136h110l-9 31H21l7-31Z" />
          <path className="crusader-keys" d="M38 146h78M45 146v16M58 146v16M71 146v16M84 146v16M97 146v16M110 146v16" />
        </>
      ) : (
        <>
          <path className="crusader-arm" d="M39 104c18 18 35 30 51 36M133 98c-14 20-28 35-43 44" />
          <path className="crusader-instrument" d="M92 78 122 164M102 154c-14 8-32 5-41-7-8-11-5-24 8-31 14-8 32-5 41 7 8 11 5 24-8 31Z" />
          <path className="crusader-keys" d="M86 118 126 96M92 129l38-20M101 139l34-18" />
        </>
      )}
    </svg>
  );
}

function SacredHeart({ resurrectionActive, pulse }: { resurrectionActive: boolean; pulse: number }) {
  const style = {
    "--heart-scale": 1 + pulse * 0.13,
    "--heart-glow": 0.55 + pulse * 0.45,
  } as CSSProperties;

  return (
    <div className="rhythm-sacred-heart" style={style} aria-hidden="true">
      <svg className="rhythm-heartbeat-wave" viewBox="0 0 720 100">
        <path d="M0 52h130l20-23 24 55 32-82 34 50h104l18-19 27 38 22-19h74l25-36 36 66 27-30h127" />
      </svg>
      <svg className="rhythm-heart-svg" viewBox="0 0 220 250" role="img">
        <path className="heart-rays" d="M110 4v34M110 210v36M36 126H2M218 126h-34M54 50 29 25M168 49l24-25M55 204l-25 25M166 203l25 25" />
        <path className="heart-vessels" d="M86 45C73 20 80 5 98 5c14 0 19 12 18 27 8-21 31-29 43-14 12 14 4 35-17 55M105 44c-2-22 6-37 20-38 16-1 23 16 13 42" />
        <path className="heart-body" d="M109 231C64 203 34 167 29 125c-5-42 18-77 53-75 15 1 28 10 36 25 9-16 24-26 42-24 36 4 54 41 44 82-10 41-45 73-95 98Z" />
        <path className="heart-lobe" d="M68 76c13-10 32-6 42 9M135 82c12-14 34-14 45 2" />
        <path className="heart-lines" d="M81 84c-15 27-15 57 1 91M128 74c20 27 27 63 16 103M55 135c31 12 69 10 114-6M87 185c23-22 47-34 78-37M106 99c6 24 6 50 1 76" />
      </svg>
      {resurrectionActive ? <span /> : null}
    </div>
  );
}

function NoteHighway({
  modeLabel,
  notes,
  time,
  laneFlash,
  hitEffects,
  onLaneHit,
}: {
  modeLabel: string;
  notes: NoteState[];
  time: number;
  laneFlash: number | null;
  hitEffects: HitEffect[];
  onLaneHit: (lane: number) => void;
}) {
  return (
    <div className="rhythm-note-highway" aria-label="Rhythm note highway">
      <div className="rhythm-note-highway__label">{modeLabel}</div>
      <div className="rhythm-note-highway__pulse" aria-hidden="true" />
      <div className="rhythm-note-highway__lanes">
        {penitentLanes.map((lane, index) => (
          <RhythmLane key={lane.id} lane={lane} index={index} active={laneFlash === index} onLaneHit={onLaneHit} />
        ))}
      </div>
      <div className="rhythm-note-highway__judgment" aria-hidden="true" />
      {notes.map((note) => (
        <Note key={note.id} note={note} time={time} />
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
  return (
    <button
      type="button"
      className={`rhythm-lane-track rhythm-lane-track--${lane.side} ${active ? "is-hit" : ""}`}
      style={{ "--lane-y": `${y}%` } as CSSProperties}
      onClick={() => onLaneHit(index)}
      aria-label={`${lane.ability} lane ${lane.key} or ${lane.numberKey}`}
    >
      <span>{lane.key}</span>
    </button>
  );
}

function Note({ note, time }: { note: NoteState; time: number }) {
  const lane = penitentLanes[note.lane];
  const position = notePosition(note, time);
  return (
    <span
      className={`rhythm-crusade-note rhythm-crusade-note--${lane.side} rhythm-crusade-note--${note.phrase}`}
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
}: {
  side: "player" | "enemy";
  title: string;
  status: string;
  health: number;
  energy: number;
}) {
  return (
    <aside className={`rhythm-stat-panel rhythm-stat-panel--${side}`}>
      <div className="rhythm-stat-panel__seal" aria-hidden="true" />
      <div className="rhythm-stat-panel__copy">
        <span>{title}</span>
        <strong>{status}</strong>
        <Meter label="Health" value={health} tone={side} />
        <Meter label="Energy" value={energy} tone={side === "player" ? "player-energy" : "enemy-energy"} />
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
  return (
    <button
      type="button"
      className={`rhythm-ability-card rhythm-ability-card--${lane.side}`}
      onClick={() => onLaneHit(index)}
      disabled={disabled}
    >
      <AbilityIcon id={lane.id} />
      <strong>{lane.numberKey}</strong>
      <span>{lane.ability}</span>
      <small>{lane.key}</small>
    </button>
  );
}

function AbilityIcon({ id }: { id: string }) {
  if (id === "lightning") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M35 3 12 35h18l-4 26 26-36H34L35 3Z" />
      </svg>
    );
  }
  if (id === "burst") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="m32 5 5 17 15-9-9 15 17 4-17 5 9 15-15-9-5 17-5-17-15 9 9-15-17-5 17-4-9-15 15 9 5-17Z" />
      </svg>
    );
  }
  if (id === "shield") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M32 5 10 14v17c0 14 9 24 22 29 13-5 22-15 22-29V14L32 5Zm0 9 12 5v12c0 8-4 14-12 18V14Z" />
      </svg>
    );
  }
  if (id === "flame") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M33 59c13-5 19-14 17-25-1-8-6-15-15-24 1 9-1 15-7 20 0-7-4-12-9-17 2 12-7 18-7 29 0 10 8 18 21 17Z" />
      </svg>
    );
  }
  if (id === "skull") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M32 5C19 5 10 14 10 27c0 9 4 16 12 20v10h20V47c8-4 12-11 12-20C54 14 45 5 32 5ZM22 31a6 6 0 1 1 0-12 6 6 0 0 1 0 12Zm20 0a6 6 0 1 1 0-12 6 6 0 0 1 0 12ZM27 43l5-8 5 8H27Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M47 4c-2 12-9 18-21 23C14 32 8 40 10 51c12 2 20-2 27-12 7-9 13-19 10-35Zm-28 44c0-7 4-11 12-15-3 8-6 13-12 15Z" />
    </svg>
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
