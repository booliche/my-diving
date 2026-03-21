"use client";

import { useRef, useState } from "react";
import { ref, uploadBytesResumable } from "firebase/storage";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { storage, db } from "@/lib/firebase";

interface FitUploaderProps {
  userId: string;
  onDone?: () => void;
}

type UploadStatus = "idle" | "uploading" | "done" | "error";

export default function FitUploader({ userId, onDone }: FitUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const file = files[0];

    if (!file.name.toLowerCase().endsWith(".fit")) {
      setErrorMsg("Only .FIT files are supported.");
      setStatus("error");
      return;
    }

    uploadFile(file);
  }

  async function uploadFile(file: File) {
    setStatus("uploading");
    setProgress(0);
    setErrorMsg(null);

    const diveId = file.name.replace(/\.[^/.]+$/, "");

    // Write a pending record to Firestore immediately so it shows in the list
    await setDoc(doc(db, "users", userId, "dives", diveId), {
      fileName: file.name,
      fileSizeBytes: file.size,
      status: "uploaded",
      uploadedAt: serverTimestamp(),
      processedAt: null,
    });

    // Store under users/{userId}/dives/{filename}
    // Bucket (QA vs prod) is controlled by NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    const storageRef = ref(storage, `users/${userId}/dives/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const pct = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        setProgress(pct);
      },
      (error) => {
        setErrorMsg(error.message);
        setStatus("error");
      },
      () => {
        setStatus("done");
        // Close dialog (if open) and reset after 1.5 seconds
        setTimeout(() => {
          onDone?.();
          setStatus("idle");
          setProgress(0);
        }, 1500);
      }
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => status === "idle" && inputRef.current?.click()}
      className={[
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16 text-center transition cursor-pointer",
        dragging ? "border-sky-500 bg-sky-50" : "border-gray-300 bg-white hover:border-sky-400 hover:bg-sky-50",
        status !== "idle" ? "cursor-default" : "",
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".fit"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {status === "idle" && (
        <>
          <span className="text-5xl">📂</span>
          <p className="mt-4 font-medium text-gray-700">
            Drop a .FIT file here or click to browse
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Supported: Garmin .FIT activity files
          </p>
        </>
      )}

      {status === "uploading" && (
        <>
          <span className="text-5xl">⬆️</span>
          <p className="mt-4 font-medium text-gray-700">Uploading… {progress}%</p>
          <div className="mt-3 h-2 w-48 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-sky-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      )}

      {status === "done" && (
        <>
          <span className="text-5xl">✅</span>
          <p className="mt-4 font-medium text-gray-700">
            Upload complete! Processing your dive…
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Your dive data will appear below in a few seconds.
          </p>
        </>
      )}

      {status === "error" && (
        <>
          <span className="text-5xl">❌</span>
          <p className="mt-4 font-medium text-red-600">Upload failed</p>
          <p className="mt-1 text-sm text-red-400">{errorMsg}</p>
          <button
            onClick={(e) => { e.stopPropagation(); setStatus("idle"); }}
            className="mt-4 rounded-md bg-red-100 px-4 py-1.5 text-sm text-red-600 hover:bg-red-200"
          >
            Try again
          </button>
        </>
      )}
    </div>
  );
}
