import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { plantsAPI, tagsAPI, eventsAPI } from "../services/api";
import { Plant, ViewMode, SortField, SortOrder } from "../types";
import { getDaysSinceWatered } from "../utils/dateUtils";
import { getPlantPhotoUrl } from "../utils/constants";
import Dropdown from "../components/Dropdown";
import WateringCanIcon from "../components/WateringCanIcon";
import TrashIcon from "../components/TrashIcon";
import Modal from "../components/Modal";
import { useModal } from "../hooks/useModal";
import styles from "./PlantsListPage.module.css";

const PlantsListPage = () => {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [filteredPlants, setFilteredPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [filterField, setFilterField] = useState<string>("status");
  const [filterValue, setFilterValue] = useState<string>("Alive");
  const [tags, setTags] = useState<string[]>([]);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const { modalState, showAlert, showConfirm, closeModal } = useModal();

  useEffect(() => {
    fetchPlants();
    fetchTags();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [plants, sortField, sortOrder, filterField, filterValue]);

  const fetchPlants = async () => {
    try {
      const response = await plantsAPI.getAll();
      setPlants(response.data);
      setLoading(false);
    } catch (err) {
      setError("Failed to load plants");
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await tagsAPI.getAll("purchased_from");
      setTags(response.data.map((tag) => tag.tag_name));
    } catch (err) {
      console.error("Failed to load tags");
    }
  };

  const getFilterValueOptions = () => {
    if (filterField === "none") {
      return [{ value: "all", label: "Select a filter field first" }];
    }

    if (filterField === "status") {
      return [
        { value: "all", label: "All" },
        { value: "Alive", label: "Alive" },
        { value: "Dead", label: "Dead" },
        { value: "Binned", label: "Binned" },
        { value: "GaveAway", label: "Gave Away" },
      ];
    }

    if (filterField === "purchased_from") {
      return [
        { value: "all", label: "All" },
        ...tags.map((tag) => ({ value: tag, label: tag })),
      ];
    }

    return [{ value: "all", label: "All" }];
  };

  const applyFiltersAndSort = () => {
    let filtered = [...plants];

    // Apply filter
    if (filterField !== "none" && filterValue !== "all") {
      filtered = filtered.filter((plant) => {
        const plantValue = plant[filterField as keyof Plant];
        return plantValue === filterValue;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === "name" || sortField === "alias") {
        aValue = (aValue || "").toLowerCase();
        bValue = (bValue || "").toLowerCase();
      }

      if (!aValue) return 1;
      if (!bValue) return -1;

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredPlants(filtered);
  };

  const handleDeletePlant = async (id: number) => {
    showConfirm(
      "Are you sure you want to delete this plant?",
      async () => {
        try {
          await plantsAPI.delete(id);
          setPlants(plants.filter((p) => p.id !== id));
        } catch (err) {
          showAlert("Failed to delete plant", "Error");
        }
      },
      "Delete Plant"
    );
  };

  const handleWaterPlant = async (e: React.MouseEvent, plantId: number) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const today = new Date().toISOString().split("T")[0];

      // Check if already watered today
      const existingEvents = await eventsAPI.getByPlantId(plantId, "Water");
      const alreadyWateredToday = existingEvents.data.some(
        (event) => event.event_date === today
      );

      if (alreadyWateredToday) {
        showAlert(
          "This plant has already been watered today!",
          "Already Watered"
        );
        return;
      }

      await eventsAPI.create({
        plant_id: plantId,
        event_type: "Water",
        event_date: today,
      });

      // Refresh plants to get updated last_watered from backend
      await fetchPlants();
    } catch (err) {
      showAlert("Failed to add watering event", "Error");
    }
  };

  if (loading) return <div className="loading">Loading plants...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className={`container ${styles.plantsListPage}`}>
      <div className={styles.pageHeader}>
        <h2>My Plants</h2>
        <Link to="/plants/new" className="btn btn-primary">
          + Add Plant
        </Link>
      </div>

      <div className={styles.controls}>
        <div className={styles.viewToggle}>
          <div className={styles.toggleSwitch}>
            <button
              className={`${styles.toggleOption} ${
                viewMode === "list" ? styles.active : ""
              }`}
              onClick={() => setViewMode("list")}
              title="List view"
            >
              ☰
            </button>
            <button
              className={`${styles.toggleOption} ${
                viewMode === "card" ? styles.active : ""
              }`}
              onClick={() => setViewMode("card")}
              title="Card view"
            >
              ▦
            </button>
            <div
              className={`${styles.toggleSlider} ${
                viewMode === "card" ? styles.slideRight : ""
              }`}
            ></div>
          </div>
        </div>

        <button
          className={`btn-icon ${styles.filterToggle}`}
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          title="Toggle filters"
        >
          🔍 {filtersExpanded ? "▲" : "▼"}
        </button>

        <div
          className={`${styles.filters} ${
            filtersExpanded ? styles.filtersExpanded : ""
          }`}
        >
          <div className={styles.filterSection}>
            <label className={styles.sectionLabel}>Filter by:</label>
            <div className={styles.filterControls}>
              <Dropdown
                value={filterField}
                onChange={setFilterField}
                options={[
                  { value: "none", label: "No Filter" },
                  { value: "status", label: "Status" },
                  { value: "purchased_from", label: "Purchased From" },
                ]}
                placeholder=""
              />
              <Dropdown
                value={filterValue}
                onChange={setFilterValue}
                options={getFilterValueOptions()}
                placeholder=""
              />
            </div>
          </div>

          <div className={styles.sortSection}>
            <label className={styles.sectionLabel}>Sort by:</label>
            <div className={styles.sortControls}>
              <Dropdown
                value={sortField}
                onChange={(value) => setSortField(value as SortField)}
                options={[
                  { value: "name", label: "Name" },
                  { value: "alias", label: "Alias" },
                  { value: "purchased_when", label: "Purchase Date" },
                  { value: "received_when", label: "Received Date" },
                  { value: "last_watered", label: "Last Watered" },
                ]}
                placeholder=""
              />
              <button
                className="btn-icon"
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                title={
                  sortOrder === "asc" ? "Sort ascending" : "Sort descending"
                }
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {filteredPlants.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No plants found. Add your first plant to get started!</p>
        </div>
      ) : viewMode === "card" ? (
        <div className={styles.plantsGrid}>
          {filteredPlants.map((plant) => (
            <PlantCard
              key={plant.id}
              plant={plant}
              onWater={handleWaterPlant}
            />
          ))}
        </div>
      ) : (
        <div className={styles.plantsTableContainer}>
          <table className={styles.plantsTable}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Last Watered</th>
                <th>Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlants.map((plant) => (
                <PlantRow
                  key={plant.id}
                  plant={plant}
                  onDelete={handleDeletePlant}
                  onWater={handleWaterPlant}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        onConfirm={modalState.onConfirm}
        confirmText={modalState.type === "confirm" ? "Delete" : "OK"}
      />
    </div>
  );
};

const PlantCard = ({
  plant,
  onWater,
}: {
  plant: Plant;
  onWater: (e: React.MouseEvent, plantId: number) => void;
}) => {
  const daysSinceWatered = getDaysSinceWatered(plant.last_watered);
  const profilePhotoUrl = getPlantPhotoUrl(plant.profile_photo);

  return (
    <Link to={`/plants/${plant.id}`} className={`${styles.plantCard} card`}>
      <div className={styles.plantCardImage}>
        <img src={profilePhotoUrl} alt={plant.name} />
        <button
          className={`btn-icon ${styles.waterBtn}`}
          onClick={(e) => plant.id && onWater(e, plant.id)}
          title="Water plant"
        >
          <WateringCanIcon />
        </button>
      </div>
      <div className={styles.plantCardContent}>
        <h3>
          {plant.name}
          {plant.alias && (
            <span className={styles.plantAlias}> ({plant.alias})</span>
          )}
        </h3>
        <div className={styles.plantCardInfo}>
          {plant.last_watered ? (
            <p className={styles.lastWatered}>
              💧
              {daysSinceWatered !== null && (
                <span className={styles.daysAgo}>
                  {" "}
                  {daysSinceWatered} days ago
                </span>
              )}
            </p>
          ) : (
            <p className={`${styles.lastWatered} text-muted`}>
              💧 Not watered yet
            </p>
          )}
        </div>
      </div>
    </Link>
  );
};

const PlantRow = ({
  plant,
  onDelete,
  onWater,
}: {
  plant: Plant;
  onDelete: (id: number) => void;
  onWater: (e: React.MouseEvent, plantId: number) => void;
}) => {
  const daysSinceWatered = getDaysSinceWatered(plant.last_watered);

  return (
    <tr>
      <td>
        <Link to={`/plants/${plant.id}`} className={styles.plantNameLink}>
          {plant.name}
          {plant.alias && (
            <span className={styles.plantAlias}> ({plant.alias})</span>
          )}
        </Link>
      </td>
      <td>
        <span
          className={`${styles.statusBadge} ${styles["status" + plant.status]}`}
        >
          {plant.status}
        </span>
      </td>
      <td>
        {plant.last_watered ? (
          <>
            {daysSinceWatered !== null && (
              <span className="text-muted"> {daysSinceWatered} days ago</span>
            )}
          </>
        ) : (
          <span className="text-muted">Not watered yet</span>
        )}
      </td>
      <td>
        {plant.price || plant.delivery_fee
          ? `£${((plant.price || 0) + (plant.delivery_fee || 0)).toFixed(2)}`
          : "-"}
      </td>
      <td>
        <button
          className={`btn-icon ${styles.waterBtn}`}
          onClick={(e) => plant.id && onWater(e, plant.id)}
          title="Water plant"
        >
          <WateringCanIcon />
        </button>
        <button
          className={`btn-icon ${styles.deleteBtn}`}
          onClick={() => plant.id && onDelete(plant.id)}
          title="Delete plant"
        >
          <TrashIcon />
        </button>
      </td>
    </tr>
  );
};

export default PlantsListPage;
