"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

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
      <div className="mx-auto max-w-4xl px-6 py-12">
        <h2 className="text-2xl font-bold text-gray-800">Your Dives</h2>
        <p className="mt-2 text-gray-500">
          Upload a .FIT file to log your first dive.
        </p>

        {/* Placeholder — upload feature coming next */}
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white py-16 text-center">
          <span className="text-5xl">📂</span>
          <p className="mt-4 text-gray-500">No dives yet</p>
          <p className="text-sm text-gray-400">Upload a .FIT file to get started</p>
        </div>
      </div>
    </main>
  );
}
