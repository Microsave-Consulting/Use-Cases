import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

function splitValues(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function colorFor(value, max) {
  if (!max || value <= 0) return "#fff7ed";
  const t = value / max;
  const light = { r: 255, g: 245, b: 235 };
  const dark = { r: 153, g: 0, b: 0 };
  return `rgb(${lerp(light.r, dark.r, t)}, ${lerp(
    light.g,
    dark.g,
    t
  )}, ${lerp(light.b, dark.b, t)})`;
}

export default function SectorCountryHeatmap({
  items,
  title = "Heatmap: Sector Priorities for Top Countries",
  topNCountries = 10,
}) {
  const navigate = useNavigate();

  const { sectors, countries, matrix, maxValue } = useMemo(() => {
    const sectorSet = new Set();
    const countryCount = new Map();
    const pair = new Map();

    (items || []).forEach((uc) => {
      const secs = splitValues(uc.Sectors);
      const cts = splitValues(uc.Country);
      if (!secs.length || !cts.length) return;

      secs.forEach((s) => {
        sectorSet.add(s);
        if (!pair.has(s)) pair.set(s, new Map());
        const row = pair.get(s);

        cts.forEach((c) => {
          countryCount.set(c, (countryCount.get(c) || 0) + 1);
          row.set(c, (row.get(c) || 0) + 1);
        });
      });
    });

    const topCountries = Array.from(countryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topNCountries)
      .map(([c]) => c);

    const sectorList = Array.from(sectorSet).sort();

    let max = 0;
    const mat = sectorList.map((s) => {
      const row = pair.get(s) || new Map();
      const values = topCountries.map((c) => {
        const v = row.get(c) || 0;
        max = Math.max(max, v);
        return v;
      });
      return { sector: s, values };
    });

    return { sectors: sectorList, countries: topCountries, matrix: mat, maxValue: max };
  }, [items, topNCountries]);

  const cellW = 70;
  const cellH = 28;
  const leftLabelW = 260;
  const bottomLabelH = 70;
  const colorbarW = 16;
  const gap = 12;

  const width =
    leftLabelW + countries.length * cellW + gap + colorbarW + 40;
  const height =
    40 + sectors.length * cellH + bottomLabelH;

  function go(sector, country, val) {
    if (!val) return;
    const p = new URLSearchParams();
    p.set("sector", sector);
    p.set("country", country);
    navigate(`/library?${p.toString()}`);
  }

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <div style={{ width, margin: "0 auto" }}>
        <div style={{ textAlign: "center", fontWeight: 700, marginBottom: 8 }}>
          {title}
        </div>

        <svg width={width} height={height}>
          {/* Matrix */}
          {matrix.map((row, i) => {
            const y = 30 + i * cellH;
            return (
              <g key={row.sector}>
                <text
                  x={leftLabelW - 10}
                  y={y + cellH / 2 + 4}
                  textAnchor="end"
                  fontSize="12"
                >
                  {row.sector}
                </text>

                {row.values.map((v, j) => {
                  const x = leftLabelW + j * cellW;
                  return (
                    <g
                      key={`${row.sector}-${j}`}
                      onClick={() => go(row.sector, countries[j], v)}
                      style={{ cursor: v ? "pointer" : "default" }}
                    >
                      <rect
                        x={x}
                        y={y}
                        width={cellW}
                        height={cellH}
                        fill={colorFor(v, maxValue)}
                        stroke="#e5e7eb"
                      />
                      <text
                        x={x + cellW / 2}
                        y={y + cellH / 2 + 4}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight={600}
                      >
                        {v}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Country labels (BOTTOM) */}
          {countries.map((c, j) => {
            const x = leftLabelW + j * cellW + cellW / 2;
            const y = 30 + sectors.length * cellH + 10;
            return (
              <text
                key={c}
                x={x}
                y={y}
                textAnchor="end"
                fontSize="11"
                transform={`rotate(-45 ${x} ${y})`}
              >
                {c}
              </text>
            );
          })}

          {/* Colorbar */}
          <g
            transform={`translate(${leftLabelW + countries.length * cellW + gap}, 30)`}
          >
            <defs>
              <linearGradient id="sc-heat" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor={colorFor(0, maxValue)} />
                <stop offset="100%" stopColor={colorFor(maxValue, maxValue)} />
              </linearGradient>
            </defs>

            <rect
              width={colorbarW}
              height={sectors.length * cellH}
              fill="url(#sc-heat)"
              stroke="#e5e7eb"
            />
            <text x={colorbarW + 6} y={12} fontSize="12">
              {maxValue}
            </text>
            <text
              x={colorbarW + 6}
              y={sectors.length * cellH}
              fontSize="12"
            >
              0
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
