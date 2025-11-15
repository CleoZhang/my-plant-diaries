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
import Modal from "../components/Modal";
import TrashIcon from "../components/TrashIcon";
import EditIcon from "../components/EditIcon";
import LoadingSpinner from "../components/LoadingSpinner";
import Dropdown from "../components/Dropdown";
import { useModal } from "../hooks/useModal";
import { useLoading } from "../contexts/LoadingContext";
import "react-calendar/dist/Calendar.css";
import styles from "./PlantDetailPage.module.css";

const PlantDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [plant, setPlant] = useState<Plant | null>(null);
  const [events, setEvents] = useState<PlantEvent[]>([]);
  const [allEvents, setAllEvents] = useState<PlantEvent[]>([]);
  const [photos, setPhotos] = useState<PlantPhoto[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<string>("Water");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [eventNotes, setEventNotes] = useState("");
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingPhotoId, setEditingPhotoId] = useState<number | null>(null);
  const [editingPhotoDate, setEditingPhotoDate] = useState<string>("");
  const [showMobilePlantInfoModal, setShowMobilePlantInfoModal] =
    useState(false);
  const [showMobilePhotoGalleryModal, setShowMobilePhotoGalleryModal] =
    useState(false);
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("past3months");
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isClosingViewer, setIsClosingViewer] = useState(false);
  const { modalState, showAlert, showConfirm, closeModal } = useModal();
  const { isLoading, startLoading, stopLoading } = useLoading();

  useEffect(() => {
    if (id) {
      fetchPlantData(parseInt(id));
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      if (selectedEventType === "All events") {
        fetchAllEvents(parseInt(id));
      } else {
        fetchEvents(parseInt(id), selectedEventType);
      }
    }
  }, [id, selectedEventType]);

  const fetchPlantData = async (plantId: number) => {
    startLoading();
    try {
      const [plantRes, photosRes, eventTypesRes] = await Promise.all([
        plantsAPI.getById(plantId),
        photosAPI.getByPlantId(plantId),
        eventTypesAPI.getAll(),
      ]);

      setPlant(plantRes.data);
      // Sort photos by taken_at date (newest first)
      const sortedPhotos = [...photosRes.data].sort((a, b) => {
        if (!a.taken_at) return 1;
        if (!b.taken_at) return -1;
        return new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime();
      });
      setPhotos(sortedPhotos);
      setEventTypes(eventTypesRes.data);
      setLoading(false);
    } catch (err) {
      showAlert("Failed to load plant data", "Error");
      navigate("/");
    } finally {
      stopLoading();
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

  const fetchAllEvents = async (plantId: number) => {
    try {
      const response = await eventsAPI.getByPlantId(plantId);
      setAllEvents(response.data);
      setEvents(response.data);
    } catch (err) {
      console.error("Failed to load all events");
    }
  };

  const handleDateClick = (date: Date) => {
    if (selectedEventType === "All events") {
      return; // Don't allow adding/removing events in "All events" view
    }

    setSelectedDate(date);
    const dateStr = toISODate(date);
    const existingEvent = events.find(
      (e) => e.event_date === dateStr && e.event_type === selectedEventType
    );

    if (existingEvent) {
      handleDeleteEvent(existingEvent.id!);
    } else {
      setShowAddEventModal(true);
    }
  };

  const handleAddEvent = async () => {
    if (!id) return;

    const dateStr = toISODate(selectedDate);
    const existingEvent = events.find(
      (e) => e.event_date === dateStr && e.event_type === selectedEventType
    );

    if (existingEvent) {
      showAlert(
        `A ${selectedEventType} event already exists on this date.`,
        "Event Exists"
      );
      return;
    }

    const newEvent: PlantEvent = {
      plant_id: parseInt(id),
      event_type: selectedEventType,
      event_date: toISODate(selectedDate),
      notes: eventNotes,
    };

    startLoading();
    try {
      await eventsAPI.create(newEvent);
      fetchEvents(parseInt(id), selectedEventType);
      setShowAddEventModal(false);
      setEventNotes("");
    } catch (err) {
      showAlert("Failed to add event", "Error");
    } finally {
      stopLoading();
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    showConfirm(
      "Delete this event?",
      async () => {
        startLoading();
        try {
          await eventsAPI.delete(eventId);
          if (id) fetchEvents(parseInt(id), selectedEventType);
        } catch (err) {
          showAlert("Failed to delete event", "Error");
        } finally {
          stopLoading();
        }
      },
      "Delete Event"
    );
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !id || !plant) return;

    setUploading(true);
    startLoading();
    try {
      const filesArray = Array.from(files);
      const uploadRes = await uploadAPI.multiple(filesArray, plant.name);

      const photoPromises = uploadRes.data.map((file: any) =>
        photosAPI.create({
          plant_id: parseInt(id),
          photo_path: file.path,
          taken_at: file.takenAt || new Date().toISOString(),
        })
      );

      await Promise.all(photoPromises);
      const photosRes = await photosAPI.getByPlantId(parseInt(id));
      // Sort photos by taken_at date (newest first)
      const sortedPhotos = [...photosRes.data].sort((a, b) => {
        if (!a.taken_at) return 1;
        if (!b.taken_at) return -1;
        return new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime();
      });
      setPhotos(sortedPhotos);
    } catch (err) {
      showAlert("Failed to upload photos", "Error");
    } finally {
      setUploading(false);
      stopLoading();
    }
  };

  const handleEditPhotoDate = (photoId: number, currentDate: string) => {
    setEditingPhotoId(photoId);
    setEditingPhotoDate(currentDate ? currentDate.split("T")[0] : "");
  };

  const handleSavePhotoDate = async (photoId: number) => {
    if (!editingPhotoDate) return;

    startLoading();
    try {
      await photosAPI.update(photoId, {
        taken_at: new Date(editingPhotoDate).toISOString(),
      });

      if (id) {
        const photosRes = await photosAPI.getByPlantId(parseInt(id));
        // Sort photos by taken_at date (newest first)
        const sortedPhotos = [...photosRes.data].sort((a, b) => {
          if (!a.taken_at) return 1;
          if (!b.taken_at) return -1;
          return (
            new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime()
          );
        });
        setPhotos(sortedPhotos);
      }

      setEditingPhotoId(null);
      setEditingPhotoDate("");
    } catch (err) {
      showAlert("Failed to update photo date", "Error");
    } finally {
      stopLoading();
    }
  };

  const handleCancelEditPhotoDate = () => {
    setEditingPhotoId(null);
    setEditingPhotoDate("");
  };

  const handleDeletePhoto = async (photoId: number) => {
    showConfirm(
      "Are you sure you want to delete this photo? This action cannot be undone.",
      async () => {
        startLoading();
        try {
          await photosAPI.delete(photoId);
          if (id) {
            const photosRes = await photosAPI.getByPlantId(parseInt(id));
            const sortedPhotos = [...photosRes.data].sort((a, b) => {
              if (!a.taken_at) return 1;
              if (!b.taken_at) return -1;
              return (
                new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime()
              );
            });
            setPhotos(sortedPhotos);

            // If we deleted the current photo in viewer and it was the last one, close viewer
            if (sortedPhotos.length === 0 && showPhotoViewer) {
              setShowPhotoViewer(false);
            }
            // If we deleted the current photo in viewer, adjust index
            else if (
              showPhotoViewer &&
              currentPhotoIndex >= sortedPhotos.length
            ) {
              setCurrentPhotoIndex(sortedPhotos.length - 1);
            }
          }
        } catch (err) {
          showAlert("Failed to delete photo", "Error");
        } finally {
          stopLoading();
        }
      },
      "Delete Photo"
    );
  };

  const handlePhotoClick = (index: number) => {
    if (isClosingViewer) return;
    setCurrentPhotoIndex(index);
    setShowPhotoViewer(true);
  };

  const handleClosePhotoViewer = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setIsClosingViewer(true);
    setShowPhotoViewer(false);
    setEditingPhotoId(null);
    setEditingPhotoDate("");
    setTimeout(() => {
      setIsClosingViewer(false);
    }, 300);
  };

  const handlePreviousPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    setEditingPhotoId(null);
    setEditingPhotoDate("");
  };

  const handleNextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    setEditingPhotoId(null);
    setEditingPhotoDate("");
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentPhotoIndex(index);
    setEditingPhotoId(null);
    setEditingPhotoDate("");
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && photos.length > 1) {
      handleNextPhoto();
    }
    if (isRightSwipe && photos.length > 1) {
      handlePreviousPhoto();
    }
  };

  const handleDeletePlant = async () => {
    if (!id) return;

    showConfirm(
      "Are you sure you want to delete this plant? This action cannot be undone.",
      async () => {
        startLoading();
        try {
          await plantsAPI.delete(parseInt(id));
          navigate("/");
        } catch (err) {
          showAlert("Failed to delete plant", "Error");
        } finally {
          stopLoading();
        }
      },
      "Delete Plant"
    );
  };

  const getValidEvents = (eventsList: PlantEvent[]) => {
    return eventsList.filter((event) =>
      eventTypes.some((et) => et.name === event.event_type)
    );
  };

  const getEventDatesSet = () => {
    return new Set(events.map((e) => e.event_date));
  };

  const tileClassName = ({ date }: { date: Date }) => {
    const dateStr = toISODate(date);
    if (selectedEventType === "All events") {
      const validEvents = getValidEvents(allEvents);
      return validEvents.some((e) => e.event_date === dateStr)
        ? "has-event"
        : "";
    }
    return events.some(
      (e) => e.event_date === dateStr && e.event_type === selectedEventType
    )
      ? "has-event"
      : "";
  };

  const tileContent = ({ date }: { date: Date }) => {
    const dateStr = toISODate(date);

    if (selectedEventType === "All events") {
      const validEvents = getValidEvents(allEvents);
      const dayEvents = validEvents.filter((e) => e.event_date === dateStr);
      if (dayEvents.length > 0) {
        const emojis = dayEvents.map((event) => {
          const eventType = eventTypes.find(
            (et) => et.name === event.event_type
          );
          return eventType!.emoji; // We know it exists due to getValidEvents filter
        });

        return <span className={styles.tileEmoji}>{emojis.join("")}</span>;
      }
    } else if (getEventDatesSet().has(dateStr)) {
      const eventType = getSelectedEventType();
      return <span className={styles.tileEmoji}>{eventType?.emoji}</span>;
    }
    return null;
  };

  const getSelectedEventType = () => {
    return eventTypes.find((et) => et.name === selectedEventType);
  };

  const getFilteredEventsByDateRange = (eventsList: PlantEvent[]) => {
    const today = new Date();
    const cutoffDate = new Date();

    switch (dateRangeFilter) {
      case "past1month":
        cutoffDate.setMonth(today.getMonth() - 1);
        break;
      case "past3months":
        cutoffDate.setMonth(today.getMonth() - 3);
        break;
      case "past6months":
        cutoffDate.setMonth(today.getMonth() - 6);
        break;
      case "past1year":
        cutoffDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        cutoffDate.setMonth(today.getMonth() - 3);
    }

    return eventsList.filter((event) => {
      const eventDate = new Date(event.event_date);
      return eventDate >= cutoffDate;
    });
  };

  if (loading || !plant) {
    return <LoadingSpinner fullPage message="Loading plant details..." />;
  }

  return (
    <>
      {uploading && <LoadingSpinner fullPage message="Uploading photos..." />}
      <div className={`container ${styles.plantDetailPage}`}>
        <div className="page-header">
          <h2>
            {plant.name}
            {plant.alias && (
              <div className={styles.plantAlias}> {plant.alias}</div>
            )}
          </h2>
          <button
            onClick={() => navigate("/")}
            className="btn btn-secondary"
            disabled={isLoading || uploading}
          >
            ←<span className={styles.backText}> Back to List</span>
          </button>
        </div>

        {/* Mobile-only header */}
        <div className={styles.mobileHeader}>
          <button
            className={styles.mobileActionBtn}
            onClick={() => setShowMobilePlantInfoModal(true)}
            disabled={isLoading || uploading}
          >
            <span className={styles.actionIcon}>📋</span>
            <span className={styles.actionLabel}>Plant Info</span>
          </button>
          <button
            className={styles.mobileActionBtn}
            onClick={() => setShowMobilePhotoGalleryModal(true)}
            disabled={isLoading || uploading}
          >
            <span className={styles.actionIcon}>📷</span>
            <span className={styles.actionLabel}>Gallery</span>
          </button>
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
                <Link
                  to={`/plants/${id}/edit`}
                  className={styles.editPlantLink}
                  title="Edit Plant"
                >
                  <EditIcon />
                </Link>
              </summary>
              <div className={styles.infoContent}>
                <div className={styles.infoRow}>
                  <strong>Name:</strong>
                  <span>{plant.name}</span>
                </div>
                {plant.alias && (
                  <div className={styles.infoRow}>
                    <strong>Alias:</strong>
                    <span>{plant.alias}</span>
                  </div>
                )}
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
                {plant.purchase_notes && (
                  <div className={styles.infoRow}>
                    <strong>Purchase Notes:</strong>
                    <span>{plant.purchase_notes}</span>
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
                  disabled={isLoading || uploading}
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
                      disabled={isLoading || uploading}
                    />
                  </div>

                  <div className={styles.photoGrid}>
                    {photos.map((photo, index) => (
                      <div key={photo.id} className={styles.photoItem}>
                        <div className={styles.photoImageContainer}>
                          <img
                            src={photo.photo_path}
                            alt={photo.caption || "Plant photo"}
                            onClick={() => handlePhotoClick(index)}
                            style={{ cursor: "pointer" }}
                          />
                          <button
                            className={styles.deletePhotoBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePhoto(photo.id!);
                            }}
                            title="Delete photo"
                            disabled={isLoading || uploading}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                        {photo.caption && (
                          <p className={styles.photoCaption}>{photo.caption}</p>
                        )}
                        {photo.taken_at && (
                          <div className={styles.photoDate}>
                            {editingPhotoId === photo.id ? (
                              <div className={styles.dateEditor}>
                                <input
                                  type="date"
                                  value={editingPhotoDate}
                                  onChange={(e) =>
                                    setEditingPhotoDate(e.target.value)
                                  }
                                />
                                <button
                                  onClick={() => handleSavePhotoDate(photo.id!)}
                                  disabled={isLoading}
                                >
                                  Save
                                </button>
                                <button
                                  onClick={handleCancelEditPhotoDate}
                                  disabled={isLoading}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className={styles.dateDisplay}>
                                <span>{formatDate(photo.taken_at)}</span>
                                <button
                                  className={styles.editDateBtn}
                                  onClick={() =>
                                    handleEditPhotoDate(
                                      photo.id!,
                                      photo.taken_at!
                                    )
                                  }
                                  title="Edit date"
                                  disabled={isLoading || uploading}
                                >
                                  <EditIcon />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {photos.length === 0 && (
                    <p className={styles.emptyMessage}>
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
              {[...eventTypes]
                .sort((a, b) => {
                  // Water first, Other last, others in between
                  if (a.name === "Water") return -1;
                  if (b.name === "Water") return 1;
                  if (a.name === "Other") return 1;
                  if (b.name === "Other") return -1;
                  return 0;
                })
                .map((eventType) => (
                  <button
                    key={eventType.id}
                    className={`${styles.eventTypeBtn} ${
                      selectedEventType === eventType.name ? styles.active : ""
                    }`}
                    onClick={() => setSelectedEventType(eventType.name)}
                    disabled={isLoading || uploading}
                  >
                    <span className="emoji">{eventType.emoji}</span>
                    <span className={styles.eventTypeName}>
                      {eventType.name}
                    </span>
                  </button>
                ))}
              <button
                key="all-events"
                className={`${styles.eventTypeBtn} ${
                  selectedEventType === "All events" ? styles.active : ""
                }`}
                onClick={() => setSelectedEventType("All events")}
                disabled={isLoading || uploading}
              >
                <span className="emoji">📅</span>
                <span className={styles.eventTypeName}>All events</span>
              </button>
            </div>

            <div className={styles.calendarContainer}>
              <div className={styles.calendarHeader}>
                <h4>
                  {selectedEventType === "All events"
                    ? "📅 All events Calendar"
                    : `${
                        getSelectedEventType()?.emoji
                      } ${selectedEventType} Calendar`}
                </h4>
                <p className={styles.calendarHint}>
                  {selectedEventType === "All events"
                    ? "Viewing all events"
                    : "Click a date to add or remove an event"}
                </p>
              </div>

              <Calendar
                onChange={() => {}}
                onClickDay={handleDateClick}
                value={selectedDate}
                tileClassName={tileClassName}
                tileContent={tileContent}
                className={styles.reactCalendar}
              />

              <div className={styles.eventsList}>
                <div className={styles.eventsListHeader}>
                  <h4>
                    {selectedEventType === "All events"
                      ? ""
                      : selectedEventType}{" "}
                    Events List
                  </h4>
                  <Dropdown
                    value={dateRangeFilter}
                    onChange={setDateRangeFilter}
                    options={[
                      { value: "past1month", label: "Past 1 Month" },
                      { value: "past3months", label: "Past 3 Months" },
                      { value: "past6months", label: "Past 6 Months" },
                      { value: "past1year", label: "Past 1 Year" },
                    ]}
                    className={styles.dateRangeFilter}
                    disabled={isLoading || uploading}
                  />
                </div>
                {(() => {
                  const validEvents = getValidEvents(events);
                  const filteredEvents =
                    getFilteredEventsByDateRange(validEvents);
                  return filteredEvents.length === 0 ? (
                    <p className="text-muted">
                      No{" "}
                      {selectedEventType === "All events"
                        ? ""
                        : selectedEventType.toLowerCase()}{" "}
                      events in selected date range
                    </p>
                  ) : (
                    <div className={styles.eventsListScroll}>
                      <ul>
                        {filteredEvents.map((event) => {
                          const eventTypeObj = eventTypes.find(
                            (et) => et.name === event.event_type
                          );
                          return (
                            <li key={event.id}>
                              <div className={styles.eventItem}>
                                {selectedEventType === "All events" &&
                                  eventTypeObj && (
                                    <span className={styles.eventTypeEmoji}>
                                      {eventTypeObj.emoji}
                                    </span>
                                  )}
                                <span className={styles.eventDate}>
                                  {formatDate(event.event_date)}
                                </span>
                                {event.notes && (
                                  <span className={styles.eventNotes}>
                                    {event.notes}
                                  </span>
                                )}
                                {selectedEventType !== "All events" && (
                                  <button
                                    className="btn-icon"
                                    onClick={() => handleDeleteEvent(event.id!)}
                                    disabled={isLoading || uploading}
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })()}
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
                {/* <label>Notes (optional)</label> */}
                <textarea
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  placeholder="Add any notes about this event..."
                  rows={3}
                  disabled={isLoading}
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  onClick={() => setShowAddEventModal(false)}
                  className="btn btn-secondary"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEvent}
                  className="btn btn-primary"
                  disabled={isLoading}
                >
                  Add Event
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Plant Info Modal */}
        {showMobilePlantInfoModal && (
          <div
            className={styles.modalOverlay}
            onClick={() => setShowMobilePlantInfoModal(false)}
          >
            <div
              className={styles.mobileModal}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <div className={styles.modalHeaderLeft}>
                  <h3>Plant Information</h3>
                  <Link
                    to={`/plants/${id}/edit`}
                    className={styles.editPlantLinkModal}
                    title="Edit Plant"
                  >
                    <EditIcon size={20} />
                  </Link>
                </div>
                <button
                  className={styles.closeModalBtn}
                  onClick={() => setShowMobilePlantInfoModal(false)}
                >
                  ×
                </button>
              </div>
              <div className={styles.infoContent}>
                <div className={styles.mobileModalProfilePhoto}>
                  <img
                    src={getPlantPhotoUrl(plant.profile_photo)}
                    alt={plant.name}
                  />
                </div>
                <div className={styles.infoRow}>
                  <strong>Status:</strong>
                  <span
                    className={`status-badge status-${plant.status?.toLowerCase()}`}
                  >
                    {plant.status}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <strong>Name:</strong>
                  <span>{plant.name}</span>
                </div>
                {plant.alias && (
                  <div className={styles.infoRow}>
                    <strong>Alias:</strong>
                    <span>{plant.alias}</span>
                  </div>
                )}
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
                {plant.purchase_notes && (
                  <div className={styles.infoRow}>
                    <strong>Purchase Notes:</strong>
                    <span>{plant.purchase_notes}</span>
                  </div>
                )}
                {plant.last_watered && (
                  <div className={styles.infoRow}>
                    <strong>Last Watered:</strong>
                    <span>{formatDate(plant.last_watered)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Photo Gallery Modal */}
        {showMobilePhotoGalleryModal && (
          <div
            className={styles.modalOverlay}
            onClick={() => setShowMobilePhotoGalleryModal(false)}
          >
            <div
              className={styles.mobileModal}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3>Photo Gallery</h3>
                <button
                  className={styles.closeModalBtn}
                  onClick={() => setShowMobilePhotoGalleryModal(false)}
                  disabled={isLoading || uploading}
                >
                  ×
                </button>
              </div>
              <div className={styles.photoUpload}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  disabled={isLoading || uploading}
                />
              </div>

              <div className={styles.photoGrid}>
                {photos.map((photo, index) => (
                  <div key={photo.id} className={styles.photoItem}>
                    <div className={styles.photoImageContainer}>
                      <img
                        src={photo.photo_path}
                        alt={photo.caption || "Plant photo"}
                        onClick={() => handlePhotoClick(index)}
                        style={{ cursor: "pointer" }}
                      />
                      <button
                        className={styles.deletePhotoBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePhoto(photo.id!);
                        }}
                        title="Delete photo"
                        disabled={isLoading || uploading}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                    {photo.caption && (
                      <p className={styles.photoCaption}>{photo.caption}</p>
                    )}
                    {photo.taken_at && (
                      <div className={styles.photoDate}>
                        {editingPhotoId === photo.id ? (
                          <div className={styles.dateEditor}>
                            <input
                              type="date"
                              value={editingPhotoDate}
                              onChange={(e) =>
                                setEditingPhotoDate(e.target.value)
                              }
                            />
                            <button
                              onClick={() => handleSavePhotoDate(photo.id!)}
                              disabled={isLoading}
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEditPhotoDate}
                              disabled={isLoading}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className={styles.dateDisplay}>
                            <span>{formatDate(photo.taken_at)}</span>
                            <button
                              className={styles.editDateBtn}
                              onClick={() =>
                                handleEditPhotoDate(photo.id!, photo.taken_at!)
                              }
                              title="Edit date"
                              disabled={isLoading || uploading}
                            >
                              <EditIcon />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {photos.length === 0 && (
                <p className={styles.emptyMessage}>
                  No photos yet. Upload some to track your plant's growth!
                </p>
              )}
            </div>
          </div>
        )}

        <div className={styles.deleteSection}>
          <button
            onClick={handleDeletePlant}
            className="btn btn-danger"
            title="Delete plant"
            disabled={isLoading || uploading}
          >
            <TrashIcon /> Delete Plant
          </button>
        </div>

        {/* Photo Viewer Modal */}
        {showPhotoViewer && photos.length > 0 && (
          <div
            className={styles.photoViewerOverlay}
            onClick={(e) => handleClosePhotoViewer(e)}
            onTouchEnd={(e) => handleClosePhotoViewer(e)}
          >
            <div
              className={styles.photoViewerModal}
              onClick={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <button
                className={styles.closeViewerBtn}
                onClick={(e) => handleClosePhotoViewer(e)}
              >
                ×
              </button>

              <button
                className={styles.deleteViewerPhotoBtn}
                onClick={() => handleDeletePhoto(photos[currentPhotoIndex].id!)}
                title="Delete photo"
                disabled={isLoading || uploading}
              >
                <TrashIcon />
              </button>

              <button
                className={styles.prevPhotoBtn}
                onClick={handlePreviousPhoto}
                disabled={photos.length <= 1}
              >
                ‹
              </button>

              <button
                className={styles.nextPhotoBtn}
                onClick={handleNextPhoto}
                disabled={photos.length <= 1}
              >
                ›
              </button>

              <div className={styles.photoViewerContent}>
                <div
                  className={styles.mainPhotoContainer}
                  onClick={(e) => handleClosePhotoViewer(e)}
                  onTouchEnd={(e) => {
                    if (e.target === e.currentTarget) {
                      handleClosePhotoViewer(e);
                    }
                  }}
                >
                  <div
                    className={styles.photoContentWrapper}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img
                      src={photos[currentPhotoIndex].photo_path}
                      alt={photos[currentPhotoIndex].caption || "Plant photo"}
                      className={styles.mainPhoto}
                    />
                    {photos[currentPhotoIndex].caption && (
                      <p className={styles.viewerCaption}>
                        {photos[currentPhotoIndex].caption}
                      </p>
                    )}
                    {photos[currentPhotoIndex].taken_at && (
                      <div className={styles.viewerPhotoDate}>
                        {editingPhotoId === photos[currentPhotoIndex].id ? (
                          <div className={styles.viewerDateEditor}>
                            <input
                              type="date"
                              value={editingPhotoDate}
                              onChange={(e) =>
                                setEditingPhotoDate(e.target.value)
                              }
                            />
                            <div className={styles.dateEditorButtons}>
                              <button
                                onClick={() =>
                                  handleSavePhotoDate(
                                    photos[currentPhotoIndex].id!
                                  )
                                }
                                disabled={isLoading}
                                className={styles.saveBtn}
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEditPhotoDate}
                                disabled={isLoading}
                                className={styles.cancelBtn}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className={styles.viewerDateDisplay}>
                            <span>
                              {formatDate(photos[currentPhotoIndex].taken_at)}
                            </span>
                            <button
                              className={styles.viewerEditDateBtn}
                              onClick={() =>
                                handleEditPhotoDate(
                                  photos[currentPhotoIndex].id!,
                                  photos[currentPhotoIndex].taken_at!
                                )
                              }
                              title="Edit date"
                              disabled={isLoading || uploading}
                            >
                              <EditIcon />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.thumbnailStrip}>
                  {photos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className={`${styles.thumbnail} ${
                        index === currentPhotoIndex
                          ? styles.activeThumbnail
                          : ""
                      }`}
                      onClick={() => handleThumbnailClick(index)}
                    >
                      <img
                        src={photo.photo_path}
                        alt={photo.caption || "Thumbnail"}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
    </>
  );
};

export default PlantDetailPage;
