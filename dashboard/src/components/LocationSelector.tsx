import type { Library, Floor } from "../types";

interface LocationSelectorProps {
  libraries: Library[];
  floors: Floor[];
  selectedLibraryId: string;
  selectedFloorId: string;
  onLibraryChange: (id: string) => void;
  onFloorChange: (id: string) => void;
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; name: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm transition-colors hover:border-gray-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-500"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function LocationSelector({
  libraries,
  floors,
  selectedLibraryId,
  selectedFloorId,
  onLibraryChange,
  onFloorChange,
}: LocationSelectorProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select
        label="Library"
        value={selectedLibraryId}
        options={libraries}
        onChange={onLibraryChange}
      />
      <Select
        label="Floor"
        value={selectedFloorId}
        options={floors}
        onChange={onFloorChange}
      />
    </div>
  );
}
