import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import styles from "../App.module.css";

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false);
    navigate("/login");
  };

  const handleHomeClick = () => {
    setIsMenuOpen(false);
    navigate("/");
  };

  return (
    <header className={styles.header}>
      <div className="container">
        <div className={styles.headerContent}>
          <h1>🪴 My Plant Diaries</h1>
          <nav style={{ position: "relative" }}>
            {user && (
              <>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  style={{
                    background: "transparent",
                    border: "1px solid #cbd5e0",
                    color: "white",
                    padding: "0.5rem",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    width: "40px",
                    height: "40px",
                    justifyContent: "center",
                    alignItems: "center",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "rgba(255, 255, 255, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                  aria-label="Menu"
                >
                  <span
                    style={{
                      width: "24px",
                      height: "2px",
                      backgroundColor: "white",
                      borderRadius: "2px",
                    }}
                  />
                  <span
                    style={{
                      width: "24px",
                      height: "2px",
                      backgroundColor: "white",
                      borderRadius: "2px",
                    }}
                  />
                  <span
                    style={{
                      width: "24px",
                      height: "2px",
                      backgroundColor: "white",
                      borderRadius: "2px",
                    }}
                  />
                </button>

                {isMenuOpen && (
                  <>
                    <div
                      style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 998,
                      }}
                      onClick={() => setIsMenuOpen(false)}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 10px)",
                        right: 0,
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                        minWidth: "200px",
                        overflow: "hidden",
                        zIndex: 999,
                      }}
                    >
                      <div
                        style={{
                          padding: "1rem",
                          borderBottom: "1px solid #e2e8f0",
                          color: "#4a5568",
                          fontSize: "0.9rem",
                        }}
                      >
                        {user.displayName || user.email}
                      </div>
                      <button
                        onClick={handleHomeClick}
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          border: "none",
                          background: "transparent",
                          color: "#2d3748",
                          fontSize: "1rem",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "background-color 0.2s",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#f7fafc";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        Home
                      </button>
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          navigate("/account");
                        }}
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          border: "none",
                          background: "transparent",
                          color: "#2d3748",
                          fontSize: "1rem",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "background-color 0.2s",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#f7fafc";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        Account
                      </button>
                      <button
                        onClick={handleLogout}
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          border: "none",
                          background: "transparent",
                          color: "#e53e3e",
                          fontSize: "1rem",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "background-color 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#fff5f5";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
