import React, { useState } from 'react';
import { BarChart3, AlertCircle, Info, Sparkles } from 'lucide-react';
import { StatsResponse } from '../types';

interface QuirksChartProps {
  statsData: StatsResponse | null;
}

export default function QuirksChart({ statsData }: QuirksChartProps) {
  const [activeTab, setActiveTab] = useState<'scatter' | 'duration'>('scatter');
  const items = statsData?.items || [];

  if (items.length === 0) {
    return null;
  }

  // Duration in seconds sorted
  const sortedByDuration = [...items].sort((a, b) => a.duration_s - b.duration_s);

  // Scaled dimensions for SVG scatter plot
  const width = 800;
  const height = 400;
  const padding = 50;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  return (
    <div className="card chart-section">
      <div className="controls-bar" style={{ background: '#131b2e' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 className="text-blue-400" size={20} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Catalog Data Insights & Quirks</h3>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Exposing audio feature anomalies, distributions, and corrected data quirks.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('scatter')}
            className={`btn ${activeTab === 'scatter' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
          >
            Danceability vs Energy
          </button>
          <button
            onClick={() => setActiveTab('duration')}
            className={`btn ${activeTab === 'duration' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
          >
            Duration Distribution (Unit Fixes)
          </button>
        </div>
      </div>

      <div style={{ padding: '1.5rem' }}>
        {activeTab === 'scatter' ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#93c5fd', fontSize: '0.875rem' }}>
              <Info size={16} />
              <span>
                <strong>Quirk Highlight:</strong> "21 Guns" had raw danceability 1.42 (exceeded Spotify's 1.0 ceiling; normalized & clamped to 1.0). High energy tracks like "Mr. Brightside" (0.918) show inverse danceability.
              </span>
            </div>

            <div style={{ width: '100%', overflowX: 'auto' }}>
              <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', background: '#080c14', borderRadius: '0.5rem' }}>
                {/* Grid lines */}
                {[0.2, 0.4, 0.6, 0.8, 1.0].map((tick) => {
                  const x = padding + tick * innerWidth;
                  const y = height - padding - tick * innerHeight;
                  return (
                    <g key={tick}>
                      <line x1={x} y1={padding} x2={x} y2={height - padding} stroke="#1e293b" strokeDasharray="3 3" />
                      <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                      <text x={x} y={height - padding + 18} fill="#64748b" fontSize="11" textAnchor="middle">{tick}</text>
                      <text x={padding - 10} y={y + 4} fill="#64748b" fontSize="11" textAnchor="end">{tick}</text>
                    </g>
                  );
                })}

                {/* Axes */}
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#475569" strokeWidth="1.5" />
                <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#475569" strokeWidth="1.5" />

                {/* Axis Labels */}
                <text x={width / 2} y={height - 12} fill="#94a3b8" fontSize="12" fontWeight="600" textAnchor="middle">
                  Danceability (0.0 → 1.0)
                </text>
                <text x={18} y={height / 2} fill="#94a3b8" fontSize="12" fontWeight="600" textAnchor="middle" transform={`rotate(-90 18 ${height / 2})`}>
                  Energy (0.0 → 1.0)
                </text>

                {/* Data Points */}
                {items.map((song) => {
                  const d = song.danceability !== null ? song.danceability : 0.5;
                  const e = song.energy !== null ? song.energy : 0.5;
                  const cx = padding + d * innerWidth;
                  const cy = height - padding - e * innerHeight;
                  const isSpecial = song.title === '21 Guns' || song.title === 'Billie Jean' || song.title === 'Mr. Brightside';

                  return (
                    <g key={song.id} className="cursor-pointer group">
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isSpecial ? 7 : 5}
                        fill={isSpecial ? '#f59e0b' : '#3b82f6'}
                        stroke={isSpecial ? '#ffffff' : '#60a5fa'}
                        strokeWidth={isSpecial ? 2 : 1}
                        opacity={0.9}
                      >
                        <title>{`${song.title} | Danceability: ${d}, Energy: ${e}`}</title>
                      </circle>
                      <text
                        x={cx + 8}
                        y={cy + 4}
                        fill={isSpecial ? '#fbbf24' : '#cbd5e1'}
                        fontSize="10"
                        fontWeight={isSpecial ? '700' : '400'}
                      >
                        {song.title}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#34d399', fontSize: '0.875rem' }}>
              <Sparkles size={16} />
              <span>
                <strong>Unit Mismatch Quirk Fixed:</strong> Part 2 exported "Sunflower" (158s), "Uptown Funk" (270s), and "Sweet Child O Mine" (356s) in seconds. Our pipeline detected values &lt; 10,000 and unified them to milliseconds.
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {sortedByDuration.map((song) => {
                const isCorrected = ['Sunflower', 'Uptown Funk', 'Sweet Child O Mine'].includes(song.title);
                const minutes = Math.floor(song.duration_s / 60);
                const seconds = String(song.duration_s % 60).padStart(2, '0');
                const percent = Math.min(100, Math.round((song.duration_s / 420) * 100));

                return (
                  <div
                    key={song.id}
                    style={{
                      background: isCorrected ? 'rgba(245, 158, 11, 0.08)' : 'rgba(30, 41, 59, 0.5)',
                      border: `1px solid ${isCorrected ? '#f59e0b' : '#1e293b'}`,
                      borderRadius: '0.5rem',
                      padding: '0.875rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{song.title}</span>
                      <span style={{ fontFamily: 'monospace', color: isCorrected ? '#f59e0b' : '#94a3b8' }}>
                        {minutes}:{seconds} ({song.duration_s}s)
                      </span>
                    </div>

                    <div style={{ height: '6px', background: '#0f172a', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${percent}%`,
                          background: isCorrected ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                          borderRadius: '3px'
                        }}
                      />
                    </div>

                    {isCorrected && (
                      <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <AlertCircle size={12} />
                        <span>Fixed from raw export unit error</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
