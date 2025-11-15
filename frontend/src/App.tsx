import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import PlantsListPage from "./pages/PlantsListPage";
import PlantDetailPage from "./pages/PlantDetailPage";
import AddPlantPage from "./pages/AddPlantPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AccountPage from "./pages/AccountPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { LoadingProvider } from "./contexts/LoadingContext";
import { AuthProvider } from "./contexts/AuthContext";
import styles from "./App.module.css";

function App() {
  return (
    <AuthProvider>
      <LoadingProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className={styles.app}>
                  <Header />
                  <main className={styles.mainContent}>
                    <Routes>
                      <Route path="/" element={<PlantsListPage />} />
                      <Route path="/plants/new" element={<AddPlantPage />} />
                      <Route path="/plants/:id" element={<PlantDetailPage />} />
                      <Route
                        path="/plants/:id/edit"
                        element={<AddPlantPage />}
                      />
                      <Route path="/account" element={<AccountPage />} />
                    </Routes>
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </LoadingProvider>
    </AuthProvider>
  );
}

export default App;
