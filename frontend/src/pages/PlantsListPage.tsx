import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { plantsAPI, tagsAPI, eventsAPI } from "../services/api";
import { Plant, ViewMode, SortField, SortOrder } from "../types";
import { formatDate, getDaysSinceWatered } from "../utils/dateUtils";
import { getPlantPhotoUrl } from "../utils/constants";
import Dropdown from "../components/Dropdown";
import WateringCanIcon from "../components/WateringCanIcon";
import styles from "./PlantsListPage.module.css";

const PlantsListPage = () => {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [filteredPlants, setFilteredPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPurchasedFrom, setFilterPurchasedFrom] = useState<string>("all");
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    fetchPlants();
    fetchTags();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [plants, sortField, sortOrder, filterStatus, filterPurchasedFrom]);

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

  const applyFiltersAndSort = () => {
    let filtered = [...plants];

    // Apply filters
    if (filterStatus !== "all") {
      filtered = filtered.filter((plant) => plant.status === filterStatus);
    }
    if (filterPurchasedFrom !== "all") {
      filtered = filtered.filter(
        (plant) => plant.purchased_from === filterPurchasedFrom
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === "name") {
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
    if (!confirm("Are you sure you want to delete this plant?")) return;

    try {
      await plantsAPI.delete(id);
      setPlants(plants.filter((p) => p.id !== id));
    } catch (err) {
      alert("Failed to delete plant");
    }
  };

  const handleWaterPlant = async (e: React.MouseEvent, plantId: number) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const today = new Date().toISOString().split("T")[0];
      await eventsAPI.create({
        plant_id: plantId,
        event_type: "Watered",
        event_date: today,
      });

      // Update the plant's last_watered field locally
      setPlants(
        plants.map((p) =>
          p.id === plantId ? { ...p, last_watered: today } : p
        )
      );
    } catch (err) {
      alert("Failed to add watering event");
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
          <button
            className={`btn-icon ${viewMode === "list" ? "active" : ""}`}
            onClick={() => setViewMode("list")}
            title="List view"
          >
            ☰
          </button>
          <button
            className={`btn-icon ${viewMode === "card" ? "active" : ""}`}
            onClick={() => setViewMode("card")}
            title="Card view"
          >
            ▦
          </button>
        </div>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Status:</label>
            <Dropdown
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { value: "all", label: "All" },
                { value: "Alive", label: "Alive" },
                { value: "Dead", label: "Dead" },
                { value: "Binned", label: "Binned" },
                { value: "GaveAway", label: "Gave Away" },
              ]}
              placeholder=""
            />
          </div>

          <div className={styles.filterGroup}>
            <label>Purchased From:</label>
            <Dropdown
              value={filterPurchasedFrom}
              onChange={setFilterPurchasedFrom}
              options={[
                { value: "all", label: "All" },
                ...tags.map((tag) => ({ value: tag, label: tag })),
              ]}
              placeholder=""
            />
          </div>

          <div className={styles.filterGroup}>
            <label>Sort By:</label>
            <Dropdown
              value={sortField}
              onChange={(value) => setSortField(value as SortField)}
              options={[
                { value: "name", label: "Name" },
                { value: "purchased_when", label: "Purchase Date" },
                { value: "received_when", label: "Received Date" },
                { value: "last_watered", label: "Last Watered" },
              ]}
              placeholder=""
            />
          </div>

          <button
            className="btn-icon"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            title={sortOrder === "asc" ? "Sort descending" : "Sort ascending"}
          >
            {sortOrder === "asc" ? "↑" : "↓"}
          </button>
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
                <th>Purchased From</th>
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
        <span
          className={`${styles.statusBadge} ${styles["status" + plant.status]}`}
        >
          {plant.status}
        </span>
      </div>
      <div className={styles.plantCardContent}>
        <h3>{plant.name}</h3>
        <div className={styles.plantCardInfo}>
          {plant.last_watered ? (
            <div className={styles.lastWateredContainer}>
              <p className={styles.lastWatered}>
                💧 Last watered:
                {daysSinceWatered !== null && (
                  <span className={styles.daysAgo}>
                    {" "}
                    {daysSinceWatered} days ago
                  </span>
                )}
              </p>
              <button
                className={`btn-icon ${styles.waterBtn}`}
                onClick={(e) => plant.id && onWater(e, plant.id)}
                title="Water plant"
              >
                <WateringCanIcon />
              </button>
            </div>
          ) : (
            <div className={styles.lastWateredContainer}>
              <p className={`${styles.lastWatered} text-muted`}>
                💧 Not watered yet
              </p>
              <button
                className={`btn-icon ${styles.waterBtn}`}
                onClick={(e) => plant.id && onWater(e, plant.id)}
                title="Water plant"
              >
                <WateringCanIcon />
              </button>
            </div>
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
            {formatDate(plant.last_watered)}
            {daysSinceWatered !== null && (
              <span className="text-muted"> ({daysSinceWatered}d ago)</span>
            )}
          </>
        ) : (
          <span className="text-muted">Not watered yet</span>
        )}
      </td>
      <td>{plant.purchased_from || "-"}</td>
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
          🗑️
        </button>
      </td>
    </tr>
  );
};

export default PlantsListPage;
