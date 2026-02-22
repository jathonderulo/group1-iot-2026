import { useState } from "react";
import type { OccupancyStatus, NoiseBand } from "../types";

interface DeskFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilters: Set<OccupancyStatus>;
  noiseFilters: Set<NoiseBand>;
  onToggleStatus: (s: OccupancyStatus) => void;
  onToggleNoise: (n: NoiseBand) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

const STATUS_OPTIONS: { value: OccupancyStatus; label: string; color: string; darkColor: string }[] = [
  { value: "available", label: "Available", color: "bg-emerald-100 text-emerald-700 ring-emerald-300", darkColor: "dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-700" },
  { value: "occupied", label: "Occupied", color: "bg-red-100 text-red-700 ring-red-300", darkColor: "dark:bg-red-900/40 dark:text-red-300 dark:ring-red-700" },
  { value: "unsure", label: "Unsure", color: "bg-yellow-100 text-yellow-700 ring-yellow-300", darkColor: "dark:bg-yellow-900/40 dark:text-yellow-300 dark:ring-yellow-700" },
];

const NOISE_OPTIONS: { value: NoiseBand; label: string; color: string; darkColor: string }[] = [
  { value: "silent", label: "Silent", color: "bg-blue-100 text-blue-700 ring-blue-300", darkColor: "dark:bg-blue-900/40 dark:text-blue-300 dark:ring-blue-700" },
  { value: "quiet", label: "Quiet", color: "bg-green-100 text-green-700 ring-green-300", darkColor: "dark:bg-green-900/40 dark:text-green-300 dark:ring-green-700" },
  { value: "moderate", label: "Moderate", color: "bg-amber-100 text-amber-700 ring-amber-300", darkColor: "dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-700" },
  { value: "loud", label: "Loud", color: "bg-red-100 text-red-700 ring-red-300", darkColor: "dark:bg-red-900/40 dark:text-red-300 dark:ring-red-700" },
];

export default function DeskFilters({
  search,
  onSearchChange,
  statusFilters,
  noiseFilters,
  onToggleStatus,
  onToggleNoise,
  onClear,
  hasActiveFilters,
}: DeskFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* Search + toggle row */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search desk ID…"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 transition-colors focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder:text-gray-500 dark:focus:bg-gray-700"
          />
        </div>

        {/* Mobile expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 sm:hidden dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 cursor-pointer"
          aria-expanded={expanded}
          aria-label="Toggle filters"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
          </svg>
          Filters
          {hasActiveFilters && (
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="hidden text-xs font-medium text-indigo-600 hover:text-indigo-700 sm:block dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Filter chips — always visible on sm+, expandable on mobile */}
      <div
        className={`mt-3 space-y-3 overflow-hidden transition-all duration-200 sm:block ${
          expanded ? "block" : "hidden"
        }`}
      >
        {/* Availability */}
        <div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Availability
          </span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => {
              const active = statusFilters.has(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => onToggleStatus(opt.value)}
                  className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium ring-1 transition-all ${
                    active
                      ? `${opt.color} ${opt.darkColor}`
                      : "bg-gray-100 text-gray-500 ring-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:ring-gray-600 dark:hover:bg-gray-600"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Noise */}
        <div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Noise Level
          </span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {NOISE_OPTIONS.map((opt) => {
              const active = noiseFilters.has(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => onToggleNoise(opt.value)}
                  className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium ring-1 transition-all ${
                    active
                      ? `${opt.color} ${opt.darkColor}`
                      : "bg-gray-100 text-gray-500 ring-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:ring-gray-600 dark:hover:bg-gray-600"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Clear on mobile */}
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 sm:hidden dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer"
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
}
