import { useState, useCallback, useMemo } from "react";
import type { DeskState, OccupancyStatus, NoiseBand } from "../types";

export interface DeskFiltersState {
  search: string;
  statusFilters: Set<OccupancyStatus>;
  noiseFilters: Set<NoiseBand>;
}

export function useDeskFilters(desks: DeskState[]) {
  const [search, setSearch] = useState("");
  const [statusFilters, setStatusFilters] = useState<Set<OccupancyStatus>>(
    new Set()
  );
  const [noiseFilters, setNoiseFilters] = useState<Set<NoiseBand>>(new Set());

  const toggleStatus = useCallback((status: OccupancyStatus) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }, []);

  const toggleNoise = useCallback((noise: NoiseBand) => {
    setNoiseFilters((prev) => {
      const next = new Set(prev);
      if (next.has(noise)) next.delete(noise);
      else next.add(noise);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSearch("");
    setStatusFilters(new Set());
    setNoiseFilters(new Set());
  }, []);

  const hasActiveFilters =
    search.length > 0 || statusFilters.size > 0 || noiseFilters.size > 0;

  const filteredDesks = useMemo(() => {
    return desks.filter((d) => {
      // Search by desk ID
      if (
        search &&
        !d.deskId.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      // Availability filter (AND with other filters)
      if (statusFilters.size > 0 && !statusFilters.has(d.status)) {
        return false;
      }
      // Noise filter
      if (noiseFilters.size > 0 && !noiseFilters.has(d.noiseband)) {
        return false;
      }
      return true;
    });
  }, [desks, search, statusFilters, noiseFilters]);

  return {
    search,
    setSearch,
    statusFilters,
    noiseFilters,
    toggleStatus,
    toggleNoise,
    clearAll,
    hasActiveFilters,
    filteredDesks,
  };
}
