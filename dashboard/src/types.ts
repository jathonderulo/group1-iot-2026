export type NoiseBand = "silent" | "quiet" | "moderate" | "loud";

export type OccupancyStatus = "available" | "occupied" | "reserved";

export type Library = {
  id: string;
  name: string;
};

export type Floor = {
  id: string;
  libraryId: string;
  name: string;
};

export type DeskState = {
  deskId: string;
  floorId: string;
  status: OccupancyStatus;
  noiseband: NoiseBand;
  occupiedSince?: string;
  reservedSince?: string;
  lastOccupiedAt?: string;
};
