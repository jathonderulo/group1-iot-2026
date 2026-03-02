import { useState, useEffect, useCallback, useMemo } from "react";
import {
  libraries,
  getFloorsForLibrary,
  demoLibrary,
  demoFloor,
} from "../data/mockLocations";

/** All libraries including the standalone demo */
const allLibraries = [...libraries, demoLibrary];

/** Floor lookup that also knows about the demo floor */
function allFloorsForLibrary(libraryId: string) {
  if (libraryId === demoLibrary.id) return [demoFloor];
  return getFloorsForLibrary(libraryId);
}

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
    partial.libraryId && allLibraries.some((l) => l.id === partial.libraryId)
      ? partial.libraryId
      : allLibraries[0].id;

  const floors = allFloorsForLibrary(libraryId);
  const floorId =
    partial.floorId && floors.some((f) => f.id === partial.floorId)
      ? partial.floorId
      : floors[0].id;

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
      const floors = allFloorsForLibrary(libraryId);
      const floorId = floors[0]?.id ?? "";
      return { libraryId, floorId };
    });
  }, []);

  const setFloor = useCallback((floorId: string) => {
    setSelection((prev) =>
      prev.floorId === floorId ? prev : { ...prev, floorId }
    );
  }, []);

  const availableFloors = useMemo(
    () => allFloorsForLibrary(selection.libraryId),
    [selection.libraryId]
  );

  return {
    selection,
    libraries: allLibraries,
    availableFloors,
    setLibrary,
    setFloor,
  };
}
