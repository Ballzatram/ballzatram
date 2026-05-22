"use client";

import Link from "next/link";
import type { Route } from "next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { firstCanticle, penitentLanes, type PenitentNote } from "@/lib/penitent/beatmaps";

type Judgment = "perfect" | "good" | "rough" | "miss" | "rite";
type NoteState = PenitentNote & { state: "pending" | "hit" | "miss"; judgment?: Judgment };
type GameStatus = "ready" | "playing" | "won" | "lost";

const PERFECT_WINDOW = 100;
const GOOD_WINDOW = 190;
const ROUGH_WINDOW = 320;
const MAX_HEALTH = 100;
const MAX_DEMON_HEALTH = 210;

function freshNotes(): NoteState[] {
  return firstCanticle.notes.map((note) => ({ ...note, state: "pending" }));
}

function judge(delta: number): Exclude<Judgment, "miss" | "rite"> | null {
  const distance = Math.abs(delta);
  if (distance <= PERFECT_WINDOW) return "perfect";
  if (distance <= GOOD_WINDOW) return "good";
  if (distance <= ROUGH_WINDOW) return "rough";
  return null;
}

function scoreFor(judgment: Judgment) {
  if (judgment === "perfect") return 1200;
  if (judgment === "good") return 750;
  if (judgment === "rough") return 360;
  if (judgment === "rite") return 1500;
  return 0;
}

function damageFor(judgment: Judgment) {
  if (judgment === "perfect") return 9;
  if (judgment === "good") return 6;
  if (judgment === "rough") return 3;
  if (judgment === "rite") return 18;
  return 0;
}

export function RhythmCombat() {
  const [status, setStatus] = useState<GameStatus>("ready");
  const [notes, setNotes] = useState<NoteState[]>(freshNotes);
  const [time, setTime] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [playerHealth, setPlayerHealth] = useState(MAX_HEALTH);
  const [demonHealth, setDemonHealth] = useState(MAX_DEMON_HEALTH);
  const [special, setSpecial] = useState(0);
  const [message, setMessage] = useState("Strike the illuminated keys when the notes cross the seal.");
  const [laneFlash, setLaneFlash] = useState<number | null>(null);
  const [ultimateFlash, setUltimateFlash] = useState(false);
  const startTimeRef = useRef(0);

  const finalNoteTime = firstCanticle.notes[firstCanticle.notes.length - 1]?.time ?? 0;
  const songEndsAt = finalNoteTime + 1400;

  const visibleNotes = useMemo(() => {
    return notes.filter((note) => {
      const untilHit = note.time - time;
      return note.state === "pending" && untilHit < firstCanticle.travelMs && untilHit > -ROUGH_WINDOW;
    });
  }, [notes, time]);

  const resolvedCount = notes.filter((note) => note.state !== "pending").length;
  const accuracy = resolvedCount
    ? Math.round((notes.filter((note) => note.state === "hit").length / resolvedCount) * 100)
    : 100;

  const start = useCallback(() => {
    startTimeRef.current = performance.now();
    setNotes(freshNotes());
    setTime(0);
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setPlayerHealth(MAX_HEALTH);
    setDemonHealth(MAX_DEMON_HEALTH);
    setSpecial(0);
    setMessage("The page begins to sing.");
    setStatus("playing");
  }, []);

  const flashLane = useCallback((lane: number) => {
    setLaneFlash(lane);
    window.setTimeout(() => setLaneFlash((current) => (current === lane ? null : current)), 140);
  }, []);

  const applyHit = useCallback((judgmentResult: Judgment) => {
    const gainedScore = scoreFor(judgmentResult);
    const damage = damageFor(judgmentResult);
    setScore((current) => current + gainedScore + combo * 12);
    setCombo((current) => {
      const next = current + 1;
      setBestCombo((best) => Math.max(best, next));
      return next;
    });
    setSpecial((current) => Math.min(100, current + (judgmentResult === "perfect" ? 12 : judgmentResult === "good" ? 8 : 5)));
    setDemonHealth((current) => Math.max(0, current - damage));
    setMessage(judgmentResult === "perfect" ? "Gold leaf strike." : judgmentResult === "good" ? "The hymn lands." : "Ink still cuts.");
  }, [combo]);

  const punishMiss = useCallback((reason: string) => {
    setPlayerHealth((current) => Math.max(0, current - 7));
    setCombo(0);
    setMessage(reason);
  }, []);

  const hitLane = useCallback((lane: number) => {
    if (status !== "playing") return;
    const target = notes
      .filter((note) => note.state === "pending" && note.lane === lane)
      .sort((a, b) => Math.abs(a.time - time) - Math.abs(b.time - time))[0];
    const landed = target ? judge(target.time - time) : null;

    flashLane(lane);
    if (!target || !landed) {
      punishMiss("A false chord stains the margin.");
      return;
    }

    setNotes((current) =>
      current.map((note) =>
        note.id === target.id && note.state === "pending" ? { ...note, state: "hit", judgment: landed } : note,
      ),
    );
    applyHit(landed);
  }, [applyHit, flashLane, notes, punishMiss, status, time]);

  const castUltimate = useCallback(() => {
    if (status !== "playing" || special < 100) return;
    setSpecial(0);
    setUltimateFlash(true);
    window.setTimeout(() => setUltimateFlash(false), 700);
    setScore((current) => current + 5200);
    setDemonHealth((current) => Math.max(0, current - 42));
    setMessage("CANTICLE BURST: the page burns white.");
    setNotes((current) =>
      current.map((note) => {
        if (note.state !== "pending") return note;
        return Math.abs(note.time - time) <= 520 ? { ...note, state: "hit", judgment: "rite" } : note;
      }),
    );
  }, [special, status, time]);

  useEffect(() => {
    if (status !== "playing") return;
    let frame = 0;

    function loop(now: number) {
      const elapsed = now - startTimeRef.current;
      setTime(elapsed);
      setNotes((current) => {
        let misses = 0;
        const next = current.map((note) => {
          if (note.state === "pending" && elapsed - note.time > ROUGH_WINDOW) {
            misses += 1;
            return { ...note, state: "miss" as const, judgment: "miss" as const };
          }
          return note;
        });
        if (misses > 0) {
          setPlayerHealth((health) => Math.max(0, health - misses * 6));
          setCombo(0);
          setMessage(misses > 1 ? "The choir fractures." : "A note falls into ash.");
        }
        return misses > 0 ? next : current;
      });
      frame = window.requestAnimationFrame(loop);
    }

    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [status]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;
      if (event.code === "Enter" && status !== "playing") {
        start();
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        castUltimate();
        return;
      }
      const laneIndex = penitentLanes.findIndex((lane) => lane.code === event.code);
      if (laneIndex >= 0) {
        event.preventDefault();
        hitLane(laneIndex);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [castUltimate, hitLane, start, status]);

  useEffect(() => {
    if (status !== "playing") return;
    if (playerHealth <= 0) {
      setStatus("lost");
      setMessage("The manuscript closes over your hands.");
    } else if (demonHealth <= 0) {
      setStatus("won");
      setMessage("The demon is annotated out of existence.");
    } else if (time > songEndsAt && notes.every((note) => note.state !== "pending")) {
      setStatus(demonHealth <= 0 ? "won" : "lost");
      setMessage(demonHealth <= 0 ? "The final amen seals the page." : "The demon survives the last measure.");
    }
  }, [demonHealth, notes, playerHealth, songEndsAt, status, time]);

  return (
    <main className={`rhythm-shell ${ultimateFlash ? "is-ultimate" : ""}`}>
      <Link href={"/penitent" as Route} className="penitent-return rhythm-return">
        Back to manuscript
      </Link>

      <section className="rhythm-header" aria-labelledby="rhythm-title">
        <p className="penitent-kicker">Playable scripture / rhythm combat</p>
        <h1 id="rhythm-title">{firstCanticle.title}</h1>
        <p>
          Music is ritual warfare. Use A, S, K, and L to strike the lanes. Space releases the major rite
          when the special meter fills.
        </p>
      </section>

      <section className="rhythm-combat" aria-label="Rhythm combat arena">
        <aside className="rhythm-portrait rhythm-portrait--player">
          <span>Crusader musician</span>
          <div className="rhythm-health">
            <i style={{ width: `${playerHealth}%` }} />
          </div>
          <strong>{playerHealth}</strong>
        </aside>

        <div className="rhythm-board">
          <div className="rhythm-board__top">
            <div>
              <span>Score</span>
              <strong>{score.toLocaleString()}</strong>
            </div>
            <div>
              <span>Combo</span>
              <strong>{combo}</strong>
            </div>
            <div>
              <span>Best</span>
              <strong>{bestCombo}</strong>
            </div>
            <div>
              <span>Accuracy</span>
              <strong>{accuracy}%</strong>
            </div>
          </div>

          <div className="rhythm-lanes">
            {penitentLanes.map((lane, laneIndex) => (
              <div key={lane.id} className={`rhythm-lane ${laneFlash === laneIndex ? "is-hit" : ""}`}>
                <span className="rhythm-lane__label">{lane.label}</span>
                {visibleNotes
                  .filter((note) => note.lane === laneIndex)
                  .map((note) => {
                    const untilHit = note.time - time;
                    const progress = 1 - untilHit / firstCanticle.travelMs;
                    const top = -8 + progress * 90;
                    return (
                      <span
                        key={note.id}
                        className={`rhythm-note rhythm-note--${note.phrase}`}
                        style={{ top: `${top}%` }}
                      />
                    );
                  })}
                <button type="button" className="rhythm-target" onClick={() => hitLane(laneIndex)}>
                  <b>{lane.key}</b>
                </button>
              </div>
            ))}
            <div className="rhythm-hit-line" aria-hidden="true" />
          </div>

          <div className="rhythm-special">
            <span>Special rite</span>
            <div>
              <i style={{ width: `${special}%` }} />
            </div>
            <button type="button" onClick={castUltimate} disabled={special < 100 || status !== "playing"}>
              Space / Canticle Burst
            </button>
          </div>

          <p className="rhythm-message">{message}</p>

          {status !== "playing" ? (
            <div className="rhythm-state">
              <p>{status === "ready" ? "The demon waits in the margin." : status === "won" ? "Victory inscribed." : "The page goes dark."}</p>
              <button type="button" onClick={start}>
                {status === "ready" ? "Begin the canticle" : "Play again"}
              </button>
              <small>Enter also begins the rite.</small>
            </div>
          ) : null}
        </div>

        <aside className="rhythm-portrait rhythm-portrait--demon">
          <span>{firstCanticle.demonName}</span>
          <div className="rhythm-health rhythm-health--demon">
            <i style={{ width: `${(demonHealth / MAX_DEMON_HEALTH) * 100}%` }} />
          </div>
          <strong>{demonHealth}</strong>
        </aside>
      </section>
    </main>
  );
}
