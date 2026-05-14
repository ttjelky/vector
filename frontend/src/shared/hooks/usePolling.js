// src/hooks/usePolling.js
//
// Викликає `callback` кожні `intervalMs` мілісекунд.
// Автоматично призупиняється, коли вкладка прихована (Page Visibility API),
// і відновлюється (з негайним викликом) при поверненні.
// Зупиняється, якщо `enabled` === false.

import { useEffect, useRef, useCallback } from "react";

export function usePolling(callback, intervalMs = 5000, enabled = true) {
  const savedCallback = useRef(callback);
  const timerRef      = useRef(null);

  // Завжди тримаємо актуальний callback без перезапуску ефекту
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const start = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      if (document.visibilityState !== "hidden") {
        savedCallback.current();
      }
    }, intervalMs);
  }, [intervalMs]);

  const stop = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => {
    if (!enabled) { stop(); return; }

    start();

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        stop();
      } else {
        // Одразу підтягуємо свіжі дані після повернення на вкладку
        savedCallback.current();
        start();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, start, stop]);
}
