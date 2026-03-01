"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Github, Menu, X, Shield } from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import Avatar from "./Avatar";

interface NavBarProps {
  onUploadClick: () => void;
  onUpdatesClick: () => void;
}

const ADMIN_USERS = ["kimsungjoong"];

export default function NavBar({ onUploadClick }: NavBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session } = useSession();

  const isAdmin = session?.user?.username && ADMIN_USERS.includes(session.user.username);

  return (
    <>
      {/* Desktop Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-background/95 backdrop-blur border-b border-border hidden md:flex items-center">
        <div className="w-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-accent">
                <rect x="3" y="14" width="5" height="7" rx="1" fill="currentColor" opacity="0.5"/>
                <rect x="9.5" y="8" width="5" height="13" rx="1" fill="currentColor" opacity="0.75"/>
                <rect x="16" y="3" width="5" height="18" rx="1" fill="currentColor"/>
              </svg>
              <span className="font-semibold text-lg">CC Camp League</span>
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

          <div className="flex items-center gap-3">
            <button
              onClick={onUploadClick}
              className="px-4 py-2 bg-accent text-white text-sm rounded-md font-medium hover:bg-accent-hover transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              제출하기
            </button>

            {session ? (
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded-md hover:bg-surface-2 transition-colors"
              >
                <Avatar
                  src={session.user?.image}
                  name={session.user?.name || session.user?.username}
                  size="sm"
                  showRing={false}
                  className="w-6 h-6"
                />
                <span className="hidden lg:inline text-muted">로그아웃</span>
              </button>
            ) : (
              <button
                onClick={() => signIn("github")}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-surface-2 transition-colors flex items-center gap-2"
              >
                <Github className="w-4 h-4" />
                GitHub 로그인
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-background/95 backdrop-blur border-b border-border">
        <div className="h-full px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-accent">
              <rect x="3" y="14" width="5" height="7" rx="1" fill="currentColor" opacity="0.5"/>
              <rect x="9.5" y="8" width="5" height="13" rx="1" fill="currentColor" opacity="0.75"/>
              <rect x="16" y="3" width="5" height="18" rx="1" fill="currentColor"/>
            </svg>
            <span className="font-semibold">CC Camp</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={onUploadClick}
              className="px-3 py-1.5 bg-accent text-white text-sm rounded-md font-medium flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              제출
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-muted hover:text-foreground"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-background border-b border-border"
            >
              <div className="px-4 py-3 space-y-2">
                <div className="pt-2 border-t border-border">
                  {session ? (
                    <button
                      onClick={() => { signOut(); setMobileMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-surface-2"
                    >
                      <Avatar
                        src={session.user?.image}
                        name={session.user?.name || session.user?.username}
                        size="sm"
                        showRing={false}
                        className="w-5 h-5"
                      />
                      로그아웃
                    </button>
                  ) : (
                    <button
                      onClick={() => { signIn("github"); setMobileMenuOpen(false); }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm border border-border rounded"
                    >
                      <Github className="w-4 h-4" />
                      GitHub 로그인
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
