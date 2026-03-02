import { useState, useEffect } from "react";
import { demoDeskId, demoFloor } from "../data/mockLocations";
import type { DeskState, OccupancyStatus } from "../types";

const API_URL = "http://16.170.224.70:8080/api";
const POLL_INTERVAL = 5000; // ms

/**
 * Self-contained hook that manages the demo desk (DG-D1) entirely
 * from the live EC2 backend. Completely independent of mock desks.
 *
 * Returns the current DeskState for the demo desk and the last
 * time it was successfully updated.
 */
export function useLiveDeskStatus() {
  const [demoDesk, setDemoDesk] = useState<DeskState>({
    deskId: demoDeskId,
    floorId: demoFloor.id,
    status: "available",
    noiseband: "quiet",
  });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      try {
        const res = await fetch(API_URL);
        const data = await res.json();
        console.log("[LiveDesk] GET /api response:", data);

        // Accept both "desk_id" and "deskId" keys
        const id: string | undefined = data[0].desk_id ?? data[0].deskId;

        if (id !== demoDeskId) {
          console.warn(
            `[LiveDesk] Ignoring response — desk_id "${id}" does not match "${demoDeskId}"`
          );
        } else {
          const raw: string = data[0].status.toLowerCase();
          const mapped: OccupancyStatus =
            raw === "vacant" ? "available" : (raw as OccupancyStatus);

          if (["vacant", "occupied", "reserved"].includes(mapped)) {
            console.log(`[LiveDesk] ${demoDeskId} → ${mapped}`);
            const now = new Date().toISOString();

            setDemoDesk((prev) => {
              if (prev.status === mapped) return prev;

              const next: DeskState = {
                ...prev,
                status: mapped,
                occupiedSince:
                  mapped === "occupied" ? now : undefined,
                reservedSince:
                  mapped === "reserved" ? now : undefined,
                lastOccupiedAt:
                  mapped === "available" ? now : undefined,
              };
              return next;
            });

            setLastUpdate(new Date());
          } else {
            console.warn("[LiveDesk] Unknown status value:", raw);
          }
        }
      } catch (err) {
        console.error("[LiveDesk] GET /api failed:", err);
      }

      if (!cancelled) {
        timer = setTimeout(poll, POLL_INTERVAL);
      }
    }

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return { demoDesk, lastUpdate };
}
