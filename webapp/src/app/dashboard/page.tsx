"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useDives } from "@/lib/useDives";
import DiveCard from "@/components/DiveCard";
import FitUploader from "@/components/FitUploader";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm text-center">
      <p className="text-xs font-medium text-sky-600 uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { allDives, loading, error } = useDives(user?.uid ?? "");
  const [uploadOpen, setUploadOpen] = useState(false);

  const recent = allDives.slice(0, 5);
  const totalDives = allDives.length;

  const deepest = allDives.reduce((max, d) => {
    const depth = d.file.data?.diveSummaryMesg?.maxDepth ?? 0;
    return depth > max ? depth : max;
  }, 0);

  const totalBottomTime = allDives.reduce(
    (sum, d) => sum + (d.file.data?.diveSummaryMesg?.bottomTime ?? 0),
    0
  );

  const lastDiveSeconds = allDives[0]?.file.uploadedAt?.seconds;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 space-y-10">
      {/* Recent dives */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-800">Recent Dives</h2>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/dives" className="text-sm text-sky-700 hover:underline">
              View all →
            </Link>
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

        {!loading && !error && totalDives === 0 && (
          <p className="text-gray-400">No dives yet — upload your first .FIT file above.</p>
        )}

        {!loading && !error && recent.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {recent.map((dive) => (
              <DiveCard key={dive.id} dive={dive} />
            ))}
          </div>
        )}
      </section>

      {/* Statistics */}
      {!loading && totalDives > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-5">Statistics</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Dives" value={String(totalDives)} />
            <StatCard
              label="Deepest Dive"
              value={deepest > 0 ? `${deepest.toFixed(1)} m` : "—"}
            />
            <StatCard
              label="Total Bottom Time"
              value={totalBottomTime > 0 ? `${Math.floor(totalBottomTime / 60)} min` : "—"}
            />
            <StatCard
              label="Last Dive"
              value={
                lastDiveSeconds
                  ? new Date(lastDiveSeconds * 1000).toLocaleDateString()
                  : "—"
              }
            />
          </div>
        </section>
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
