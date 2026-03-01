"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import Leaderboard from "@/components/Leaderboard";
import NavBar from "@/components/NavBar";

export default function Home() {
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  const copyCommand = () => {
    navigator.clipboard.writeText("npx cc-camp");
    setCopiedToClipboard(true);
    setTimeout(() => setCopiedToClipboard(false), 2000);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <NavBar />

      <main className="flex-1 flex flex-col min-h-0 pt-14">
        <div className="flex-1 min-h-0">
          <Leaderboard onCopyCommand={copyCommand} copiedToClipboard={copiedToClipboard} />
        </div>
      </main>
    </div>
  );
}
