import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { plantsAPI, tagsAPI } from "../services/api";
import { Plant, ViewMode, SortField, SortOrder } from "../types";
import { formatDate, getDaysSinceWatered } from "../utils/dateUtils";
import { getPlantPhotoUrl } from "../utils/constants";
import Dropdown from "../components/Dropdown";
import "./PlantsListPage.css";

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

  if (loading) return <div className="loading">Loading plants...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="container plants-list-page">
      <div className="page-header">
        <h2>My Plants</h2>
        <Link to="/plants/new" className="btn btn-primary">
          + Add Plant
        </Link>
      </div>

      <div className="controls">
        <div className="view-toggle">
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

        <div className="filters">
          <div className="filter-group">
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

          <div className="filter-group">
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

          <div className="filter-group">
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
        <div className="empty-state">
          <p>No plants found. Add your first plant to get started!</p>
        </div>
      ) : viewMode === "card" ? (
        <div className="plants-grid">
          {filteredPlants.map((plant) => (
            <PlantCard
              key={plant.id}
              plant={plant}
              onDelete={handleDeletePlant}
            />
          ))}
        </div>
      ) : (
        <div className="plants-table-container">
          <table className="plants-table">
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
  onDelete,
}: {
  plant: Plant;
  onDelete: (id: number) => void;
}) => {
  const daysSinceWatered = getDaysSinceWatered(plant.last_watered);
  const profilePhotoUrl = getPlantPhotoUrl(plant.profile_photo);

  return (
    <Link to={`/plants/${plant.id}`} className="plant-card card">
      <div className="plant-card-image">
        <img src={profilePhotoUrl} alt={plant.name} />
        <span className={`status-badge status-${plant.status?.toLowerCase()}`}>
          {plant.status}
        </span>
      </div>
      <div className="plant-card-content">
        <h3>{plant.name}</h3>
        <div className="plant-card-info">
          {plant.last_watered ? (
            <p className="last-watered">
              💧 Last watered: {formatDate(plant.last_watered)}
              {daysSinceWatered !== null && (
                <span className="days-ago"> ({daysSinceWatered} days ago)</span>
              )}
            </p>
          ) : (
            <p className="last-watered text-muted">💧 Not watered yet</p>
          )}
        </div>
      </div>
      <div className="plant-card-actions">
        <button
          className="btn-icon delete-btn"
          onClick={(e) => {
            e.preventDefault();
            if (plant.id) onDelete(plant.id);
          }}
        >
          🗑️
        </button>
      </div>
    </Link>
  );
};

const PlantRow = ({
  plant,
  onDelete,
}: {
  plant: Plant;
  onDelete: (id: number) => void;
}) => {
  const daysSinceWatered = getDaysSinceWatered(plant.last_watered);

  return (
    <tr>
      <td>
        <Link to={`/plants/${plant.id}`} className="plant-name-link">
          {plant.name}
        </Link>
      </td>
      <td>
        <span className={`status-badge status-${plant.status?.toLowerCase()}`}>
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
          className="btn-icon delete-btn"
          onClick={() => plant.id && onDelete(plant.id)}
        >
          🗑️
        </button>
      </td>
    </tr>
  );
};

export default PlantsListPage;
