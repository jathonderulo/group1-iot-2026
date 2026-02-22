import { format } from "date-fns";
import type { ReactNode } from "react";

interface HeaderBarProps {
  lastUpdate: Date;
  simulationActive: boolean;
  onToggleSimulation: () => void;
  children?: ReactNode; // slot for dark mode toggle, etc.
}

export default function HeaderBar({
  lastUpdate,
  simulationActive,
  onToggleSimulation,
  children,
}: HeaderBarProps) {
  return (
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 bg-white border-b border-gray-100 dark:bg-gray-900 dark:border-gray-800">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-gray-800 tracking-tight dark:text-gray-100">
          Library Desk Availability
        </h1>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200/80 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-700">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              simulationActive ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
            }`}
          />
          Live (mock)
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          Last update: {format(lastUpdate, "HH:mm:ss")}
        </span>

        <button
          onClick={onToggleSimulation}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
            simulationActive ? "bg-indigo-500" : "bg-gray-300 dark:bg-gray-600"
          }`}
          role="switch"
          aria-checked={simulationActive}
          aria-label="Toggle live simulation"
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              simulationActive ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
        <span className="text-xs text-gray-500 dark:text-gray-400">Simulate</span>

        {children}
      </div>
    </header>
  );
}
