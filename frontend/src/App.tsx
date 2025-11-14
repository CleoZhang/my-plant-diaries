import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import PlantsListPage from "./pages/PlantsListPage";
import PlantDetailPage from "./pages/PlantDetailPage";
import AddPlantPage from "./pages/AddPlantPage";
import { LoadingProvider } from "./contexts/LoadingContext";
import styles from "./App.module.css";

function App() {
  return (
    <LoadingProvider>
      <div className={styles.app}>
        <Header />
        <main className={styles.mainContent}>
          <Routes>
            <Route path="/" element={<PlantsListPage />} />
            <Route path="/plants/new" element={<AddPlantPage />} />
            <Route path="/plants/:id" element={<PlantDetailPage />} />
            <Route path="/plants/:id/edit" element={<AddPlantPage />} />
          </Routes>
        </main>
      </div>
    </LoadingProvider>
  );
}

export default App;
