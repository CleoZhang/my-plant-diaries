import { Link } from "react-router-dom";
import styles from "../App.module.css";

const Header = () => {
  return (
    <header className={styles.header}>
      <div className="container">
        <div className={styles.headerContent}>
          <h1>🪴 My Plant Diaries</h1>
          <nav>
            <Link to="/">Home</Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
