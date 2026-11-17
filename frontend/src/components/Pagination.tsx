import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="pagination-bar">
      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        Showing <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{startItem}</span> to{' '}
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{endItem}</span> of{' '}
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{totalItems}</span> songs
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="btn btn-secondary"
          style={{ padding: '0.4rem 0.75rem', opacity: currentPage <= 1 ? 0.4 : 1 }}
        >
          <ChevronLeft size={16} />
          <span>Previous</span>
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={`btn ${currentPage === pageNum ? 'btn-primary' : 'btn-secondary'}`}
            style={{ minWidth: '2.25rem', padding: '0.4rem 0.6rem' }}
          >
            {pageNum}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="btn btn-secondary"
          style={{ padding: '0.4rem 0.75rem', opacity: currentPage >= totalPages ? 0.4 : 1 }}
        >
          <span>Next</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
