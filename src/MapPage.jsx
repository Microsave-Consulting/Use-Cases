// src/MapPage.jsx
import { useEffect, useState } from "react";
import UseCaseHeatmap from "./UseCaseHeatmap";
import UseCaseSectorPie from "./widgets/UseCaseSectorPie";
import SectorMaturityHeatmap from "./widgets/SectorMaturityHeatmap";
import SectorCountryHeatmap from "./widgets/SectorCountryHeatmap";

const API_URL = import.meta.env.BASE_URL + "data/use_cases.json";

export default function MapPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div style={{ padding: "1rem" }}>Loading…</div>;
  if (error) return <div style={{ padding: "1rem" }}>Error: {error}</div>;

  return (
    <div>
      {/* World map */}
      <UseCaseHeatmap items={items} />

      {/* Country × Sector heatmap (FULL WIDTH) */}
      <div style={{ padding: "1.5rem 0" }}>
        <SectorCountryHeatmap items={items} topNCountries={10} />
      </div>

      {/* Pie + Sector × Maturity heatmap */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          paddingBottom: "1rem",
          alignItems: "stretch",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <UseCaseSectorPie items={items} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <SectorMaturityHeatmap items={items} />
        </div>
      </div>
    </div>
  );
}
