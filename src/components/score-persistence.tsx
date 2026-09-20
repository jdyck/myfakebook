"use client";

import { useEffect, useRef } from "react";
import { Authenticated, Unauthenticated, useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type LoadedScore = {
  id: Id<"scores">;
  title: string;
  abc: string;
};

type ScorePersistenceProps = {
  title: string;
  abc: string;
  hydrated: boolean;
  onStatus: (status: string) => void;
  onLoad: (score: LoadedScore) => void;
};

export function ScorePersistence({
  enabled,
  ...props
}: ScorePersistenceProps & { enabled: boolean }) {
  if (!enabled) return null;
  return <ConnectedScorePersistence {...props} />;
}

function ConnectedScorePersistence({ title, abc, hydrated, onStatus, onLoad }: ScorePersistenceProps) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const saveScore = useMutation(api.scores.save);
  const scores = useQuery(api.scores.listMine, isAuthenticated ? {} : "skip");
  const scoreId = useRef<Id<"scores"> | undefined>(undefined);
  const statusRef = useRef(onStatus);
  const persistenceReady = isAuthenticated && hydrated && scores !== undefined;

  useEffect(() => {
    statusRef.current = onStatus;
  }, [onStatus]);

  useEffect(() => {
    if (!persistenceReady) return;

    if (!scoreId.current) {
      const existingScore = scores.find((score) => score.title === title && score.abc === abc);
      scoreId.current = existingScore?._id;
    }
  }, [abc, persistenceReady, scores, title]);

  useEffect(() => {
    if (!isAuthenticated || !hydrated || !persistenceReady || !abc.trim()) return;
    statusRef.current("Saving…");
    const timeout = window.setTimeout(async () => {
      try {
        const savedId = await saveScore({
          id: scoreId.current,
          title,
          abc,
          updatedAt: Date.now(),
        });
        scoreId.current = savedId;
        statusRef.current("Saved to workspace");
      } catch {
        statusRef.current("Couldn’t sync");
      }
    }, 850);
    return () => window.clearTimeout(timeout);
  }, [abc, hydrated, isAuthenticated, persistenceReady, saveScore, title]);

  useEffect(() => {
    if (!isAuthenticated) {
      scoreId.current = undefined;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isLoading) statusRef.current("Connecting…");
    if (!isLoading && !isAuthenticated) statusRef.current("Sign in to sync");
  }, [isAuthenticated, isLoading]);

  return (
    <div className="mt-[17px] grid gap-[3px]" aria-label="Saved charts">
      <Authenticated>
        {scores?.length ? (
          scores
            .filter(
              (score, index, allScores) =>
                allScores.findIndex((candidate) => candidate.title === score.title && candidate.abc === score.abc) === index,
            )
            .map((score) => (
              <button
                className="flex w-full cursor-pointer items-center gap-[9px] rounded-[8px] border-0 bg-transparent p-2 text-left transition-[background-color] duration-[160ms] ease-in-out hover:bg-[var(--paper-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed"
                key={score._id}
                type="button"
                onClick={() => {
                  scoreId.current = score._id;
                  onLoad({ id: score._id, title: score.title, abc: score.abc });
                  statusRef.current("Loaded from workspace");
                }}
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-[6px] border border-[var(--accent-soft)] bg-[var(--accent-soft)] text-[13px] text-[var(--accent-deep)]">
                  ♪
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-[620] text-[var(--ink)]">{score.title}</span>
                  <span className="mt-0.5 block text-[10px] text-[var(--muted-soft)]">
                    {new Date(score.updatedAt).toLocaleDateString()}
                  </span>
                </span>
              </button>
            ))
        ) : (
          <div className="px-2 py-3.5 text-[10px] leading-[1.5] text-[var(--muted-soft)]">
            Your saved charts will appear here.
          </div>
        )}
      </Authenticated>
      <Unauthenticated>
        <div className="px-2 py-3.5 text-[10px] leading-[1.5] text-[var(--muted-soft)]">
          <Link
            className="font-[650] text-[var(--accent-deep)] no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            href="/sign-in"
          >
            Sign in
          </Link>{" "}
          to sync charts across devices.
        </div>
      </Unauthenticated>
    </div>
  );
}
