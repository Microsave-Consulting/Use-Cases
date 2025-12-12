import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import MapPage from "./MapPage";
import UseCaseLibrary from "./UseCaseLibrary";
import "./App.css";

const basename = import.meta.env.BASE_URL; // Vite + GH Pages safe

function App() {
  return (
    <BrowserRouter basename={basename}>
      <div style={{ fontFamily: "system-ui, sans-serif" }}>
        {/* Top nav */}
        <nav
          style={{
            display: "flex",
            gap: "1rem",
            padding: "0.75rem 1rem",
            borderBottom: "1px solid #ddd",
            marginBottom: "1rem",
          }}
        >
          <Link to="/" style={{ textDecoration: "none" }}>
            🏠 Home
          </Link>
          <Link to="/library" style={{ textDecoration: "none" }}>
            🧩 Use Case Library
          </Link>
        </nav>

        <Routes>
          {/* Home = Heatmap */}
          <Route path="/" element={<MapPage />} />

          {/* Use Case Library */}
          <Route path="/library" element={<UseCaseLibrary />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
