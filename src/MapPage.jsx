// src/MapPage.jsx
import { useEffect, useState } from "react";
import UseCaseHeatmap from "./UseCaseHeatmap";
import UseCaseSectorPie from "./widgets/UseCaseSectorPie";
import SectorMaturityHeatmap from "./widgets/SectorMaturityHeatmap";

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

  if (loading) return <div style={{ padding: "1rem" }}>Loading map…</div>;
  if (error) return <div style={{ padding: "1rem" }}>Error: {error}</div>;

  return (
    <div>
      <UseCaseHeatmap items={items} />

      {/* Pie chart (left) + Sector×Maturity heatmap (right) */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "1rem",
          padding: "1rem 0",
        }}
      >
        <div style={{ width: "50%" }}>
          <UseCaseSectorPie items={items} />
        </div>

        <div style={{ width: "50%" }}>
          <SectorMaturityHeatmap items={items} />
        </div>
      </div>
    </div>
  );
}
