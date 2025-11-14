import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DatePicker from "react-datepicker";
import { plantsAPI, uploadAPI, tagsAPI } from "../services/api";
import { Plant } from "../types";
import { toISODate } from "../utils/dateUtils";
import Dropdown from "../components/Dropdown";
import Modal from "../components/Modal";
import LoadingSpinner from "../components/LoadingSpinner";
import { useModal } from "../hooks/useModal";
import { useLoading } from "../contexts/LoadingContext";
import "react-datepicker/dist/react-datepicker.css";
import styles from "./AddPlantPage.module.css";

const AddPlantPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { isLoading, startLoading, stopLoading } = useLoading();

  const [formData, setFormData] = useState<Plant>({
    name: "",
    alias: "",
    price: undefined,
    delivery_fee: undefined,
    purchased_from: "",
    purchased_when: "",
    received_when: "",
    purchase_notes: "",
    status: "Alive",
    profile_photo: "",
  });

  const [purchasedWhenDate, setPurchasedWhenDate] = useState<Date | null>(null);
  const [receivedWhenDate, setReceivedWhenDate] = useState<Date | null>(null);
  const [uploading, setUploading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [numberErrors, setNumberErrors] = useState<{
    price?: string;
    delivery_fee?: string;
  }>({});
  const [nameError, setNameError] = useState<string>("");
  const [existingPlants, setExistingPlants] = useState<string[]>([]);
  const [originalPlantName, setOriginalPlantName] = useState<string>("");
  const { modalState, showAlert, closeModal } = useModal();

  useEffect(() => {
    fetchTags();
    fetchExistingPlantNames();
    if (isEdit && id) {
      fetchPlant(parseInt(id));
    }
  }, [id, isEdit]);

  const fetchPlant = async (plantId: number) => {
    startLoading();
    try {
      const response = await plantsAPI.getById(plantId);
      const plant = response.data;
      setFormData(plant);
      setOriginalPlantName(plant.name);
      if (plant.purchased_when) {
        setPurchasedWhenDate(new Date(plant.purchased_when));
      }
      if (plant.received_when) {
        setReceivedWhenDate(new Date(plant.received_when));
      }
      setLoading(false);
    } catch (err) {
      showAlert("Failed to load plant", "Error");
      navigate("/");
    } finally {
      stopLoading();
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

  const fetchExistingPlantNames = async () => {
    try {
      const response = await plantsAPI.getAll();
      setExistingPlants(response.data.map((plant) => plant.name.toLowerCase()));
    } catch (err) {
      console.error("Failed to load plant names");
    }
  };

  const validatePlantName = (name: string) => {
    if (!name.trim()) {
      setNameError("");
      return true;
    }

    const normalizedName = name.toLowerCase().trim();
    const originalNormalized = originalPlantName.toLowerCase().trim();

    // If editing and the name hasn't changed, it's valid
    if (isEdit && normalizedName === originalNormalized) {
      setNameError("");
      return true;
    }

    const isDuplicate = existingPlants.some(
      (existingName) => existingName === normalizedName
    );

    if (isDuplicate) {
      setNameError("A plant with this name already exists");
      return false;
    }

    setNameError("");
    return true;
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Validate plant name in real-time
    if (name === "name") {
      validatePlantName(value);
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Clear error for this field
    setNumberErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }));

    // If empty, set to undefined
    if (!value || value.trim() === "") {
      setFormData((prev) => ({
        ...prev,
        [name]: undefined,
      }));
      return;
    }

    // Validate that it's a valid number
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setNumberErrors((prev) => ({
        ...prev,
        [name]: "Please enter a valid number",
      }));
      setFormData((prev) => ({
        ...prev,
        [name]: undefined,
      }));
      return;
    }

    // Validate that it's not negative
    if (numValue < 0) {
      setNumberErrors((prev) => ({
        ...prev,
        [name]: "Value cannot be negative",
      }));
      setFormData((prev) => ({
        ...prev,
        [name]: undefined,
      }));
      return;
    }

    // Valid number, update form data
    setFormData((prev) => ({
      ...prev,
      [name]: numValue,
    }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!formData.name.trim()) {
      showAlert("Please enter a plant name before uploading photos", "Error");
      return;
    }

    setUploading(true);
    startLoading();
    try {
      const response = await uploadAPI.single(file, formData.name);
      setFormData((prev) => ({
        ...prev,
        profile_photo: response.data.path,
      }));
    } catch (err) {
      showAlert("Failed to upload photo", "Error");
    } finally {
      setUploading(false);
      stopLoading();
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim() || tags.includes(newTag.trim())) return;

    startLoading();
    try {
      await tagsAPI.create({
        tag_name: newTag.trim(),
        tag_type: "purchased_from",
      });
      setTags([...tags, newTag.trim()]);
      setFormData((prev) => ({ ...prev, purchased_from: newTag.trim() }));
      setNewTag("");
    } catch (err) {
      showAlert("Failed to add tag", "Error");
    } finally {
      stopLoading();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && e.target instanceof HTMLElement) {
      e.preventDefault();

      // Get all focusable elements in the form
      const form = e.currentTarget;
      const focusableElements = Array.from(
        form.querySelectorAll(
          "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])"
        )
      ) as HTMLElement[];

      // Find the current element's index
      const currentIndex = focusableElements.indexOf(e.target as HTMLElement);

      // Focus on the next element, if it exists
      if (currentIndex !== -1 && currentIndex < focusableElements.length - 1) {
        focusableElements[currentIndex + 1].focus();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if there are any number validation errors
    if (Object.values(numberErrors).some((error) => error)) {
      showAlert(
        "Please fix all validation errors before submitting",
        "Validation Error"
      );
      return;
    }

    // Validate plant name before submission
    if (!validatePlantName(formData.name)) {
      showAlert(
        "A plant with this name already exists. Please choose a different name.",
        "Duplicate Name"
      );
      return;
    }

    const plantData = {
      ...formData,
      purchased_when: purchasedWhenDate ? toISODate(purchasedWhenDate) : "",
      received_when: receivedWhenDate ? toISODate(receivedWhenDate) : "",
    };

    startLoading();
    try {
      if (isEdit && id) {
        await plantsAPI.update(parseInt(id), plantData);
      } else {
        await plantsAPI.create(plantData);
      }
      navigate("/");
    } catch (err: any) {
      // Handle 409 Conflict error for duplicate names
      if (err.response && err.response.status === 409) {
        showAlert(
          "A plant with this name already exists. Please choose a different name.",
          "Duplicate Name"
        );
        setNameError("A plant with this name already exists");
      } else {
        showAlert(`Failed to ${isEdit ? "update" : "create"} plant`, "Error");
      }
    } finally {
      stopLoading();
    }
  };

  if (loading)
    return <LoadingSpinner fullPage message="Loading plant details..." />;

  return (
    <>
      {uploading && <LoadingSpinner fullPage message="Uploading photos..." />}
      <div className={`container ${styles.addPlantPage}`}>
        <div>
          <h2>{isEdit ? "Edit Plant" : "Add New Plant"}</h2>
        </div>

        <form
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          className={styles.plantForm}
        >
          <div className={styles.formSection}>
            <h3>Basic Information</h3>

            <div className={styles.formGroup}>
              <label htmlFor="name">Plant Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                disabled={isLoading || uploading}
                className={nameError ? styles.inputError : ""}
              />
              {nameError && (
                <span className={styles.errorText}>{nameError}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="alias">Alias (Chinese name or nickname)</label>
              <input
                type="text"
                id="alias"
                name="alias"
                value={formData.alias || ""}
                onChange={handleInputChange}
                placeholder="e.g., 绿萝, Lucky Plant"
                disabled={isLoading || uploading}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="price">Price (£)</label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  step="0.01"
                  min="0"
                  value={formData.price || ""}
                  onChange={handleNumberChange}
                  disabled={isLoading || uploading}
                  className={numberErrors.price ? styles.inputError : ""}
                />
                {numberErrors.price && (
                  <span className={styles.errorText}>{numberErrors.price}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="delivery_fee">Delivery Fee (£)</label>
                <input
                  type="number"
                  id="delivery_fee"
                  name="delivery_fee"
                  step="0.01"
                  min="0"
                  value={formData.delivery_fee || ""}
                  onChange={handleNumberChange}
                  disabled={isLoading || uploading}
                  className={numberErrors.delivery_fee ? styles.inputError : ""}
                />
                {numberErrors.delivery_fee && (
                  <span className={styles.errorText}>
                    {numberErrors.delivery_fee}
                  </span>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="status">Status</label>
              <Dropdown
                value={formData.status || "Alive"}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, status: value }))
                }
                options={[
                  { value: "Alive", label: "Alive" },
                  { value: "Dead", label: "Dead" },
                  { value: "Binned", label: "Binned" },
                  { value: "GaveAway", label: "Gave Away" },
                ]}
                disabled={isLoading || uploading}
              />
            </div>
          </div>

          <div className={styles.formSection}>
            <h3>Purchase Information</h3>

            <div className={styles.formGroup}>
              <label htmlFor="purchased_from">Purchased From</label>
              <div className={styles.tagInputGroup}>
                <Dropdown
                  value={formData.purchased_from || ""}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, purchased_from: value }))
                  }
                  options={[
                    { value: "", label: "Select or add new" },
                    ...tags.map((tag) => ({ value: tag, label: tag })),
                  ]}
                  placeholder="Select or add new"
                  disabled={isLoading || uploading}
                />
                <div className={styles.newTagInput}>
                  <input
                    type="text"
                    placeholder="Add new tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && (e.preventDefault(), handleAddTag())
                    }
                    disabled={isLoading || uploading}
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="btn btn-secondary"
                    disabled={isLoading || uploading}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Purchased When</label>
                <DatePicker
                  selected={purchasedWhenDate}
                  onChange={(date) => setPurchasedWhenDate(date)}
                  dateFormat="dd, MMM yyyy"
                  placeholderText="Select date"
                  className={styles.datePicker}
                  disabled={isLoading || uploading}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Received When</label>
                <DatePicker
                  selected={receivedWhenDate}
                  onChange={(date) => setReceivedWhenDate(date)}
                  dateFormat="dd, MMM yyyy"
                  placeholderText="Select date"
                  className={styles.datePicker}
                  disabled={isLoading || uploading}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="purchase_notes">Purchase Notes</label>
              <textarea
                id="purchase_notes"
                name="purchase_notes"
                value={formData.purchase_notes || ""}
                onChange={handleInputChange}
                placeholder="e.g., 12cm pot, came with ceramic pot"
                rows={3}
                disabled={isLoading || uploading}
              />
            </div>
          </div>

          <div className={styles.formSection}>
            <h3>Profile Photo</h3>

            <div className={styles.formGroup}>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={isLoading || uploading}
              />
              {formData.profile_photo && (
                <div className={styles.photoPreview}>
                  <img src={formData.profile_photo} alt="Profile preview" />
                </div>
              )}
            </div>
          </div>

          <div className={styles.formActions}>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="btn btn-secondary"
              disabled={isLoading || uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || uploading}
            >
              {isEdit ? "Update Plant" : "Add Plant"}
            </button>
          </div>
        </form>

        <Modal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          title={modalState.title}
          message={modalState.message}
          type={modalState.type}
          onConfirm={modalState.onConfirm}
        />
      </div>
    </>
  );
};

export default AddPlantPage;
