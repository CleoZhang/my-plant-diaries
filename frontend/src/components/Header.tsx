import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <div>
            <h1>🪴 My Plant Diaries</h1>
            <p className="header-subtitle">
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
