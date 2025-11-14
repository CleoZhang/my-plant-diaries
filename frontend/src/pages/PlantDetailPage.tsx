import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Calendar from "react-calendar";
import {
  plantsAPI,
  eventsAPI,
  photosAPI,
  uploadAPI,
  eventTypesAPI,
} from "../services/api";
import { Plant, PlantEvent, PlantPhoto, EventType } from "../types";
import { formatDate, toISODate } from "../utils/dateUtils";
import { getPlantPhotoUrl } from "../utils/constants";
import "react-calendar/dist/Calendar.css";
import styles from "./PlantDetailPage.module.css";

const PlantDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [plant, setPlant] = useState<Plant | null>(null);
  const [events, setEvents] = useState<PlantEvent[]>([]);
  const [photos, setPhotos] = useState<PlantPhoto[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<string>("Water");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showInfoEdit, setShowInfoEdit] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [eventNotes, setEventNotes] = useState("");
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchPlantData(parseInt(id));
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchEvents(parseInt(id), selectedEventType);
    }
  }, [id, selectedEventType]);

  const fetchPlantData = async (plantId: number) => {
    try {
      const [plantRes, photosRes, eventTypesRes] = await Promise.all([
        plantsAPI.getById(plantId),
        photosAPI.getByPlantId(plantId),
        eventTypesAPI.getAll(),
      ]);

      setPlant(plantRes.data);
      setPhotos(photosRes.data);
      setEventTypes(eventTypesRes.data);
      setLoading(false);
    } catch (err) {
      alert("Failed to load plant data");
      navigate("/");
    }
  };

  const fetchEvents = async (plantId: number, eventType: string) => {
    try {
      const response = await eventsAPI.getByPlantId(plantId, eventType);
      setEvents(response.data);
    } catch (err) {
      console.error("Failed to load events");
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dateStr = toISODate(date);
    const existingEvent = events.find((e) => e.event_date === dateStr);

    if (existingEvent) {
      handleDeleteEvent(existingEvent.id!);
    } else {
      setShowAddEventModal(true);
    }
  };

  const handleAddEvent = async () => {
    if (!id) return;

    const newEvent: PlantEvent = {
      plant_id: parseInt(id),
      event_type: selectedEventType,
      event_date: toISODate(selectedDate),
      notes: eventNotes,
    };

    try {
      await eventsAPI.create(newEvent);
      fetchEvents(parseInt(id), selectedEventType);
      setShowAddEventModal(false);
      setEventNotes("");
    } catch (err) {
      alert("Failed to add event");
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!confirm("Delete this event?")) return;

    try {
      await eventsAPI.delete(eventId);
      if (id) fetchEvents(parseInt(id), selectedEventType);
    } catch (err) {
      alert("Failed to delete event");
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !id) return;

    setUploading(true);
    try {
      const filesArray = Array.from(files);
      const uploadRes = await uploadAPI.multiple(filesArray);

      const photoPromises = uploadRes.data.map((file) =>
        photosAPI.create({
          plant_id: parseInt(id),
          photo_path: file.path,
          taken_at: new Date().toISOString(),
        })
      );

      await Promise.all(photoPromises);
      const photosRes = await photosAPI.getByPlantId(parseInt(id));
      setPhotos(photosRes.data);
    } catch (err) {
      alert("Failed to upload photos");
    } finally {
      setUploading(false);
    }
  };

  const getEventDatesSet = () => {
    return new Set(events.map((e) => e.event_date));
  };

  const tileClassName = ({ date }: { date: Date }) => {
    const dateStr = toISODate(date);
    return getEventDatesSet().has(dateStr) ? "has-event" : "";
  };

  const getSelectedEventType = () => {
    return eventTypes.find((et) => et.name === selectedEventType);
  };

  if (loading || !plant) {
    return <div className="loading">Loading plant details...</div>;
  }

  return (
    <div className={`container ${styles.plantDetailPage}`}>
      <div className="page-header">
        <h2>{plant.name}</h2>
        <div className={styles.headerActions}>
          <Link to={`/plants/${id}/edit`} className="btn btn-secondary">
            Edit Plant
          </Link>
          <button onClick={() => navigate("/")} className="btn btn-secondary">
            Back to List
          </button>
        </div>
      </div>

      <div className={styles.plantDetailLayout}>
        <div className={styles.plantInfoSection}>
          <div className={styles.plantProfile}>
            <div className={styles.profilePhoto}>
              <img
                src={getPlantPhotoUrl(plant.profile_photo)}
                alt={plant.name}
              />
            </div>
            <div className={styles.plantStatus}>
              <span
                className={`status-badge status-${plant.status?.toLowerCase()}`}
              >
                {plant.status}
              </span>
            </div>
          </div>

          <details className={styles.plantInfoDetails} open>
            <summary>
              <h3>Plant Information</h3>
            </summary>
            <div className={styles.infoContent}>
              <div className={styles.infoRow}>
                <strong>Name:</strong>
                <span>{plant.name}</span>
              </div>
              {plant.price && (
                <div className={styles.infoRow}>
                  <strong>Price:</strong>
                  <span>£{plant.price.toFixed(2)}</span>
                </div>
              )}
              {plant.delivery_fee && (
                <div className={styles.infoRow}>
                  <strong>Delivery Fee:</strong>
                  <span>£{plant.delivery_fee.toFixed(2)}</span>
                </div>
              )}
              {plant.purchased_from && (
                <div className={styles.infoRow}>
                  <strong>Purchased From:</strong>
                  <span>{plant.purchased_from}</span>
                </div>
              )}
              {plant.purchased_when && (
                <div className={styles.infoRow}>
                  <strong>Purchased When:</strong>
                  <span>{formatDate(plant.purchased_when)}</span>
                </div>
              )}
              {plant.received_when && (
                <div className={styles.infoRow}>
                  <strong>Received When:</strong>
                  <span>{formatDate(plant.received_when)}</span>
                </div>
              )}
              {plant.last_watered && (
                <div className={styles.infoRow}>
                  <strong>Last Watered:</strong>
                  <span>{formatDate(plant.last_watered)}</span>
                </div>
              )}
            </div>
          </details>

          <div className={styles.photoGallerySection}>
            <div className={styles.sectionHeader}>
              <h3>Photo Gallery</h3>
              <button
                onClick={() => setShowPhotoGallery(!showPhotoGallery)}
                className="btn btn-secondary"
              >
                {showPhotoGallery ? "Hide" : "Show"} Gallery
              </button>
            </div>

            {showPhotoGallery && (
              <>
                <div className={styles.photoUpload}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    disabled={uploading}
                  />
                  {uploading && <p>Uploading photos...</p>}
                </div>

                <div className={styles.photoGrid}>
                  {photos.map((photo) => (
                    <div key={photo.id} className={styles.photoItem}>
                      <img
                        src={photo.photo_path}
                        alt={photo.caption || "Plant photo"}
                      />
                      {photo.caption && (
                        <p className={styles.photoCaption}>{photo.caption}</p>
                      )}
                      {photo.taken_at && (
                        <p className={styles.photoDate}>
                          {formatDate(photo.taken_at)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {photos.length === 0 && (
                  <p className="text-muted">
                    No photos yet. Upload some to track your plant's growth!
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div className={styles.eventsSection}>
          <h3>Plant Events</h3>

          <div className={styles.eventTypeSelector}>
            {eventTypes.map((eventType) => (
              <button
                key={eventType.id}
                className={`${styles.eventTypeBtn} ${
                  selectedEventType === eventType.name ? styles.active : ""
                }`}
                onClick={() => setSelectedEventType(eventType.name)}
              >
                <span className="emoji">{eventType.emoji}</span>
                <span className="name">{eventType.name}</span>
              </button>
            ))}
          </div>

          <div className={styles.calendarContainer}>
            <div className={styles.calendarHeader}>
              <h4>
                {getSelectedEventType()?.emoji} {selectedEventType} Calendar
              </h4>
              <p className={styles.calendarHint}>
                Click a date to add or remove an event
              </p>
            </div>

            <Calendar
              onChange={() => {}}
              onClickDay={handleDateClick}
              value={selectedDate}
              tileClassName={tileClassName}
              className={styles.reactCalendar}
            />

            <div className={styles.eventsList}>
              <h4>Recent {selectedEventType} Events</h4>
              {events.length === 0 ? (
                <p className="text-muted">
                  No {selectedEventType.toLowerCase()} events yet
                </p>
              ) : (
                <ul>
                  {events.slice(0, 5).map((event) => (
                    <li key={event.id}>
                      <div className={styles.eventItem}>
                        <span className={styles.eventDate}>
                          {formatDate(event.event_date)}
                        </span>
                        {event.notes && (
                          <span className={styles.eventNotes}>
                            {event.notes}
                          </span>
                        )}
                        <button
                          className="btn-icon"
                          onClick={() => handleDeleteEvent(event.id!)}
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAddEventModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowAddEventModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Add {selectedEventType} Event</h3>
            <p>Date: {formatDate(toISODate(selectedDate))}</p>

            <div className={styles.formGroup}>
              <label>Notes (optional)</label>
              <textarea
                value={eventNotes}
                onChange={(e) => setEventNotes(e.target.value)}
                placeholder="Add any notes about this event..."
                rows={3}
              />
            </div>

            <div className={styles.modalActions}>
              <button
                onClick={() => setShowAddEventModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button onClick={handleAddEvent} className="btn btn-primary">
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlantDetailPage;
