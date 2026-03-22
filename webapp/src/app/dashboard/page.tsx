"use client";

import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useDives } from "@/lib/useDives";
import DiveCard from "@/components/DiveCard";

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
          <Link href="/dashboard/dives" className="text-sm text-sky-700 hover:underline">
            View all →
          </Link>
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
          <p className="text-gray-400">No dives yet — go to <Link href="/dashboard/dives" className="text-sky-700 hover:underline">My Dives</Link> to add your first dive.</p>
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
    </main>
  );
}
