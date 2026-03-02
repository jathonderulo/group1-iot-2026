import { formatDistanceToNow, parseISO } from "date-fns";
import type { DeskState } from "../types";

interface DeskDetailsPanelProps {
  desk: DeskState | null;
  onClose: () => void;
}

const noiseBandLabel: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  silent: { bg: "bg-blue-100", text: "text-blue-700", darkBg: "dark:bg-blue-900/40", darkText: "dark:text-blue-300" },
  quiet: { bg: "bg-green-100", text: "text-green-700", darkBg: "dark:bg-green-900/40", darkText: "dark:text-green-300" },
  moderate: { bg: "bg-amber-100", text: "text-amber-700", darkBg: "dark:bg-amber-900/40", darkText: "dark:text-amber-300" },
  loud: { bg: "bg-red-100", text: "text-red-700", darkBg: "dark:bg-red-900/40", darkText: "dark:text-red-300" },
};

function timeAgo(iso?: string): string {
  if (!iso) return "—";
  return formatDistanceToNow(parseISO(iso), { addSuffix: true });
}

export default function DeskDetailsPanel({
  desk,
  onClose,
}: DeskDetailsPanelProps) {
  if (!desk) return null;

  const noise = noiseBandLabel[desk.noiseband] ?? {
    bg: "bg-gray-100",
    text: "text-gray-600",
    darkBg: "dark:bg-gray-700",
    darkText: "dark:text-gray-400",
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className={`
          fixed bottom-0 left-0 right-0 z-50 max-h-[70vh] overflow-y-auto
          rounded-t-2xl border-t border-gray-200 bg-white p-6 shadow-2xl
          transition-transform duration-300 ease-out
          lg:static lg:z-auto lg:max-h-none lg:w-80 lg:shrink-0
          lg:rounded-2xl lg:border lg:shadow-lg
          dark:border-gray-700 dark:bg-gray-800
        `}
        role="dialog"
        aria-label={`Details for desk ${desk.deskId}`}
      >

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Desk {desk.deskId}</h2>

            <button
                onClick={onClose}
                className="cursor-pointer rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                aria-label="Close details"
            >
                <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Occupancy pill */}
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Status
            </span>
            <div className="mt-1">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                  desk.status === "occupied"
                    ? "bg-red-50 text-red-600 ring-1 ring-red-200 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-700"
                    : desk.status === "reserved"
                    ? "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:ring-yellow-700"
                    : "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-700"
                }`}
              >
                {{ available: "Available", occupied: "Occupied", reserved: "Reserved" }[desk.status]}
              </span>
            </div>
          </div>

          {/* Noise band chip */}
          {/* <div>
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Noise Level
            </span>
            <div className="mt-1">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${noise.bg} ${noise.text} ${noise.darkBg} ${noise.darkText}`}
              >
                {desk.noiseband.charAt(0).toUpperCase() +
                  desk.noiseband.slice(1)}
              </span>
            </div>
          </div> */}

          {/* Time info */}
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {desk.status === "occupied"
                ? "Occupied Since"
                : desk.status === "reserved"
                ? "Reserved Since"
                : "Last Occupied"}
            </span>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
              {desk.status === "occupied"
                ? timeAgo(desk.occupiedSince)
                : desk.status === "reserved"
                ? timeAgo(desk.reservedSince)
                : timeAgo(desk.lastOccupiedAt)}
            </p>
          </div>

          {/* Desk ID */}
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Desk ID
            </span>
            <p className="mt-1 text-sm font-mono text-gray-600 dark:text-gray-300">
              {desk.deskId}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
