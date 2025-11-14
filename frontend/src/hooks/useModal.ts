import { useState } from "react";

interface ModalState {
  isOpen: boolean;
  title?: string;
  message: string;
  type: "alert" | "confirm";
  onConfirm?: () => void;
}

export const useModal = () => {
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    message: "",
    type: "alert",
  });

  const showAlert = (message: string, title?: string) => {
    setModalState({
      isOpen: true,
      message,
      title,
      type: "alert",
    });
  };

  const showConfirm = (
    message: string,
    onConfirm: () => void,
    title?: string
  ) => {
    setModalState({
      isOpen: true,
      message,
      title,
      type: "confirm",
      onConfirm,
    });
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  return {
    modalState,
    showAlert,
    showConfirm,
    closeModal,
  };
};
