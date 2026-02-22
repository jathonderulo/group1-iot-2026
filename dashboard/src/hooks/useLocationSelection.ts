import { useState, useEffect, useCallback, useMemo } from "react";
import {
  libraries,
  getFloorsForLibrary,
} from "../data/mockLocations";

export interface LocationSelection {
  libraryId: string;
  floorId: string;
}

function readFromURL(): Partial<LocationSelection> {
  const params = new URLSearchParams(window.location.search);
  return {
    libraryId: params.get("library") ?? undefined,
    floorId: params.get("floor") ?? undefined,
  };
}

function writeToURL(sel: LocationSelection) {
  const params = new URLSearchParams();
  params.set("library", sel.libraryId);
  params.set("floor", sel.floorId);
  const url = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, "", url);
}

function resolveDefaults(partial: Partial<LocationSelection>): LocationSelection {
  const libraryId =
    partial.libraryId && libraries.some((l) => l.id === partial.libraryId)
      ? partial.libraryId
      : libraries[0].id;

  const availableFloors = getFloorsForLibrary(libraryId);
  const floorId =
    partial.floorId && availableFloors.some((f) => f.id === partial.floorId)
      ? partial.floorId
      : availableFloors[0].id;

  return { libraryId, floorId };
}

export function useLocationSelection() {
  const [selection, setSelection] = useState<LocationSelection>(() =>
    resolveDefaults(readFromURL())
  );

  // Sync URL when selection changes
  useEffect(() => {
    writeToURL(selection);
  }, [selection]);

  const setLibrary = useCallback((libraryId: string) => {
    setSelection((prev) => {
      if (prev.libraryId === libraryId) return prev;
      const availableFloors = getFloorsForLibrary(libraryId);
      const floorId = availableFloors[0]?.id ?? "";
      return { libraryId, floorId };
    });
  }, []);

  const setFloor = useCallback((floorId: string) => {
    setSelection((prev) =>
      prev.floorId === floorId ? prev : { ...prev, floorId }
    );
  }, []);

  const availableFloors = useMemo(
    () => getFloorsForLibrary(selection.libraryId),
    [selection.libraryId]
  );

  return {
    selection,
    libraries,
    availableFloors,
    setLibrary,
    setFloor,
  };
}
