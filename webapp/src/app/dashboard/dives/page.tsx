"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useDives } from "@/lib/useDives";
import FitUploader from "@/components/FitUploader";
import DiveListRow from "@/components/DiveListRow";

const PAGE_SIZE = 10;

export default function DivesPage() {
  const { user } = useAuth();
  const [uploadOpen, setUploadOpen] = useState(false);
  const { dives, loading, error, page, totalPages, totalCount, setPage } =
    useDives(user?.uid ?? "", PAGE_SIZE);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">All Dives</h2>
        <div className="flex items-center gap-4">
          {!loading && !error && totalCount > 0 && (
            <span className="text-sm text-gray-400">
              {totalCount} file{totalCount !== 1 ? "s" : ""}
            </span>
          )}
          <button
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-600"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload a Dive
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        </div>
      )}

      {!loading && error && (
        <p className="text-red-500 text-sm">Could not load dives: {error}</p>
      )}

      {!loading && !error && totalCount === 0 && (
        <p className="text-gray-400">No dives yet — upload your first .FIT file above.</p>
      )}

      {!loading && !error && totalCount > 0 && (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left">
                <thead className="bg-sky-900 text-white">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">File</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Uploaded</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Size</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dives.map((dive, i) => (
                    <DiveListRow key={dive.id} dive={dive} index={i} userId={user?.uid ?? ""} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
              <span>
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-md border border-gray-200 px-3 py-1.5 transition hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded-md border border-gray-200 px-3 py-1.5 transition hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Upload dialog */}
      {uploadOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setUploadOpen(false); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Upload a Dive</h2>
              <button
                onClick={() => setUploadOpen(false)}
                className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <p className="mb-4 text-sm text-gray-500">
              Upload a .FIT file from your dive computer. Data will be extracted automatically.
            </p>
            <FitUploader userId={user?.uid ?? ""} onDone={() => setUploadOpen(false)} />
          </div>
        </div>
      )}
    </main>
  );
}
