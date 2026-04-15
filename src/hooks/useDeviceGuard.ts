import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Generates a stable browser fingerprint based on immutable properties.
 * Not cryptographic — just enough to distinguish devices.
 */
function generateFingerprint(): string {
  const nav = navigator;
  const screen = window.screen;
  const raw = [
    nav.userAgent,
    nav.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    nav.hardwareConcurrency ?? "?",
    (nav as any).deviceMemory ?? "?",
    nav.maxTouchPoints ?? 0,
  ].join("|");

  // Simple hash
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return "fp_" + Math.abs(hash).toString(36);
}

function getDeviceLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Mac/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "Navegador";
}

type DeviceStatus = "checking" | "allowed" | "blocked" | "max_reached" | "error";

export function useDeviceGuard(userId: string | undefined) {
  const [status, setStatus] = useState<DeviceStatus>("checking");
  const [fingerprint] = useState(() => generateFingerprint());

  const checkDevice = useCallback(async () => {
    if (!userId) {
      setStatus("checking");
      return;
    }

    try {
      const { data, error } = await supabase.rpc("check_device_limit", {
        _user_id: userId,
        _fingerprint: fingerprint,
      });

      if (error) {
        console.error("Device check error:", error);
        // Fail open — don't block user if check fails
        setStatus("allowed");
        return;
      }

      const result = data as any;
      if (result?.allowed) {
        // Register device if new
        if (result.reason === "NEW_DEVICE") {
          await supabase.from("device_sessions").upsert({
            user_id: userId,
            device_fingerprint: fingerprint,
            device_label: getDeviceLabel(),
            last_active_at: new Date().toISOString(),
          }, { onConflict: "user_id,device_fingerprint" });
        }
        setStatus("allowed");
      } else if (result?.reason === "DEVICE_BLOCKED") {
        setStatus("blocked");
      } else {
        setStatus("max_reached");
      }
    } catch (err) {
      console.error("Device guard error:", err);
      setStatus("allowed"); // fail open
    }
  }, [userId, fingerprint]);

  useEffect(() => {
    checkDevice();
  }, [checkDevice]);

  // Heartbeat every 5 min
  useEffect(() => {
    if (!userId || status !== "allowed") return;
    const interval = setInterval(() => {
      supabase
        .from("device_sessions")
        .update({ last_active_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("device_fingerprint", fingerprint)
        .then(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId, fingerprint, status]);

  return { status, fingerprint, recheckDevice: checkDevice };
}
