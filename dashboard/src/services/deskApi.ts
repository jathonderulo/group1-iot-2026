import type { OccupancyStatus } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

/**
 * Response shape returned by the EC2 backend.
 * The backend uses "vacant" where the frontend uses "available".
 */
interface BackendDeskStatus {
  status: "occupied" | "vacant" | "reserved";
}

/** Map backend status values to frontend OccupancyStatus */
function mapStatus(backendStatus: BackendDeskStatus["status"]): OccupancyStatus {
  if (backendStatus === "vacant") return "available";
  return backendStatus; // "occupied" | "reserved" match directly
}

/**
 * Fetch the live status of a single desk from the EC2 API.
 *
 * Endpoint: GET {VITE_API_BASE_URL}/api/desks/{deskId}/status
 * Expected response: { "status": "occupied" | "vacant" | "reserved" }
 *
 * Returns the mapped OccupancyStatus or `null` if the request fails
 * (so the caller can fall back to the last known state).
 */
export async function fetchDeskStatus(deskId: string): Promise<OccupancyStatus | null> {
  if (!API_BASE_URL) {
    console.warn("[deskApi] VITE_API_BASE_URL is not set — skipping live fetch");
    return null;
  }

  try {
    const url = `${API_BASE_URL}/api/desks/${encodeURIComponent(deskId)}/status`;
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000), // 5 s timeout
    });

    if (!res.ok) {
      console.error(`[deskApi] ${res.status} ${res.statusText} for ${deskId}`);
      return null;
    }

    const data: BackendDeskStatus = await res.json();
    return mapStatus(data.status);
  } catch (err) {
    console.error(`[deskApi] Failed to fetch status for ${deskId}:`, err);
    return null;
  }
}
