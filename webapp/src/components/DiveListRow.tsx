import { useState } from "react";
import { ref, getDownloadURL, deleteObject } from "firebase/storage";
import { doc, deleteDoc } from "firebase/firestore";
import { storage, db } from "@/lib/firebase";
import { Dive } from "@/lib/useDives";

function formatSize(bytes?: number): string {
  if (!bytes) return "—";
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function formatDate(ts?: { seconds: number } | null): string {
  if (!ts) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status?: string }) {
  const styles: Record<string, string> = {
    uploaded: "bg-yellow-100 text-yellow-700",
    processing: "bg-blue-100 text-blue-700",
    done: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
    no_file: "bg-gray-100 text-gray-500",
  };
  const label: Record<string, string> = {
    uploaded: "Pending",
    processing: "Processing",
    done: "Ready",
    error: "Error",
    no_file: "No file",
  };
  const s = status ?? "uploaded";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[s] ?? styles.uploaded}`}>
      {label[s] ?? "Pending"}
    </span>
  );
}

export default function DiveListRow({ dive, index, userId, onUploadClick }: { dive: Dive; index: number; userId: string; onUploadClick?: () => void }) {
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const storageRef = ref(storage, `users/${userId}/dives/${dive.file.fileName}`);
      const url = await getDownloadURL(storageRef);
      const a = document.createElement("a");
      a.href = url;
      a.download = dive.file.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setDownloading(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      try {
        await deleteObject(ref(storage, `users/${userId}/dives/${dive.file.fileName}`));
      } catch {
        // file may not exist in storage — proceed to delete Firestore record
      }
      await deleteDoc(doc(db, "users", userId, "dives", dive.id));
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <tr className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
      {/* File name / log label */}
      <td className="px-4 py-3 text-sm font-medium text-gray-800 max-w-[200px] truncate">
        {dive.file.fileName ||
          [dive.log?.type, dive.log?.partner].filter(Boolean).join(" · ") ||
          "—"}
      </td>
      {/* Uploaded at / log date */}
      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
        {formatDate(dive.file.uploadedAt ?? dive.log?.date)}
      </td>
      {/* File size */}
      <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
        {formatSize(dive.file.fileSizeBytes)}
      </td>
      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={dive.file.status} />
      </td>
      {/* Actions: upload + download + delete */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {/* Upload FIT file */}
          <button
            onClick={onUploadClick}
            title="Upload FIT file"
            className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-sky-700"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </button>
          {/* Download — only when a FIT file is attached */}
          {dive.file.status !== "no_file" && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              title="Download .FIT file"
              className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-sky-700 disabled:opacity-40"
            >
              {downloading ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              )}
            </button>
          )}
          {/* Delete */}
          {confirmDelete ? (
            <span className="inline-flex items-center gap-1">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "…" : "Delete"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 transition hover:bg-gray-100"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              title="Delete dive"
              className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
