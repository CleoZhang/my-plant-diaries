import { Link } from "react-router-dom";
import styles from "../App.module.css";

const Header = () => {
  return (
    <header className={styles.header}>
      <div className="container">
        <div className={styles.headerContent}>
          <div>
            <h1>🪴 My Plant Diaries</h1>
            <p className={styles.headerSubtitle}>
              Track and care for your houseplants
            </p>
          </div>
          <nav>
            <Link to="/">Home</Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
