"use client";

import { useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, Award, DollarSign, Zap, Calendar, X, BadgeCheck, Loader2, Terminal, Copy, Check, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import Avatar from "./Avatar";
import { formatNumber, formatCurrency } from "@/lib/utils";
import { useLeaderboard, useLeaderboardByDateRange } from "@/lib/data/hooks/useSubmissions";
import { useGlobalStats } from "@/lib/data/hooks/useStats";
import type { Submission } from "@/lib/data/types";

type SortBy = "cost" | "tokens";

interface LeaderboardProps {
  onCopyCommand?: () => void;
  copiedToClipboard?: boolean;
}

export default function Leaderboard({ onCopyCommand, copiedToClipboard }: LeaderboardProps) {
  const [sortBy, setSortBy] = useState<SortBy>("tokens");
  // Default to "오늘" (KST)
  const getKstDateStatic = (date: Date = new Date()) =>
    new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState<string>(getKstDateStatic());
  const [dateTo, setDateTo] = useState<string>(getKstDateStatic());
  const [showFilters, setShowFilters] = useState(false);
  const { data: session } = useSession();
  const { data: globalStats } = useGlobalStats();

  // Always fetch all participants (full list — fallback when no date filter)
  const { data: allParticipantsResult, isLoading } = useLeaderboard(
    { sortBy, page: 0, pageSize: 200 }
  );

  // Fetch date-filtered data
  const { data: dateFilteredResult, isLoading: isDateFilterLoading } = useLeaderboardByDateRange(
    dateFrom && dateTo ? { dateFrom, dateTo, sortBy, limit: 200 } : "skip"
  );

  // Previous period for rank change comparison
  const prevPeriod = useMemo(() => {
    if (!dateFrom || !dateTo) return null;
    const from = new Date(dateFrom + "T00:00:00");
    const to = new Date(dateTo + "T00:00:00");
    const diffMs = to.getTime() - from.getTime();
    const diffDays = Math.max(1, Math.round(diffMs / (24 * 60 * 60 * 1000)) + 1);
    const prevTo = new Date(from);
    prevTo.setDate(prevTo.getDate() - 1);
    const prevFrom = new Date(prevTo);
    prevFrom.setDate(prevFrom.getDate() - diffDays + 1);
    return {
      dateFrom: prevFrom.toISOString().split('T')[0],
      dateTo: prevTo.toISOString().split('T')[0],
    };
  }, [dateFrom, dateTo]);

  const { data: prevPeriodResult } = useLeaderboardByDateRange(
    prevPeriod ? { dateFrom: prevPeriod.dateFrom, dateTo: prevPeriod.dateTo, sortBy, limit: 100 } : "skip"
  );

  const prevRankMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!prevPeriodResult?.items) return map;
    prevPeriodResult.items.forEach((item, index) => {
      const key = item.githubUsername || item.username;
      map.set(key, index + 1);
    });
    return map;
  }, [prevPeriodResult]);

  // Cache last good items — never show empty state during filter transitions
  const lastGoodItems = useRef<Submission[]>([]);

  const allItems = useMemo(() => {
    let items: Submission[] = [];

    if (dateFrom && dateTo) {
      if (dateFilteredResult?.items) {
        items = dateFilteredResult.items;
      }
    } else if (allParticipantsResult?.items) {
      items = allParticipantsResult.items;
    }

    if (items.length > 0) {
      lastGoodItems.current = items;
      return items;
    }

    // During loading, return cached previous data
    return lastGoodItems.current;
  }, [dateFrom, dateTo, dateFilteredResult, allParticipantsResult]);

  const filterDays = useMemo(() => {
    if (!dateFrom || !dateTo) return 1;
    const diffMs = new Date(dateTo + "T00:00:00").getTime() - new Date(dateFrom + "T00:00:00").getTime();
    return Math.max(1, Math.round(diffMs / (24 * 60 * 60 * 1000)) + 1);
  }, [dateFrom, dateTo]);

  // Camp-wide totals
  const campStats = useMemo(() => {
    const totalTokens = allItems.reduce((sum, item) => sum + item.totalTokens, 0);
    const activeCount = allItems.filter(item => item.totalTokens > 0).length;
    const perPersonGoal = 20_000_000; // 20M per person per day
    const goal = perPersonGoal * allItems.length * filterDays;
    const progress = Math.min(totalTokens / goal, 1);
    return { totalTokens, activeCount, goal, progress };
  }, [allItems, filterDays]);

  const getLevelEmoji = (tokens: number) => {
    if (tokens >= 500_000_000) return "🐉";
    if (tokens >= 300_000_000) return "🦅";
    if (tokens >= 150_000_000) return "🦚";
    if (tokens >= 80_000_000) return "🦩";
    if (tokens >= 40_000_000) return "🕊️";
    if (tokens >= 20_000_000) return "🦉";
    if (tokens >= 8_000_000) return "🐓";
    if (tokens >= 3_000_000) return "🐥";
    if (tokens >= 1_000_000) return "🐣";
    return "🥚";
  };

  const getRankChange = (username: string, currentRank: number) => {
    if (!prevPeriod || prevRankMap.size === 0) return null;
    // 이전 기간 참가자가 현재의 절반 미만이면 비교가 무의미 → 표시 안 함
    if (prevRankMap.size < allItems.length * 0.5) return null;
    const prevRank = prevRankMap.get(username);
    if (prevRank === undefined) return { type: 'new' as const };
    const diff = prevRank - currentRank;
    if (diff > 0) return { type: 'up' as const, value: diff };
    if (diff < 0) return { type: 'down' as const, value: Math.abs(diff) };
    return { type: 'same' as const };
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-4 h-4 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-gray-400" />;
    if (rank === 3) return <Award className="w-4 h-4 text-amber-600" />;
    return null;
  };

  const getRankStyle = (_rank: number) => {
    return "";
  };

  const setQuickFilter = (days: number | null) => {
    if (days === 0) {
      const t = getKstDateStatic();
      setDateFrom(t);
      setDateTo(t);
    } else if (days) {
      const now = new Date();
      const from = new Date(now);
      from.setDate(now.getDate() - days);
      setDateFrom(getKstDateStatic(from));
      setDateTo(getKstDateStatic(now));
    }
  };

  const isQuickFilterActive = (days: number | null) => {
    if (!dateFrom || !dateTo) return false;
    if (days === 0) {
      const t = getKstDateStatic();
      return dateFrom === t && dateTo === t;
    }
    if (days === null) return false;
    const diff = Math.round((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (24 * 60 * 60 * 1000));
    return diff === days;
  };

  return (
    <div className="h-full flex flex-col max-w-3xl mx-auto w-full">
      {/* Header — Camp Meter */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-border">
        {allItems.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] sm:text-xs text-muted">더 많이 쓰는 사람이 더 빠르게 성장합니다 🔥</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted" />
                <span className="text-sm text-muted">활동</span>
                <span className="text-lg font-bold">{campStats.activeCount}<span className="text-sm text-muted font-normal">/{allItems.length}</span></span>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm">
                  <span className="font-bold text-accent">{formatNumber(campStats.totalTokens)}</span>
                  <span className="text-muted"> / {formatNumber(campStats.goal)}</span>
                </div>
                <div className="text-[10px] text-muted">{Math.round(campStats.progress * 100)}%</div>
              </div>
            </div>
            <div className="relative h-2.5 bg-surface-2 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ background: campStats.progress >= 1 ? "linear-gradient(90deg, #22c55e, #4ade80)" : "linear-gradient(90deg, var(--accent), #f59e0b)" }}
                initial={{ width: 0 }}
                animate={{ width: `${campStats.progress * 100}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-base sm:text-xl font-bold">AI Native Camp 리더보드</h1>
            <p className="text-[10px] sm:text-xs text-muted mt-0.5">더 많이 쓰는 사람이 더 빠르게 성장합니다 🔥</p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 px-6 py-2 border-b border-border bg-surface-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {[
              { label: "오늘", days: 0 },
              { label: "7일", days: 7 },
            ].map(({ label, days }) => (
              <button
                key={label}
                onClick={() => setQuickFilter(days)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  isQuickFilterActive(days) ? "bg-accent text-[#1C1917]" : "text-muted hover:text-foreground hover:bg-surface-2"
                }`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-md transition-colors ${showFilters ? "text-accent" : "text-muted hover:text-foreground"}`}
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSortBy("cost")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                sortBy === "cost" ? "bg-accent text-[#1C1917]" : "text-muted hover:text-foreground hover:bg-surface-2"
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">비용</span>
            </button>
            <button
              onClick={() => setSortBy("tokens")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                sortBy === "tokens" ? "bg-accent text-[#1C1917]" : "text-muted hover:text-foreground hover:bg-surface-2"
              }`}
            >
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">토큰</span>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 pt-3 text-sm">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-1.5 bg-background border border-border rounded-md"
                />
                <span className="text-muted">→</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-1.5 bg-background border border-border rounded-md"
                />
                {(dateFrom || dateTo) && (
                  <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-muted hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto">
        {allItems.length > 0 ? (
          <div>
            {/* Column Headers */}
            <div className="flex items-center gap-3 px-6 py-2 text-xs text-muted border-b border-border sticky top-0 z-10" style={{ backgroundColor: "var(--background)" }}>
              <div className="w-8 text-center">#</div>
              <div className="w-8 text-center"></div>
              <div className="flex-1">캠퍼</div>
              <div className="w-16 text-center hidden md:block">7일</div>
              <div className={`w-24 text-right ${sortBy === "tokens" ? "hidden sm:block" : ""}`}>비용</div>
              <div className={`w-24 text-right ${sortBy === "cost" ? "hidden sm:block" : ""}`}>토큰</div>
            </div>

            <div className="divide-y divide-border">
              {allItems.map((submission, index) => {
                const rank = index + 1;
                const isCurrentUser = session?.user?.username === submission.githubUsername;
                const rankIcon = getRankIcon(rank);

                return (
                  <motion.div
                    key={submission.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.5) }}
                    className={`flex items-center gap-3 px-6 py-3.5 transition-colors hover:bg-white/[0.03] ${getRankStyle(rank)} ${isCurrentUser ? "bg-accent/10 border-l-2 border-l-accent" : ""}`}
                  >
                    {/* Rank */}
                    <div className="w-8 flex-shrink-0 text-center">
                      {rankIcon || <span className="text-sm text-muted font-mono">{rank}</span>}
                    </div>
                    {/* Rank Change */}
                    <div className="w-8 flex-shrink-0 text-center">
                      {(() => {
                        const change = getRankChange(submission.githubUsername || submission.username, rank);
                        if (!change) return null;
                        if (change.type === 'new') return <span className="text-[10px] font-bold text-accent">NEW</span>;
                        if (change.type === 'up') return <span className="text-[10px] font-bold text-green-500">▲{change.value}</span>;
                        if (change.type === 'down') return <span className="text-[10px] font-bold text-red-400">▼{change.value}</span>;
                        return null;
                      })()}
                    </div>

                    {/* User */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="relative flex-shrink-0">
                        <span className="text-xl" title={`${formatNumber(submission.totalTokens)} tokens`}>
                          {getLevelEmoji(Math.round(submission.totalTokens / filterDays))}
                        </span>
                        {submission.githubAvatar && (
                          <img
                            src={submission.githubAvatar}
                            alt=""
                            className="absolute -bottom-0.5 -right-1 w-3.5 h-3.5 rounded-full ring-1 ring-background"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">
                            {submission.githubUsername || submission.username}
                          </span>
                          {submission.verified && (
                            <div className="relative group/badge">
                              <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-card border border-border rounded text-[10px] text-muted whitespace-nowrap opacity-0 group-hover/badge:opacity-100 transition-opacity pointer-events-none">
                                GitHub 인증됨
                              </div>
                            </div>
                          )}
                        </div>
                        {submission.githubName && submission.githubName !== submission.githubUsername && (
                          <div className="text-xs text-muted truncate">{submission.githubName}</div>
                        )}
                      </div>
                    </div>

                    {/* Sparkline */}
                    <div className="w-16 flex-shrink-0 hidden md:flex items-center justify-center">
                      <Sparkline data={submission.dailyBreakdown} />
                    </div>

                    {/* Cost */}
                    <div className={`w-24 text-right flex-shrink-0 ${sortBy === "tokens" ? "hidden sm:block" : ""}`}>
                      {submission.totalCost > 0 ? (
                        <div className="text-sm font-mono font-semibold text-accent">${formatCurrency(submission.totalCost)}</div>
                      ) : (
                        <div className="text-sm font-mono text-muted/30">—</div>
                      )}
                    </div>

                    {/* Tokens */}
                    <div className={`w-24 text-right flex-shrink-0 ${sortBy === "cost" ? "hidden sm:block" : ""}`}>
                      {submission.totalTokens > 0 ? (
                        <div className="text-sm font-mono text-muted">{formatNumber(submission.totalTokens)}</div>
                      ) : (
                        <div className="text-sm font-mono text-muted/30">—</div>
                      )}
                    </div>

                  </motion.div>
                );
              })}

              {/* All participants loaded at once, no pagination needed */}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center">
            <img
              src="/delta-society-logo.png"
              alt="Delta Society"
              className="w-14 h-14 animate-pulse"
            />
            <span
              className="mt-3 text-sm font-semibold tracking-[0.02em] text-muted"
              style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
            >
              Delta Society
            </span>
          </div>
        )}
      </div>

      {/* How to Join — collapsible */}
      {allItems.length > 0 && (
        <CollapsibleJoin />
      )}

      {/* Level Guide */}
      <div className="flex-shrink-0 px-6 py-1.5 border-t border-border">
        <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 text-[9px] sm:text-[11px] text-muted flex-wrap">
          <span>🥚~1M</span>
          <span>🐣1M</span>
          <span>🐥3M</span>
          <span>🐓8M</span>
          <span>🦉20M</span>
          <span>🕊️40M</span>
          <span>🦩80M</span>
          <span>🦚150M</span>
          <span>🦅300M</span>
          <span>🐉500M</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-6 py-2 border-t border-border text-center text-[10px] sm:text-xs text-muted">
        Made by{" "}
        <a href="https://thefuturemundane.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors underline underline-offset-2">Sung Kim</a>
        {" · "}
        <a href="https://deltasociety.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors underline underline-offset-2">Delta Society</a>
      </div>

    </div>
  );
}

function CollapsibleJoin() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex-shrink-0 border-t border-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-2 text-[10px] sm:text-xs text-muted hover:text-foreground transition-colors flex items-center justify-center gap-1"
      >
        <Terminal className="w-3 h-3" />
        <span>참여 / 삭제 방법</span>
        <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <HowToJoin compact />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HowToJoin({ compact = false }: { compact?: boolean }) {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const copyText = (text: string, step: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(step);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const setupCmd = "npx cc-camp";

  if (compact) {
    return (
      <div className="px-6 py-3 sm:py-4 space-y-1.5 sm:space-y-2 text-[10px] sm:text-xs text-muted">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="flex-shrink-0 w-12 sm:w-16 font-normal">참여하려면</span>
          <span className="text-muted hidden sm:inline">터미널에</span>
          <button
            onClick={() => copyText(setupCmd, 0)}
            className="flex items-center gap-1 sm:gap-1.5 bg-background rounded px-1.5 sm:px-2 py-0.5 sm:py-1 border border-border hover:border-accent/50 transition-colors"
          >
            <code className="font-mono text-accent">{setupCmd}</code>
            {copiedStep === 0 ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted" />}
          </button>
          <span className="text-muted hidden sm:inline">입력 (최초 1회, 이후 자동)</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="flex-shrink-0 w-12 sm:w-16 font-normal">삭제하려면</span>
          <span className="text-muted hidden sm:inline">터미널에</span>
          <button
            onClick={() => copyText("npx cc-camp remove", 1)}
            className="flex items-center gap-1 sm:gap-1.5 bg-background rounded px-1.5 sm:px-2 py-0.5 sm:py-1 border border-border hover:border-accent/50 transition-colors"
          >
            <code className="font-mono text-accent">npx cc-camp remove</code>
            {copiedStep === 1 ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted" />}
          </button>
          <span className="text-muted hidden sm:inline">입력</span>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 px-6 max-w-md mx-auto text-center">
      <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-accent mx-auto mb-4" />
      <h2 className="text-base sm:text-lg font-bold mb-1">아직 참가자가 없습니다</h2>
      <p className="text-xs sm:text-sm text-muted mb-8">아무 터미널에서 아래 명령어를 입력하세요</p>

      <div className="space-y-3 text-left">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted flex-shrink-0 w-16">참여하려면</span>
          <span className="text-xs text-muted">터미널에</span>
          <button
            onClick={() => copyText(setupCmd, 0)}
            className="flex items-center gap-2 bg-surface-1 rounded-lg px-4 py-2.5 border border-border hover:border-accent/50 transition-colors group"
          >
            <code className="text-sm font-mono text-accent font-medium">{setupCmd}</code>
            {copiedStep === 0 ? (
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            ) : (
              <Copy className="w-4 h-4 text-muted group-hover:text-foreground flex-shrink-0" />
            )}
          </button>
          <span className="text-xs text-muted">입력</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted flex-shrink-0 w-16">삭제하려면</span>
          <span className="text-xs text-muted">터미널에</span>
          <button
            onClick={() => copyText("npx cc-camp remove", 1)}
            className="flex items-center gap-2 bg-surface-1 rounded-lg px-4 py-2.5 border border-border hover:border-accent/50 transition-colors group"
          >
            <code className="text-sm font-mono text-accent font-medium">npx cc-camp remove</code>
            {copiedStep === 1 ? (
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            ) : (
              <Copy className="w-4 h-4 text-muted group-hover:text-foreground flex-shrink-0" />
            )}
          </button>
          <span className="text-xs text-muted">입력</span>
        </div>
      </div>

      <p className="text-xs text-muted mt-6">
        최초 1회만 설정하면 이후 자동으로 리더보드에 반영됩니다
      </p>
    </div>
  );
}

function Sparkline({ data }: { data?: { date: string; totalTokens: number }[] }) {
  if (!data || data.length < 2) return <span className="text-[10px] text-muted/30">—</span>;

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  const values = sorted.map(d => d.totalTokens);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const w = 56;
  const h = 20;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });

  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.6}
      />
    </svg>
  );
}
