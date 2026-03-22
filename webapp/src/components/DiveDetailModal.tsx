import { Dive } from "@/lib/useDives";

interface Props {
  dive: Dive;
  onClose: () => void;
  onEdit: () => void;
}

function formatDate(ts?: { seconds: number } | null): string {
  if (!ts) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
  });
}

function formatTime(ts?: { seconds: number } | null): string {
  if (!ts) return "—";
  return new Date(ts.seconds * 1000).toLocaleTimeString(undefined, {
    hour: "2-digit", minute: "2-digit",
  });
}

function formatSize(bytes?: number): string {
  if (!bytes) return "—";
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-800">{value}</span>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
      {children}
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  uploaded: "Pending", processing: "Processing", done: "Ready",
  error: "Error", no_file: "No file",
};

export default function DiveDetailModal({ dive, onClose, onEdit }: Props) {
  const { file, log } = dive;
  const summary = file.data?.diveSummaryMesg;
  const session = file.data?.sessionMesg;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex flex-col w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {file.fileName || [log?.type, log?.partner].filter(Boolean).join(" · ") || "Dive Detail"}
            </h2>
            {log?.date && (
              <p className="text-xs text-gray-400 mt-0.5">{formatDate(log.date)}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {/* Log Details */}
          {(log?.id || log?.date || log?.type || log?.partner) && (
            <Card title="Log Details">
              <Row label="Log ID"  value={log?.id} />
              <Row label="Date"    value={formatDate(log?.date)} />
              <Row label="Type"    value={log?.type} />
              <Row label="Partner" value={log?.partner} />
            </Card>
          )}

          {/* FIT File */}
          <Card title="FIT File">
            <Row label="File name"  value={file.fileName || "—"} />
            <Row label="File size"  value={formatSize(file.fileSizeBytes)} />
            <Row label="Status"     value={STATUS_LABELS[file.status ?? ""] ?? file.status} />
            <Row label="Uploaded"   value={formatDate(file.uploadedAt)} />
            <Row label="Processed"  value={formatDate(file.processedAt)} />
            {file.errorMessage && (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{file.errorMessage}</p>
            )}
          </Card>

          {/* FIT Session Data */}
          {session && (
            <Card title="Session">
              <Row label="Sport"              value={session.sport} />
              <Row label="Start time"         value={session.startTime ? new Date(session.startTime).toLocaleString() : undefined} />
              <Row label="Total elapsed time" value={session.totalElapsedTime != null ? `${Math.floor(session.totalElapsedTime / 60)} min ${Math.round(session.totalElapsedTime % 60)} s` : undefined} />
            </Card>
          )}

          {/* FIT Dive Summary */}
          {summary && (
            <Card title="Dive Summary (FIT)">
              <Row label="Dive #"          value={summary.diveNumber} />
              <Row label="Max depth"       value={summary.maxDepth != null ? `${summary.maxDepth.toFixed(2)} m` : undefined} />
              <Row label="Avg depth"       value={summary.avgDepth != null ? `${summary.avgDepth.toFixed(2)} m` : undefined} />
              <Row label="Bottom time"     value={summary.bottomTime != null ? `${Math.floor(summary.bottomTime / 60)} min ${Math.round(summary.bottomTime % 60)} s` : undefined} />
              <Row label="Surface interval" value={summary.surfaceInterval != null ? `${summary.surfaceInterval} s` : undefined} />
              <Row label="Avg ascent rate" value={summary.avgAscentRate != null ? `${summary.avgAscentRate.toFixed(3)} m/s` : undefined} />
              <Row label="Start N₂"        value={summary.startN2 != null ? `${summary.startN2} %` : undefined} />
              <Row label="End N₂"          value={summary.endN2 != null ? `${summary.endN2} %` : undefined} />
              <Row label="O₂ toxicity"     value={summary.o2Toxicity != null ? `${summary.o2Toxicity} OTUs` : undefined} />
              <Row label="Start CNS"       value={summary.startCns != null ? `${summary.startCns} %` : undefined} />
              <Row label="End CNS"         value={summary.endCns != null ? `${summary.endCns} %` : undefined} />
            </Card>
          )}

          {/* Log Dive entries */}
          {log?.dive?.map((d, i) => (
            <Card key={i} title={`Dive ${i + 1} — Log`}>
              <Row label="Dive #"           value={d.number} />
              <Row label="Start time"       value={formatTime(d.startTime)} />
              <Row label="End time"         value={formatTime(d.endTime)} />
              <Row label="Initial pressure" value={d.initialPressure != null ? `${d.initialPressure} bar` : undefined} />
              <Row label="Ending pressure"  value={d.endingPressure  != null ? `${d.endingPressure} bar`  : undefined} />
              <Row label="Working pressure" value={d.workingPressure != null ? `${d.workingPressure} bar` : undefined} />
              <Row label="Gas"              value={d.gas} />
              <Row label="Nitrox O₂"        value={d.nitrox != null ? `${d.nitrox} %` : undefined} />
              <Row label="Tank volume"      value={d.tankVolume != null ? `${d.tankVolume} L` : undefined} />
              <Row label="TCS 1"            value={d.tcs1} />
              <Row label="TCS 2"            value={d.tcs2} />
              <Row label="Weather"          value={d.weather} />
              <Row label="Waving"           value={d.waving} />
              <Row label="Current"          value={d.current} />
              <Row label="Visibility"       value={d.visibility != null ? `${d.visibility} m` : undefined} />
              <Row label="Water temp"       value={d.waterTemp != null ? `${d.waterTemp} °C` : undefined} />
              <Row label="Ballast"          value={d.ballast != null ? `${d.ballast} kg` : undefined} />
              <Row label="Suit thickness"   value={d.suitThickness != null ? `${d.suitThickness} mm` : undefined} />
            </Card>
          ))}

        </div>
      </div>
    </div>
  );
}
