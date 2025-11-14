import styles from "./LoadingSpinner.module.css";

interface LoadingSpinnerProps {
  fullPage?: boolean;
  message?: string;
  size?: "small" | "medium" | "large";
}

const LoadingSpinner = ({
  fullPage = false,
  message = "Loading...",
  size = "medium",
}: LoadingSpinnerProps) => {
  const content = (
    <div className={styles.spinnerContent}>
      <div className={`${styles.spinner} ${styles[size]}`}>
        <div className={styles.spinnerRing}></div>
        <div className={styles.spinnerRing}></div>
        <div className={styles.spinnerRing}></div>
      </div>
      {message && <p className={styles.message}>{message}</p>}
    </div>
  );

  if (fullPage) {
    return <div className={styles.fullPageOverlay}>{content}</div>;
  }

  return <div className={styles.container}>{content}</div>;
};

export default LoadingSpinner;
