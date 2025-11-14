import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import PlantsListPage from "./pages/PlantsListPage";
import PlantDetailPage from "./pages/PlantDetailPage";
import AddPlantPage from "./pages/AddPlantPage";
import "./App.css";

function App() {
  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<PlantsListPage />} />
          <Route path="/plants/new" element={<AddPlantPage />} />
          <Route path="/plants/:id" element={<PlantDetailPage />} />
          <Route path="/plants/:id/edit" element={<AddPlantPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
