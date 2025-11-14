import { useEffect } from "react";
import { useLoading } from "../contexts/LoadingContext";
import styles from "./Modal.module.css";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: "alert" | "confirm";
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

const Modal = ({
  isOpen,
  onClose,
  title,
  message,
  type = "alert",
  onConfirm,
  confirmText = "OK",
  cancelText = "Cancel",
}: ModalProps) => {
  const { isLoading } = useLoading();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const handleCancel = () => {
    // Check if this is the CSV import scenario
    if (title === "Replace all") {
      // User chose "Keep existing" - trigger file picker without clearing
      const performImport = (window as any).__performImportWithoutClearing;
      if (performImport) {
        performImport();
      }
    }
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {title && <h3 className={styles.modalTitle}>{title}</h3>}
        <p className={styles.modalMessage}>{message}</p>
        <div className={styles.modalActions}>
          {type === "confirm" ? (
            <>
              <button
                onClick={handleCancel}
                className="btn btn-secondary"
                disabled={isLoading}
              >
                {title === "Replace all" ? "Keep existing" : cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className="btn btn-primary"
                disabled={isLoading}
              >
                {confirmText}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="btn btn-primary"
              disabled={isLoading}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
