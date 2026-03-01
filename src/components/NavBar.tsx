"use client";

import { Shield } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const ADMIN_USERS = ["kimsungjoong"];

export default function NavBar() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.username && ADMIN_USERS.includes(session.user.username);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-background/95 backdrop-blur border-b border-border flex items-center">
      <div className="w-full px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-accent">
            <rect x="3" y="14" width="5" height="7" rx="1" fill="currentColor" opacity="0.5"/>
            <rect x="9.5" y="8" width="5" height="13" rx="1" fill="currentColor" opacity="0.75"/>
            <rect x="16" y="3" width="5" height="18" rx="1" fill="currentColor"/>
          </svg>
          <span className="font-semibold text-lg">AI Native Camp League</span>
        </Link>

        {isAdmin && (
          <Link
            href="/admin"
            className="px-3 py-1.5 text-sm rounded flex items-center gap-1.5 text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
          >
            <Shield className="w-4 h-4" />
            Admin
          </Link>
        )}
      </div>
    </header>
  );
}
