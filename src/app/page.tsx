"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Merge, X, Terminal, Copy, Check } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import Leaderboard from "@/components/Leaderboard";
import NavBar from "@/components/NavBar";
import { useSession } from "next-auth/react";
import { useCheckClaimableSubmissions, useClaimAndMergeSubmissions } from "@/lib/data/hooks/useSubmissions";

export default function Home() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [showMergeBanner, setShowMergeBanner] = useState(true);
  const [merging, setMerging] = useState(false);

  const { data: session } = useSession();
  const { data: claimStatus } = useCheckClaimableSubmissions(
    session?.user?.username || undefined
  );
  const { mutate: claimAndMerge } = useClaimAndMergeSubmissions();

  const copyCommand = () => {
    navigator.clipboard.writeText("npx cc-camp");
    setCopiedToClipboard(true);
    setTimeout(() => setCopiedToClipboard(false), 2000);
  };

  const handleClaimAndMerge = async () => {
    if (!session?.user?.username) return;

    setMerging(true);
    try {
      await claimAndMerge(session.user.username);
      setShowMergeBanner(false);
      window.location.reload();
    } catch (error) {
      console.error("Failed to process:", error);
      alert("처리에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <NavBar
        onUploadClick={() => setShowUploadModal(true)}
        onUpdatesClick={() => {}}
      />

      {/* Claim/Merge Banner */}
      <AnimatePresence>
        {showMergeBanner && claimStatus?.actionNeeded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-shrink-0 bg-accent/10 border-b border-accent/20 px-4 py-2 mt-14 md:mt-16"
          >
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Merge className="w-4 h-4 text-accent" />
                <span>{claimStatus.actionText}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClaimAndMerge}
                  disabled={merging}
                  className="px-3 py-1 bg-accent text-[#1C1917] text-xs rounded font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {merging ? "..." : claimStatus.actionNeeded === "claim" ? "인증" : "병합"}
                </button>
                <button onClick={() => setShowMergeBanner(false)} className="text-muted hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col min-h-0 ${!(showMergeBanner && claimStatus?.actionNeeded) ? 'pt-14' : ''}`}>
        <div className="flex-1 min-h-0">
          <Leaderboard onCopyCommand={copyCommand} copiedToClipboard={copiedToClipboard} />
        </div>
      </main>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowUploadModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-card border border-border rounded-lg shadow-xl max-w-sm w-full"
            >
              <div className="px-4 py-3 flex items-center justify-between border-b border-border">
                <h3 className="font-medium">사용량 제출</h3>
                <button onClick={() => setShowUploadModal(false)} className="p-1 text-muted hover:text-foreground rounded hover:bg-surface-2">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                {/* CLI option */}
                <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Terminal className="w-4 h-4 text-accent" />
                      <span className="font-medium">CLI (추천)</span>
                    </div>
                  </div>
                  <button
                    onClick={copyCommand}
                    className="w-full flex items-center justify-between gap-2 bg-background rounded-md px-3 py-2 border border-border hover:border-accent/50 transition-colors"
                  >
                    <code className="text-sm font-mono text-accent">npx cc-camp</code>
                    {copiedToClipboard ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted" />
                    )}
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted">또는</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Upload option */}
                <div>
                  <div className="flex items-center gap-2 mb-2 text-sm">
                    <Upload className="w-4 h-4 text-muted" />
                    <span className="font-medium">cc.json 파일 업로드</span>
                  </div>
                  <FileUpload onSuccess={() => setShowUploadModal(false)} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
