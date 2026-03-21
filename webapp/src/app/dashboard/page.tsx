"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { useDives } from "@/lib/useDives";
import FitUploader from "@/components/FitUploader";
import DiveCard from "@/components/DiveCard";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { dives, loading: divesLoading } = useDives(user?.uid ?? "");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sky-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
      </div>
    );
  }

  async function handleSignOut() {
    await signOut(auth);
    router.replace("/login");
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-sky-900 px-6 py-4 text-white shadow">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤿</span>
            <span className="text-lg font-semibold">My Diving</span>
          </div>
          <div className="flex items-center gap-3">
            {user.photoURL && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt={user.displayName ?? "User"}
                className="h-8 w-8 rounded-full"
                referrerPolicy="no-referrer"
              />
            )}
            <span className="text-sm">{user.displayName}</span>
            <button
              onClick={handleSignOut}
              className="rounded-md bg-sky-700 px-3 py-1 text-xs font-medium transition hover:bg-sky-600"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-12 space-y-8">

        {/* Upload section */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800">Upload a Dive</h2>
          <p className="mt-1 text-sm text-gray-500">
            Upload a .FIT file from your dive computer. Data will be extracted automatically.
          </p>
          <div className="mt-4">
            <FitUploader userId={user.uid} />
          </div>
        </section>

        {/* Dives list */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800">Your Dives</h2>

          {divesLoading && (
            <div className="mt-6 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
            </div>
          )}

          {!divesLoading && dives.length === 0 && (
            <p className="mt-4 text-gray-400">
              No dives yet — upload your first .FIT file above.
            </p>
          )}

          {!divesLoading && dives.length > 0 && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {dives.map((dive) => (
                <DiveCard key={dive.id} dive={dive} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
