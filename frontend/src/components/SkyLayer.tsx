"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";

type CloudBand = "distant" | "middle" | "front";

type Cloud = {
  id: string;
  band: CloudBand;
  top: string;
  size: number;
  duration: number;
  delay: number;
  drift: string;
  opacity: number;
  blur: number;
  depth: number;
  staticX: string;
};

const CLOUDS: Cloud[] = [
  { id: "distant-1", band: "distant", top: "15%", size: 210, duration: 118, delay: -62, drift: "7vh", opacity: 0.36, blur: 2.8, depth: 0.28, staticX: "8vw" },
  { id: "distant-2", band: "distant", top: "28%", size: 180, duration: 132, delay: -96, drift: "-4vh", opacity: 0.32, blur: 3.2, depth: 0.22, staticX: "74vw" },
  { id: "distant-3", band: "distant", top: "49%", size: 260, duration: 140, delay: -38, drift: "5vh", opacity: 0.28, blur: 3.6, depth: 0.2, staticX: "38vw" },
  { id: "distant-4", band: "distant", top: "66%", size: 220, duration: 126, delay: -112, drift: "-6vh", opacity: 0.3, blur: 3, depth: 0.24, staticX: "58vw" },
  { id: "middle-1", band: "middle", top: "20%", size: 280, duration: 96, delay: -41, drift: "-7vh", opacity: 0.46, blur: 1.4, depth: 0.55, staticX: "20vw" },
  { id: "middle-2", band: "middle", top: "38%", size: 330, duration: 104, delay: -88, drift: "8vh", opacity: 0.5, blur: 1.1, depth: 0.62, staticX: "65vw" },
  { id: "middle-3", band: "middle", top: "55%", size: 245, duration: 91, delay: -24, drift: "-5vh", opacity: 0.48, blur: 1.3, depth: 0.5, staticX: "44vw" },
  { id: "middle-4", band: "middle", top: "78%", size: 300, duration: 110, delay: -72, drift: "6vh", opacity: 0.42, blur: 1.6, depth: 0.46, staticX: "6vw" },
  { id: "front-1", band: "front", top: "24%", size: 360, duration: 76, delay: -18, drift: "9vh", opacity: 0.62, blur: 0.4, depth: 0.95, staticX: "48vw" },
  { id: "front-2", band: "front", top: "46%", size: 410, duration: 84, delay: -64, drift: "-8vh", opacity: 0.58, blur: 0.3, depth: 0.9, staticX: "12vw" },
  { id: "front-3", band: "front", top: "72%", size: 340, duration: 88, delay: -49, drift: "7vh", opacity: 0.54, blur: 0.6, depth: 0.78, staticX: "72vw" },
];

function cloudTrackStyle(cloud: Cloud) {
  return {
    "--cloud-depth": cloud.depth,
  } as CSSProperties;
}

function cloudStyle(cloud: Cloud) {
  return {
    "--cloud-top": cloud.top,
    "--cloud-size": `${cloud.size}px`,
    "--cloud-duration": `${cloud.duration}s`,
    "--cloud-delay": `${cloud.delay}s`,
    "--cloud-drift": cloud.drift,
    "--cloud-opacity": cloud.opacity,
    "--cloud-blur": `${cloud.blur}px`,
    "--cloud-static-x": cloud.staticX,
  } as CSSProperties;
}

export function SkyLayer() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!layer || reduceMotion.matches) {
      return;
    }

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    let scrollY = window.scrollY;

    const writePosition = () => {
      frame = 0;
      layer.style.setProperty("--sky-parallax-x-distant", `${pointerX * 7}px`);
      layer.style.setProperty("--sky-parallax-y-distant", `${pointerY * 5 + Math.min(scrollY, 900) * -0.006}px`);
      layer.style.setProperty("--sky-parallax-x-middle", `${pointerX * 15}px`);
      layer.style.setProperty("--sky-parallax-y-middle", `${pointerY * 10 + Math.min(scrollY, 900) * -0.012}px`);
      layer.style.setProperty("--sky-parallax-x-front", `${pointerX * 24}px`);
      layer.style.setProperty("--sky-parallax-y-front", `${pointerY * 16 + Math.min(scrollY, 900) * -0.018}px`);
    };

    const schedule = () => {
      if (frame) {
        return;
      }
      frame = window.requestAnimationFrame(writePosition);
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointerX = event.clientX / window.innerWidth - 0.5;
      pointerY = event.clientY / window.innerHeight - 0.5;
      schedule();
    };

    const handleScroll = () => {
      scrollY = window.scrollY;
      schedule();
    };

    writePosition();
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("scroll", handleScroll);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  return (
    <div ref={layerRef} className="ballzatram-sky-layer" aria-hidden="true">
      <div className="ballzatram-sky-sun" />
      <div className="ballzatram-sky-horizon" />
      {CLOUDS.map((cloud) => (
        <span
          key={cloud.id}
          className={`ballzatram-cloud-track ballzatram-cloud-track--${cloud.band}`}
          style={cloudTrackStyle(cloud)}
        >
          <i className="ballzatram-cloud" style={cloudStyle(cloud)} />
        </span>
      ))}
    </div>
  );
}
