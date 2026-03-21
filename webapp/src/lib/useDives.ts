import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Dive {
  id: string;
  fileName: string;
  processedAt: { seconds: number } | null;
  sport?: string;
  startTime?: string;
  totalDurationSeconds?: number;
  maxDepthMeters?: number;
  avgDepthMeters?: number;
  bottomTimeSeconds?: number;
}

export function useDives(userId: string) {
  const [dives, setDives] = useState<Dive[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "users", userId, "dives"),
      orderBy("processedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Dive[];
      setDives(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { dives, loading };
}
