import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DatePicker from "react-datepicker";
import { plantsAPI, uploadAPI, tagsAPI } from "../services/api";
import { Plant } from "../types";
import { parseDate, toISODate } from "../utils/dateUtils";
import "react-datepicker/dist/react-datepicker.css";
import "./AddPlantPage.css";

const AddPlantPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState<Plant>({
    name: "",
    price: undefined,
    delivery_fee: undefined,
    purchased_from: "",
    purchased_when: "",
    received_when: "",
    status: "Alive",
    profile_photo: "",
  });

  const [purchasedWhenDate, setPurchasedWhenDate] = useState<Date | null>(null);
  const [receivedWhenDate, setReceivedWhenDate] = useState<Date | null>(null);
  const [uploading, setUploading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    fetchTags();
    if (isEdit && id) {
      fetchPlant(parseInt(id));
    }
  }, [id, isEdit]);

  const fetchPlant = async (plantId: number) => {
    try {
      const response = await plantsAPI.getById(plantId);
      const plant = response.data;
      setFormData(plant);
      if (plant.purchased_when) {
        setPurchasedWhenDate(new Date(plant.purchased_when));
      }
      if (plant.received_when) {
        setReceivedWhenDate(new Date(plant.received_when));
      }
      setLoading(false);
    } catch (err) {
      alert("Failed to load plant");
      navigate("/");
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value ? parseFloat(value) : undefined,
    }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await uploadAPI.single(file);
      setFormData((prev) => ({
        ...prev,
        profile_photo: response.data.path,
      }));
    } catch (err) {
      alert("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim() || tags.includes(newTag.trim())) return;

    try {
      await tagsAPI.create({
        tag_name: newTag.trim(),
        tag_type: "purchased_from",
      });
      setTags([...tags, newTag.trim()]);
      setFormData((prev) => ({ ...prev, purchased_from: newTag.trim() }));
      setNewTag("");
    } catch (err) {
      alert("Failed to add tag");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const plantData = {
      ...formData,
      purchased_when: purchasedWhenDate ? toISODate(purchasedWhenDate) : "",
      received_when: receivedWhenDate ? toISODate(receivedWhenDate) : "",
    };

    try {
      if (isEdit && id) {
        await plantsAPI.update(parseInt(id), plantData);
      } else {
        await plantsAPI.create(plantData);
      }
      navigate("/");
    } catch (err) {
      alert(`Failed to ${isEdit ? "update" : "create"} plant`);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="container add-plant-page">
      <div className="page-header">
        <h2>{isEdit ? "Edit Plant" : "Add New Plant"}</h2>
      </div>

      <form onSubmit={handleSubmit} className="plant-form">
        <div className="form-section">
          <h3>Basic Information</h3>

          <div className="form-group">
            <label htmlFor="name">Plant Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="price">Price (£)</label>
              <input
                type="number"
                id="price"
                name="price"
                step="0.01"
                value={formData.price || ""}
                onChange={handleNumberChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="delivery_fee">Delivery Fee (£)</label>
              <input
                type="number"
                id="delivery_fee"
                name="delivery_fee"
                step="0.01"
                value={formData.delivery_fee || ""}
                onChange={handleNumberChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
            >
              <option value="Alive">Alive</option>
              <option value="Dead">Dead</option>
              <option value="Binned">Binned</option>
              <option value="GaveAway">Gave Away</option>
            </select>
          </div>
        </div>

        <div className="form-section">
          <h3>Purchase Information</h3>

          <div className="form-group">
            <label htmlFor="purchased_from">Purchased From</label>
            <div className="tag-input-group">
              <select
                id="purchased_from"
                name="purchased_from"
                value={formData.purchased_from}
                onChange={handleInputChange}
              >
                <option value="">Select or add new</option>
                {tags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
              <div className="new-tag-input">
                <input
                  type="text"
                  placeholder="Add new tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" && (e.preventDefault(), handleAddTag())
                  }
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="btn btn-secondary"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Purchased When</label>
              <DatePicker
                selected={purchasedWhenDate}
                onChange={(date) => setPurchasedWhenDate(date)}
                dateFormat="dd, MMM yyyy"
                placeholderText="Select date"
                className="date-picker"
              />
            </div>

            <div className="form-group">
              <label>Received When</label>
              <DatePicker
                selected={receivedWhenDate}
                onChange={(date) => setReceivedWhenDate(date)}
                dateFormat="dd, MMM yyyy"
                placeholderText="Select date"
                className="date-picker"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Profile Photo</h3>

          <div className="form-group">
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={uploading}
            />
            {uploading && <p>Uploading...</p>}
            {formData.profile_photo && (
              <div className="photo-preview">
                <img src={formData.profile_photo} alt="Profile preview" />
              </div>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {isEdit ? "Update Plant" : "Add Plant"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddPlantPage;
