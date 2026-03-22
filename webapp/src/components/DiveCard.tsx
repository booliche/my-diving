import { Dive } from "@/lib/useDives";

const STATUS_STYLES: Record<string, string> = {
  uploaded: "bg-yellow-100 text-yellow-700",
  processing: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
  error: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  uploaded: "Pending",
  processing: "Processing",
  done: "Ready",
  error: "Error",
};

function formatDate(seconds?: number): string {
  if (!seconds) return "—";
  return new Date(seconds * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function DiveCard({ dive }: { dive: Dive }) {
  const { file } = dive;
  const summary = file.data?.diveSummaryMesg;
  const status = file.status ?? "uploaded";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <p
          className="text-sm font-medium text-gray-800 truncate max-w-[140px]"
          title={file.fileName}
        >
          {file.fileName}
        </p>
        <span
          className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.uploaded}`}
        >
          {STATUS_LABELS[status] ?? "Pending"}
        </span>
      </div>

      {/* Date */}
      <p className="text-xs text-gray-400 mb-4">{formatDate(file.uploadedAt?.seconds)}</p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-sky-50 p-3 text-center">
          <p className="text-xs text-sky-600 font-medium">Max Depth</p>
          <p className="mt-0.5 text-xl font-bold text-sky-900">
            {summary?.maxDepth != null ? `${summary.maxDepth.toFixed(1)} m` : "—"}
          </p>
        </div>
        <div className="rounded-lg bg-sky-50 p-3 text-center">
          <p className="text-xs text-sky-600 font-medium">Bottom Time</p>
          <p className="mt-0.5 text-xl font-bold text-sky-900">
            {summary?.bottomTime != null
              ? `${Math.floor(summary.bottomTime / 60)} min`
              : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
