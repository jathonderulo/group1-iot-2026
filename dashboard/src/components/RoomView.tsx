import type { DeskState } from "../types";
import DeskTile from "./DeskTile";

interface RoomViewProps {
  desks: DeskState[];
  floorName: string;
  selectedDeskId: string | null;
  onSelectDesk: (deskId: string) => void;
}

export default function RoomView({
  desks,
  floorName,
  selectedDeskId,
  onSelectDesk,
}: RoomViewProps) {
  return (
    <section aria-label="Floor plan">
      {/* Room border */}
      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-4 sm:p-6 dark:border-gray-700 dark:bg-gray-800/50">
        {/* Room label */}
        <div className="mb-4 flex items-center gap-2">
          <svg
            className="h-4 w-4 text-gray-400 dark:text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008V10.5Zm0 3h.008v.008h-.008V13.5Zm0 3h.008v.008h-.008V16.5Z"
            />
          </svg>
          <span className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {floorName} — Floor Plan
          </span>
        </div>

        {/* Desk grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6">
          {desks.length > 0 ? (
            desks.map((desk) => (
              <DeskTile
                key={desk.deskId}
                desk={desk}
                isSelected={selectedDeskId === desk.deskId}
                onSelect={onSelectDesk}
              />
            ))
          ) : (
            <p className="col-span-full py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              No desks match your filters.
            </p>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          Available
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          Occupied
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          Reserved
        </div>
        <span className="ml-auto">Click a desk to view details</span>
      </div>
    </section>
  );
}
