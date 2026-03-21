import { Dive } from "@/lib/useDives";

function formatDuration(seconds?: number): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function formatDepth(meters?: number): string {
  if (meters == null) return "—";
  return `${meters.toFixed(1)} m`;
}

function formatDate(startTime?: string): string {
  if (!startTime) return "—";
  return new Date(startTime).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function DiveCard({ dive }: { dive: Dive }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-sky-600">
            {dive.sport ?? "Dive"}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-gray-800">
            {formatDate(dive.startTime)}
          </p>
          <p className="mt-0.5 text-xs text-gray-400 truncate max-w-[200px]">
            {dive.fileName}
          </p>
        </div>
        <span className="text-2xl">🤿</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-sky-50 px-2 py-3">
          <p className="text-lg font-bold text-sky-700">
            {formatDepth(dive.maxDepthMeters)}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">Max depth</p>
        </div>
        <div className="rounded-xl bg-sky-50 px-2 py-3">
          <p className="text-lg font-bold text-sky-700">
            {formatDepth(dive.avgDepthMeters)}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">Avg depth</p>
        </div>
        <div className="rounded-xl bg-sky-50 px-2 py-3">
          <p className="text-lg font-bold text-sky-700">
            {formatDuration(dive.bottomTimeSeconds ?? dive.totalDurationSeconds)}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">Duration</p>
        </div>
      </div>
    </div>
  );
}
