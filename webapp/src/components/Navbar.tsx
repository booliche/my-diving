"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";

const NAV_LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/dives", label: "My Dives" },
];

export default function Navbar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut(auth);
    router.replace("/login");
  }

  return (
    <nav className="bg-sky-900 px-6 py-3 text-white shadow">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        {/* Left: logo + links */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="text-xl">🤿</span>
            <span>My Diving</span>
          </Link>
          <div className="flex gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={[
                  "rounded-md px-3 py-1.5 text-sm font-medium transition",
                  pathname === href
                    ? "bg-sky-700 text-white"
                    : "text-sky-200 hover:bg-sky-800 hover:text-white",
                ].join(" ")}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: user + sign out */}
        <div className="flex items-center gap-3">
          {user?.photoURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt={user.displayName ?? ""}
              className="h-7 w-7 rounded-full"
              referrerPolicy="no-referrer"
            />
          )}
          <span className="text-sm text-sky-100">{user?.displayName}</span>
          <button
            onClick={handleSignOut}
            className="rounded-md bg-sky-700 px-3 py-1 text-xs font-medium transition hover:bg-sky-600"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
