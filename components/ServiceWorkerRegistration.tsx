"use client";

import { useEffect } from "react";

/** Registriert den Service Worker — nur im Production-Build, damit HMR im Dev nicht gecacht wird. */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
