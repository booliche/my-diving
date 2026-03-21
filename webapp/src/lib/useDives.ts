import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface DiveSessionMesg {
  sport?: string;
  startTime?: string;
  totalElapsedTime?: number;
}

export interface DiveSummaryMesg {
  diveNumber?: number;
  avgDepth?: number;
  maxDepth?: number;
  bottomTime?: number;
  surfaceInterval?: number;
  avgAscentRate?: number;
  startN2?: number;
  endN2?: number;
  o2Toxicity?: number;
  startCns?: number;
  endCns?: number;
}

export interface DiveFileData {
  sessionMesg?: DiveSessionMesg;
  diveSummaryMesg?: DiveSummaryMesg;
}

export interface DiveFile {
  id: string;
  fileName: string;
  fileSizeBytes?: number;
  status?: "uploaded" | "processing" | "done" | "error";
  uploadedAt?: { seconds: number } | null;
  processedAt?: { seconds: number } | null;
  errorMessage?: string;
  data?: DiveFileData;
}

export interface Dive {
  id: string;
  file: DiveFile;
  planning: Record<string, unknown>;
}

export function useDives(userId: string, pageSize = 10) {
  const [dives, setDives] = useState<Dive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "users", userId, "dives"),
      orderBy("file.uploadedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Dive[];
        setDives(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Firestore error:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const totalPages = Math.ceil(dives.length / pageSize);
  const paginated = dives.slice(page * pageSize, (page + 1) * pageSize);

  return {
    dives: paginated,
    loading,
    error,
    page,
    totalPages,
    totalCount: dives.length,
    setPage,
  };
}
