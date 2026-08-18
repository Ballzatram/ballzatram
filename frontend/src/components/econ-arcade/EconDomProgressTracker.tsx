"use client";

import { useEffect, useRef } from "react";
import { recordEconProgress } from "@/lib/econ-arcade/progress";

export function EconDomProgressTracker({
  gameId,
  concepts,
  completionText,
}: {
  gameId: string;
  concepts: string[];
  completionText: string;
}) {
  const completed = useRef(false);

  useEffect(() => {
    recordEconProgress(gameId, { concepts, outcome: "Opened experience" });
    const check = () => {
      if (completed.current) return;
      const text = document.body.textContent ?? "";
      if (!text.includes(completionText)) return;
      completed.current = true;
      recordEconProgress(gameId, {
        completed: true,
        countAttempt: false,
        concepts,
        outcome: completionText,
      });
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [completionText, concepts, gameId]);

  return null;
}
