import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface DiveFile {
  id: string;
  fileName: string;
  fileSizeBytes?: number;
  status?: "uploaded" | "processing" | "done" | "error";
  uploadedAt?: { seconds: number } | null;
  processedAt?: { seconds: number } | null;
  errorMessage?: string;
}

export interface DivePlanning {
  sport?: string;
  startTime?: string;
  totalDurationSeconds?: number;
  diveNumber?: number;
  avgDepthMeters?: number;
  maxDepthMeters?: number;
  bottomTimeSeconds?: number;
  surfaceIntervalSeconds?: number;
  avgAscentRateMps?: number;
  startN2Percent?: number;
  endN2Percent?: number;
  o2ToxicityOtus?: number;
  startCnsPercent?: number;
  endCnsPercent?: number;
}

export interface Dive {
  id: string;
  file: DiveFile;
  planning: DivePlanning;
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
