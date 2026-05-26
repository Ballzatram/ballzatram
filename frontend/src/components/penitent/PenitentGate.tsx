"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState, type MouseEvent } from "react";

const ASSET_ROOT = "/pntnt2/assets";
const REVEAL_DONE_RATIO = 0.12;

const panes = [
  {
    title: "Hymns",
    label: "Songs and sacred noise",
    href: "/penitent/hymns",
    image: `${ASSET_ROOT}/pane_hymns.png`,
    className: "penitent-pane--hymns",
  },
  {
    title: "Crusades",
    label: "Penitent 2: Rhythm Crusade",
    href: "/penitent/rhythm",
    image: `${ASSET_ROOT}/pane_crusades.png`,
    className: "penitent-pane--crusades",
  },
  {
    title: "Relics",
    label: "Hidden objects and future pages",
    href: "/penitent/relics",
    image: `${ASSET_ROOT}/pane_relics.png`,
    className: "penitent-pane--relics",
  },
];

export function PenitentGate() {
  const stageRef = useRef<HTMLElement | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dustRef = useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [touched, setTouched] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hint, setHint] = useState("Tap and drag to scratch the ash away.");

  useEffect(() => {
    const stage = stageRef.current;
    const page = pageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !page || !canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const stageElement = stage;
    const pageElement = page;
    const canvasElement = canvas;
    const context = ctx;

    const params = new URLSearchParams(window.location.search);
    const forceOpen = params.get("veil") === "open";

    if (forceOpen) {
      setRevealed(true);
      setProgress(1);
      setHint("The manuscript remembers.");
      return;
    }

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let pointerDown = false;
    let checkFrame = 0;
    let finished = false;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const brushRadius = coarse ? 58 : 46;
    const doneRatio = REVEAL_DONE_RATIO;
    const parchment = new window.Image();
    parchment.src = `${ASSET_ROOT}/parchment.png`;

    function fitCanvas() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = pageElement.getBoundingClientRect();
      canvasElement.style.width = `${rect.width}px`;
      canvasElement.style.height = `${rect.height}px`;
      canvasElement.width = Math.max(1, Math.round(rect.width * dpr));
      canvasElement.height = Math.max(1, Math.round(rect.height * dpr));
    }

    function paintVeil() {
      const width = canvasElement.width;
      const height = canvasElement.height;
      context.globalCompositeOperation = "source-over";
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#d7bf8f";
      context.fillRect(0, 0, width, height);

      if (parchment.complete && parchment.naturalWidth) {
        const scale = Math.max(width / parchment.naturalWidth, height / parchment.naturalHeight);
        const drawWidth = parchment.naturalWidth * scale;
        const drawHeight = parchment.naturalHeight * scale;
        context.globalAlpha = 0.82;
        context.drawImage(parchment, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
        context.globalAlpha = 1;
      }

      const shade = context.createLinearGradient(0, 0, width, height);
      shade.addColorStop(0, "rgba(65, 38, 22, 0.42)");
      shade.addColorStop(0.45, "rgba(20, 12, 8, 0.22)");
      shade.addColorStop(1, "rgba(87, 45, 16, 0.46)");
      context.fillStyle = shade;
      context.fillRect(0, 0, width, height);

      context.fillStyle = "rgba(44, 25, 14, 0.28)";
      for (let i = 0; i < 720; i += 1) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const radius = Math.random() * 1.8 + 0.35;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }
    }

    function stamp(x: number, y: number) {
      const px = x * dpr;
      const py = y * dpr;
      const radius = brushRadius * dpr;
      const gradient = context.createRadialGradient(px, py, 0, px, py, radius);
      gradient.addColorStop(0, "rgba(0,0,0,1)");
      gradient.addColorStop(0.58, "rgba(0,0,0,0.55)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      context.globalCompositeOperation = "destination-out";
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(px, py, radius, 0, Math.PI * 2);
      context.fill();
    }

    function spawnDust(clientX: number, clientY: number) {
      const dustLayer = dustRef.current;
      if (!dustLayer) return;
      const rect = stageElement.getBoundingClientRect();
      const fleck = document.createElement("span");
      fleck.style.left = `${clientX - rect.left}px`;
      fleck.style.top = `${clientY - rect.top}px`;
      fleck.style.setProperty("--dust-x", `${Math.random() * 34 - 17}px`);
      fleck.style.setProperty("--dust-y", `${Math.random() * -28 - 8}px`);
      dustLayer.appendChild(fleck);
      window.setTimeout(() => fleck.remove(), 820);
    }

    function revealedRatio(sampleStep = 9) {
      const width = canvasElement.width;
      const height = canvasElement.height;
      const data = context.getImageData(0, 0, width, height).data;
      const step = Math.max(4, Math.round(sampleStep * dpr));
      let total = 0;
      let cleared = 0;
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          total += 1;
          if (data[(y * width + x) * 4 + 3] < 180) cleared += 1;
        }
      }
      return cleared / Math.max(1, total);
    }

    function finishReveal() {
      if (finished) return;
      finished = true;
      setRevealed(true);
      setProgress(1);
      setHint("The manuscript remembers.");
    }

    function queueCheck() {
      if (checkFrame) return;
      checkFrame = window.requestAnimationFrame(() => {
        checkFrame = 0;
        const ratio = revealedRatio();
        setProgress(ratio);
        if (ratio > 0.015) setTouched(true);
        if (ratio > 0.02) setHint("Keep scratching — reveal what was buried.");
        if (ratio > 0.04) setHint("Almost there. Open the hidden folios.");
        if (ratio >= doneRatio) finishReveal();
      });
    }

    function point(event: PointerEvent) {
      const rect = canvasElement.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    }

    function erase(event: PointerEvent) {
      const p = point(event);
      stamp(p.x, p.y);
      spawnDust(event.clientX, event.clientY);
      queueCheck();
    }

    function onPointerDown(event: PointerEvent) {
      if (finished) return;
      event.preventDefault();
      pointerDown = true;
      canvasElement.setPointerCapture(event.pointerId);
      setTouched(true);
      erase(event);
    }

    function onPointerMove(event: PointerEvent) {
      if (!pointerDown || finished) return;
      event.preventDefault();
      erase(event);
    }

    function onPointerUp(event: PointerEvent) {
      pointerDown = false;
      if (canvasElement.hasPointerCapture(event.pointerId)) canvasElement.releasePointerCapture(event.pointerId);
    }

    fitCanvas();
    paintVeil();
    if (!parchment.complete) parchment.addEventListener("load", paintVeil, { once: true });

    function onResize() {
      if (finished) return;
      fitCanvas();
      paintVeil();
    }

    canvasElement.addEventListener("pointerdown", onPointerDown);
    canvasElement.addEventListener("pointermove", onPointerMove);
    canvasElement.addEventListener("pointerup", onPointerUp);
    canvasElement.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("resize", onResize);

    return () => {
      canvasElement.removeEventListener("pointerdown", onPointerDown);
      canvasElement.removeEventListener("pointermove", onPointerMove);
      canvasElement.removeEventListener("pointerup", onPointerUp);
      canvasElement.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("resize", onResize);
      if (checkFrame) window.cancelAnimationFrame(checkFrame);
    };
  }, []);

  function preventLockedNavigation(event: MouseEvent<HTMLAnchorElement>) {
    if (!revealed) event.preventDefault();
  }

  function reseal() {
    window.location.href = "/penitent?veil=reset";
  }

  return (
    <main className="penitent-shell">
      <Link href={"/" as Route} className="penitent-return">
        Back to Ballzatram
      </Link>

      <section ref={stageRef} className="penitent-stage" aria-label="Illuminated Penitent manuscript">
        <div className="penitent-margin penitent-margin--left" aria-hidden="true">
          <img src={`${ASSET_ROOT}/floral_border.png`} alt="" />
        </div>
        <div className="penitent-margin penitent-margin--right" aria-hidden="true">
          <img src={`${ASSET_ROOT}/floral_border.png`} alt="" />
        </div>

        <div ref={pageRef} className="penitent-page">
          <section className="penitent-layout">
            <div className="penitent-intro">
              <p className="penitent-kicker">Forgotten era / scratch-to-reveal relic</p>
              <h1>The Penitent Manuscript</h1>
              <p>
                Nos sumus paenitens duo. Paenitentiam ferimus pro vobis. Cantus nostros omnes audiant.
                Tap, click, or drag to scratch off the ash. A buried page from one of Ballzatram's stranger lifetimes now opens into playable scripture.
              </p>
            </div>

            {panes.map((pane) => (
              <Link
                key={pane.title}
                href={pane.href as Route}
                className={`penitent-pane ${pane.className} ${revealed ? "is-revealed" : "is-locked"}`}
                aria-disabled={!revealed}
                tabIndex={revealed ? undefined : -1}
                onClick={preventLockedNavigation}
              >
                <img src={pane.image} alt="" />
                <span>
                  <b>{pane.title}</b>
                  <small>{pane.label}</small>
                </span>
              </Link>
            ))}
          </section>
        </div>

        <canvas
          ref={canvasRef}
          className={`penitent-veil ${revealed ? "is-done" : ""}`}
          aria-hidden="true"
        />
        {!revealed ? (
          <div className={`penitent-veil-sigil ${touched ? "is-touched" : ""}`} aria-hidden="true">
            <span>The Penitent 2</span>
            <i />
          </div>
        ) : null}
        <div ref={dustRef} className="penitent-dust" aria-hidden="true" />
        {!revealed ? (
          <div className={`penitent-veil-hint ${touched ? "is-touched" : ""}`}>
            <span>{hint}</span>
            <i style={{ width: `${Math.min(100, Math.round(progress * 100))}%` }} />
          </div>
        ) : (
          <button className="penitent-reseal" type="button" onClick={reseal}>
            Seal the page again
          </button>
        )}
      </section>
    </main>
  );
}
