import { useState, useCallback, useMemo } from "react";
import HeaderBar from "./components/HeaderBar";
import RoomView from "./components/RoomView";
import DeskDetailsPanel from "./components/DeskDetailsPanel";
import LocationSelector from "./components/LocationSelector";
import DeskFilters from "./components/DeskFilters";
import DarkModeToggle from "./components/DarkModeToggle";
import { useMockDeskEvents } from "./hooks/useMockDeskEvents";
import { useLocationSelection } from "./hooks/useLocationSelection";
import { useDeskFilters } from "./hooks/useDeskFilters";
import { useDarkMode } from "./hooks/useDarkMode";
import { floors } from "./data/mockLocations";

function App() {
  const { getDesksForFloor, lastUpdate, simulationActive, toggleSimulation } =
    useMockDeskEvents();

  const {
    selection,
    libraries,
    availableFloors,
    setLibrary,
    setFloor,
  } = useLocationSelection();

  const { dark, toggle: toggleDark } = useDarkMode();

  // Desks for the currently selected floor
  const floorDesks = useMemo(
    () => getDesksForFloor(selection.floorId),
    [getDesksForFloor, selection.floorId]
  );

  const {
    search,
    setSearch,
    statusFilters,
    noiseFilters,
    toggleStatus,
    toggleNoise,
    clearAll,
    hasActiveFilters,
    filteredDesks,
  } = useDeskFilters(floorDesks);

  const [selectedDeskId, setSelectedDeskId] = useState<string | null>(null);

  const selectedDesk =
    filteredDesks.find((d) => d.deskId === selectedDeskId) ?? null;

  const handleSelectDesk = useCallback((deskId: string) => {
    setSelectedDeskId((prev) => (prev === deskId ? null : deskId));
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedDeskId(null);
  }, []);

  // Current floor name for the header
  const currentFloorName =
    floors.find((f) => f.id === selection.floorId)?.name ?? "Floor";

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 antialiased dark:bg-gray-900 dark:text-gray-200">
      <HeaderBar
        lastUpdate={lastUpdate}
        simulationActive={simulationActive}
        onToggleSimulation={toggleSimulation}
      >
        <DarkModeToggle dark={dark} onToggle={toggleDark} />
      </HeaderBar>

      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        {/* Location selector + filters row */}
        <div className="mb-6 space-y-4">
          <LocationSelector
            libraries={libraries}
            floors={availableFloors}
            selectedLibraryId={selection.libraryId}
            selectedFloorId={selection.floorId}
            onLibraryChange={setLibrary}
            onFloorChange={setFloor}
          />
          <DeskFilters
            search={search}
            onSearchChange={setSearch}
            statusFilters={statusFilters}
            noiseFilters={noiseFilters}
            onToggleStatus={toggleStatus}
            onToggleNoise={toggleNoise}
            onClear={clearAll}
            hasActiveFilters={hasActiveFilters}
          />
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Floor view — grows to fill */}
          <div className="flex-1">
            <RoomView
              desks={filteredDesks}
              floorName={currentFloorName}
              selectedDeskId={selectedDeskId}
              onSelectDesk={handleSelectDesk}
            />
          </div>

          {/* Details panel — desktop: side panel, mobile: bottom sheet */}
          {selectedDesk && (
            <DeskDetailsPanel desk={selectedDesk} onClose={handleClosePanel} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
