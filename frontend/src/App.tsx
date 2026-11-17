import React, { useState, useEffect, useCallback } from 'react';
import { Music2, Sparkles, RefreshCw } from 'lucide-react';
import SongTable from './components/SongTable';
import SearchBar from './components/SearchBar';
import Pagination from './components/Pagination';
import QuirksChart from './components/QuirksChart';
import { Song, PaginatedSongsResponse, SearchResponse, StatsResponse } from './types';

export default function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalSongs, setTotalSongs] = useState<number>(0);
  const [pageSize] = useState<number>(10);
  const [sortBy, setSortBy] = useState<string>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Song[] | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const [statsData, setStatsData] = useState<StatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch paginated & sorted songs from Backend API
  const fetchSongs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/songs?page=${currentPage}&size=${pageSize}&sort_by=${sortBy}&order=${sortOrder}`
      );
      if (!res.ok) {
        throw new Error(`API Error: ${res.statusText}`);
      }
      const data: PaginatedSongsResponse = await res.json();
      setSongs(data.items);
      setTotalPages(data.total_pages);
      setTotalSongs(data.total);
    } catch (err: any) {
      console.error('Failed to fetch songs:', err);
      setError('Unable to load songs from API. Please ensure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, sortBy, sortOrder]);

  // Fetch catalog stats for charts
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data: StatsResponse = await res.json();
        setStatsData(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  useEffect(() => {
    if (searchResults === null) {
      fetchSongs();
    }
  }, [fetchSongs, searchResults]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Column header sort handler
  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(columnKey);
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to page 1 on sort change
    setSearchResults(null); // Clear search when sorting catalog
  };

  // Search by title handler
  const handleSearch = async (title: string) => {
    setIsSearching(true);
    setSearchQuery(title);
    setError(null);
    try {
      const res = await fetch(`/api/songs/search?title=${encodeURIComponent(title)}`);
      const data: SearchResponse = await res.json();
      setSearchResults(data.matches || []);
    } catch (err: any) {
      console.error('Search failed:', err);
      setError('Failed to perform search.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setCurrentPage(1);
  };

  // Rate a song 1-5 stars
  const handleRate = async (songId: string, stars: number) => {
    try {
      const res = await fetch(`/api/songs/${songId}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stars })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to submit rating');
      }

      // Optimistic local state update
      const updater = (list: Song[]) =>
        list.map((s) => (s.id === songId ? { ...s, rating: stars } : s));

      setSongs((prev) => updater(prev));
      if (searchResults) {
        setSearchResults((prev) => (prev ? updater(prev) : null));
      }
      fetchStats(); // Update chart rating data
    } catch (err: any) {
      alert(`Rating error: ${err.message}`);
    }
  };

  // Export current table view as CSV
  const handleExportCsv = () => {
    const dataToExport = searchResults !== null ? searchResults : songs;
    if (!dataToExport || dataToExport.length === 0) {
      alert('No data available to export.');
      return;
    }

    const headers: Array<keyof Song> = [
      'id',
      'title',
      'rating',
      'danceability',
      'energy',
      'tempo',
      'duration_ms',
      'acousticness',
      'valence',
      'num_sections',
      'num_segments',
      'mood'
    ];

    const escapeCsvValue = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows: string[] = [];
    csvRows.push(headers.join(','));

    for (const row of dataToExport) {
      const values = headers.map((header) => escapeCsvValue(row[header]));
      csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vivpro_songs_view_page_${currentPage}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const displayedSongs = searchResults !== null ? searchResults : songs;

  return (
    <div className="dashboard-container">
      {/* Header Banner */}
      <header className="header-banner">
        <div>
          <div className="brand-badge">
            <Sparkles size={14} />
            <span>Vivpro Take-Home Engineering Project (TypeScript)</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <Music2 className="text-blue-500" size={28} />
            Song Catalog Analytics Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Full-stack catalog with reconciled pipeline data, full-dataset sorting, and persistent ratings.
          </p>
        </div>

        <button
          onClick={() => {
            fetchSongs();
            fetchStats();
          }}
          className="btn btn-secondary"
          title="Refresh dataset from API"
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </header>

      {/* Error Notice */}
      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '0.5rem',
            padding: '1rem',
            color: '#f87171',
            marginBottom: '1.5rem',
            fontSize: '0.875rem'
          }}
        >
          {error}
        </div>
      )}

      {/* Section: Title Search */}
      <SearchBar
        onSearch={handleSearch}
        onClear={handleClearSearch}
        searchResults={searchResults}
        searchQuery={searchQuery}
        isSearching={isSearching}
      />

      {/* Section: Table with Full-dataset Sorting & Pagination */}
      <SongTable
        songs={displayedSongs}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        onRate={handleRate}
        onExportCsv={handleExportCsv}
        isLoading={isLoading}
      />

      {/* Pagination Bar (only in normal browsing mode) */}
      {searchResults === null && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalSongs}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
        />
      )}

      {/* Section: Data Insights & Quirks Chart */}
      <QuirksChart statsData={statsData} />
    </div>
  );
}
