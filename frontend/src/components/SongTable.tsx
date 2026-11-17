import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';
import StarRating from './StarRating';
import { Song } from '../types';

interface SongTableProps {
  songs: Song[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (columnKey: string) => void;
  onRate: (songId: string, stars: number) => Promise<void>;
  onExportCsv: () => void;
  isLoading: boolean;
}

export default function SongTable({
  songs,
  sortBy,
  sortOrder,
  onSort,
  onRate,
  onExportCsv,
  isLoading
}: SongTableProps) {
  const columns = [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'rating', label: 'Rating (1-5★)', sortable: true },
    { key: 'danceability', label: 'Danceability', sortable: true },
    { key: 'energy', label: 'Energy', sortable: true },
    { key: 'tempo', label: 'Tempo (BPM)', sortable: true },
    { key: 'duration_ms', label: 'Duration', sortable: true },
    { key: 'acousticness', label: 'Acousticness', sortable: true },
    { key: 'valence', label: 'Valence', sortable: true },
    { key: 'num_sections', label: 'Sections', sortable: true },
    { key: 'num_segments', label: 'Segments', sortable: true },
    { key: 'mood', label: 'Mood', sortable: true },
    { key: 'id', label: 'Track ID', sortable: false }
  ];

  const formatDuration = (ms: number | null) => {
    if (!ms) return '—';
    const totalSecs = Math.round(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = String(totalSecs % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const renderSortIcon = (colKey: string) => {
    if (sortBy !== colKey) {
      return <ArrowUpDown size={14} style={{ opacity: 0.3, marginLeft: '0.25rem' }} />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp size={14} style={{ color: 'var(--accent-blue)', marginLeft: '0.25rem' }} />
    ) : (
      <ArrowDown size={14} style={{ color: 'var(--accent-blue)', marginLeft: '0.25rem' }} />
    );
  };

  return (
    <div className="card">
      <div className="controls-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Showing {songs.length} song{songs.length === 1 ? '' : 's'}
          </span>
          {isLoading && (
            <span className="badge badge-blue" style={{ animation: 'pulse 1.5s infinite' }}>
              Updating...
            </span>
          )}
        </div>

        <button
          onClick={onExportCsv}
          className="btn btn-secondary"
          title="Download the currently shown data in table as CSV"
        >
          <Download size={16} />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={sortBy === col.key ? 'active-sort' : ''}
                  onClick={() => col.sortable && onSort(col.key)}
                  style={{ cursor: col.sortable ? 'pointer' : 'default' }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <span>{col.label}</span>
                    {col.sortable && renderSortIcon(col.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {songs.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No songs to display.
                </td>
              </tr>
            ) : (
              songs.map((song) => (
                <tr key={song.id}>
                  {/* Title & Anomaly Flags */}
                  <td style={{ fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{song.title}</span>
                      {song.is_tempo_imputed && (
                        <span className="badge badge-amber" title="Tempo was missing/0; imputed with catalog median">
                          Tempo Imputed
                        </span>
                      )}
                      {song.is_energy_imputed && (
                        <span className="badge badge-blue" title="Energy was missing/N/A; imputed with mean">
                          Energy Imputed
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Rating */}
                  <td>
                    <StarRating
                      songId={song.id}
                      currentRating={song.rating}
                      onRate={onRate}
                    />
                  </td>

                  {/* Danceability */}
                  <td>
                    {song.danceability !== null ? (
                      <span className="font-mono">
                        {song.danceability}
                        {song.danceability === 1.0 && (
                          <span style={{ color: '#fbbf24', marginLeft: '0.25rem' }} title="Normalized from outlier 1.42">
                            *
                          </span>
                        )}
                      </span>
                    ) : '—'}
                  </td>

                  {/* Energy */}
                  <td>
                    {song.energy !== null ? (
                      <span className="font-mono">{song.energy}</span>
                    ) : '—'}
                  </td>

                  {/* Tempo */}
                  <td>
                    <span className="font-mono">{song.tempo ? `${song.tempo} BPM` : '—'}</span>
                  </td>

                  {/* Duration */}
                  <td>
                    <span className="font-mono">{formatDuration(song.duration_ms)}</span>
                  </td>

                  {/* Acousticness */}
                  <td>
                    {song.acousticness !== null ? (
                      <span className="font-mono">{song.acousticness}</span>
                    ) : '—'}
                  </td>

                  {/* Valence */}
                  <td>
                    {song.valence !== null ? (
                      <span className="font-mono">{song.valence}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>

                  {/* Sections */}
                  <td>
                    <span className="font-mono">{song.num_sections ?? '—'}</span>
                  </td>

                  {/* Segments */}
                  <td>
                    <span className="font-mono">{song.num_segments ?? '—'}</span>
                  </td>

                  {/* Mood */}
                  <td>
                    {song.mood === 1 ? (
                      <span className="badge badge-green">Positive (1)</span>
                    ) : song.mood === 0 ? (
                      <span className="badge badge-blue">Neutral (0)</span>
                    ) : '—'}
                  </td>

                  {/* Track ID */}
                  <td>
                    <code style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {song.id}
                    </code>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
