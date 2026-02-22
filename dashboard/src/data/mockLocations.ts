import type { Library, Floor } from "../types";

/**
 * College libraries — each has a different number of floors reflecting
 * the real-world variation in building size.
 */
export const libraries: Library[] = [
  { id: "ussher",   name: "Ussher Library" },
  { id: "berkeley", name: "Berkeley Library" },
  { id: "hamilton", name: "Hamilton Library" },
];

export const floors: Floor[] = [
  // Ussher — 4 floors
  { id: "ussher-gf",  libraryId: "ussher",   name: "Ground Floor" },
  { id: "ussher-1f",  libraryId: "ussher",   name: "1st Floor" },
  { id: "ussher-2f",  libraryId: "ussher",   name: "2nd Floor" },
  { id: "ussher-3f",  libraryId: "ussher",   name: "3rd Floor" },
  // Berkeley — 3 floors
  { id: "berkeley-gf", libraryId: "berkeley", name: "Ground Floor" },
  { id: "berkeley-1f", libraryId: "berkeley", name: "1st Floor" },
  { id: "berkeley-2f", libraryId: "berkeley", name: "2nd Floor" },
  // Hamilton — 2 floors
  { id: "hamilton-gf", libraryId: "hamilton", name: "Ground Floor" },
  { id: "hamilton-1f", libraryId: "hamilton", name: "1st Floor" },
];

/** Desk IDs per floor — counts vary to reflect real floor layouts */
export const desksPerFloor: Record<string, string[]> = {
  "ussher-gf":   ["UG-D1","UG-D2","UG-D3","UG-D4","UG-D5","UG-D6","UG-D7","UG-D8"],
  "ussher-1f":   ["U1-D1","U1-D2","U1-D3","U1-D4","U1-D5","U1-D6","U1-D7","U1-D8"],
  "ussher-2f":   ["U2-D1","U2-D2","U2-D3","U2-D4","U2-D5","U2-D6","U2-D7","U2-D8"],
  "ussher-3f":   ["U3-D1","U3-D2","U3-D3","U3-D4","U3-D5","U3-D6"],
  "berkeley-gf": ["BG-D1","BG-D2","BG-D3","BG-D4","BG-D5","BG-D6"],
  "berkeley-1f": ["B1-D1","B1-D2","B1-D3","B1-D4","B1-D5","B1-D6","B1-D7","B1-D8"],
  "berkeley-2f": ["B2-D1","B2-D2","B2-D3","B2-D4","B2-D5","B2-D6","B2-D7","B2-D8"],
  "hamilton-gf": ["HG-D1","HG-D2","HG-D3","HG-D4","HG-D5","HG-D6"],
  "hamilton-1f": ["H1-D1","H1-D2","H1-D3","H1-D4","H1-D5","H1-D6"],
};

export function getFloorsForLibrary(libraryId: string): Floor[] {
  return floors.filter((f) => f.libraryId === libraryId);
}

export function getDeskIdsForFloor(floorId: string): string[] {
  return desksPerFloor[floorId] ?? [];
}
