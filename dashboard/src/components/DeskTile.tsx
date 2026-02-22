import type { DeskState, OccupancyStatus } from "../types";

interface DeskTileProps {
  desk: DeskState;
  isSelected: boolean;
  onSelect: (deskId: string) => void;
}

const statusIconColors: Record<OccupancyStatus, { fill: string; stroke: string }> = {
  available: { fill: "#bbf7d0", stroke: "#16a34a" },
  occupied:  { fill: "#fca5a5", stroke: "#dc2626" },
  unsure:    { fill: "#fef08a", stroke: "#ca8a04" },
};

/** Inline SVG desk + chair icon */
function DeskIcon({ status }: { status: OccupancyStatus }) {
  const { fill, stroke } = statusIconColors[status];

  return (
    <svg
      viewBox="0 0 64 64"
      className="w-16 h-16 mx-auto mb-2"
      aria-hidden="true"
    >
      {/* Desk surface */}
      <rect
        x="8"
        y="18"
        width="48"
        height="24"
        rx="4"
        fill={fill}
        stroke={stroke}
        strokeWidth="2"
      />
      {/* Desk legs */}
      <rect x="12" y="42" width="4" height="10" rx="1" fill={stroke} />
      <rect x="48" y="42" width="4" height="10" rx="1" fill={stroke} />
      {/* Chair back */}
      <rect
        x="24"
        y="4"
        width="16"
        height="10"
        rx="3"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
      />
      {/* Chair seat connector */}
      <rect x="30" y="14" width="4" height="4" rx="1" fill={stroke} />
      {/* Unsure indicator — question mark dot */}
      {status === "unsure" && (
        <text
          x="32"
          y="36"
          textAnchor="middle"
          fontSize="14"
          fontWeight="bold"
          fill={stroke}
        >
          ?
        </text>
      )}
    </svg>
  );
}

const noiseBandColorDark: Record<string, string> = {
  silent: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  quiet: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  moderate: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  loud: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export default function DeskTile({ desk, isSelected, onSelect }: DeskTileProps) {
  return (
    <button
      onClick={() => onSelect(desk.deskId)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(desk.deskId);
        }
      }}
      className={`
        group relative flex flex-col items-center justify-center
        rounded-2xl border bg-white p-4
        transition-all duration-200 cursor-pointer
        focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
        hover:shadow-md hover:-translate-y-0.5
        dark:bg-gray-800
        ${
          isSelected
            ? "ring-2 ring-indigo-500 shadow-lg border-indigo-200 dark:border-indigo-600"
            : "border-gray-200 shadow-sm dark:border-gray-700"
        }
      `}
      aria-label={`Desk ${desk.deskId}, ${{ available: "Available", occupied: "Occupied", unsure: "Unsure" }[desk.status]}`}
    >
      <DeskIcon status={desk.status} />

      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{desk.deskId}</span>

      <span
        className={`mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
          desk.status === "occupied"
            ? "bg-red-50 text-red-600 ring-1 ring-red-200 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-700"
            : desk.status === "unsure"
            ? "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:ring-yellow-700"
            : "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-700"
        }`}
      >
        {{ available: "Available", occupied: "Occupied", unsure: "Unsure" }[desk.status]}
      </span>

      <span
        className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
          noiseBandColorDark[desk.noiseband] ?? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
        }`}
      >
        {desk.noiseband}
      </span>
    </button>
  );
}
