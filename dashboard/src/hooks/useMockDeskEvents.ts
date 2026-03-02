import { useState, useEffect, useCallback, useRef } from "react";
import type { DeskState, NoiseBand, OccupancyStatus } from "../types";
import { desksPerFloor } from "../data/mockLocations";

const NOISE_BANDS: NoiseBand[] = ["silent", "quiet", "moderate", "loud"];

function randomNoise(): NoiseBand {
  return NOISE_BANDS[Math.floor(Math.random() * NOISE_BANDS.length)];
}

function randomInitialStatus(): OccupancyStatus {
  const r = Math.random();
  if (r < 0.4) return "available";
  if (r < 0.75) return "occupied";
  return "reserved";
}

/** Generate desks for ALL floors once so state persists across floor switches */
function generateAllDesks(): DeskState[] {
  const all: DeskState[] = [];
  for (const [floorId, deskIds] of Object.entries(desksPerFloor)) {
    for (const deskId of deskIds) {
      const status = randomInitialStatus();
      const now = new Date();
      all.push({
        deskId,
        floorId,
        status,
        noiseband: randomNoise(),
        occupiedSince:
          status === "occupied"
            ? new Date(now.getTime() - Math.random() * 3600000).toISOString()
            : undefined,
        reservedSince:
          status === "reserved"
            ? new Date(now.getTime() - Math.random() * 1800000).toISOString()
            : undefined,
        lastOccupiedAt:
          status === "available"
            ? new Date(now.getTime() - Math.random() * 7200000).toISOString()
            : undefined,
      });
    }
  }
  return all;
}

function applyRandomUpdate(desks: DeskState[]): DeskState[] {
  const next = [...desks];
  const idx = Math.floor(Math.random() * next.length);
  const desk = { ...next[idx] };
  const rand = Math.random();
  const now = new Date().toISOString();

  // Transitions follow the valid state machine:
  //   available  → occupied
  //   occupied   → reserved
  //   reserved   → available 
  if (desk.status === "available") {
    if (rand < 0.4) {
      desk.status = "occupied";
      desk.occupiedSince = now;
      desk.lastOccupiedAt = undefined;
    }
  } else if (desk.status === "occupied") {
    if (rand < 0.45) {
      desk.status = "reserved";
      desk.reservedSince = now;
      desk.occupiedSince = undefined;
    }
  } else if (desk.status === "reserved") {
    if (rand < 0.45) {
      // Person confirmed gone
      desk.status = "available";
      desk.lastOccupiedAt = now;
      desk.reservedSince = undefined;
    } else if (rand < 0.75) {
      // Person came back
      desk.status = "occupied";
      desk.occupiedSince = now;
      desk.reservedSince = undefined;
    }
  }

  // Always update noise
  desk.noiseband = randomNoise();
  next[idx] = desk;
  return next;
}

export function useMockDeskEvents() {
  const [allDesks, setAllDesks] = useState<DeskState[]>(generateAllDesks);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [simulationActive, setSimulationActive] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function tick() {
      const delay = 3000 + Math.random() * 3000;
      timerRef.current = setTimeout(() => {
        setAllDesks(applyRandomUpdate);
        setLastUpdate(new Date());
        tick();
      }, delay);
    }

    if (simulationActive) {
      tick();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [simulationActive]);

  const toggleSimulation = useCallback(() => {
    setSimulationActive((prev) => !prev);
  }, []);

  /** Get desks for a specific floor */
  const getDesksForFloor = useCallback(
    (floorId: string) => allDesks.filter((d) => d.floorId === floorId),
    [allDesks]
  );

  return { allDesks, getDesksForFloor, lastUpdate, simulationActive, toggleSimulation };
}
