"use client";

import { useEffect, useRef, useState } from "react";
import { Authenticated, Unauthenticated, useConvexAuth, useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
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
  isPublicCatalog: boolean;
  onStatus: (status: string) => void;
  onLoad: (score: LoadedScore) => void;
  onSavedToLibrary: () => void;
};

export function ScorePersistence({
  enabled,
  ...props
}: ScorePersistenceProps & { enabled: boolean }) {
  if (!enabled) return null;
  return <ConnectedScorePersistence {...props} />;
}

function ConnectedScorePersistence({
  title,
  abc,
  hydrated,
  isPublicCatalog,
  onStatus,
  onLoad,
  onSavedToLibrary,
}: ScorePersistenceProps) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { user } = useUser();
  const saveScore = useMutation(api.scores.save);
  const publishFromLibrary = useMutation(api.catalog.publishFromLibrary);
  const scores = useQuery(api.scores.listMine, isAuthenticated ? {} : "skip");
  const scoreId = useRef<Id<"scores"> | undefined>(undefined);
  const statusRef = useRef(onStatus);
  const [publishingId, setPublishingId] = useState<Id<"scores"> | null>(null);
  const [savingCopy, setSavingCopy] = useState(false);
  const isAdmin = user?.publicMetadata?.role === "admin";
  const persistenceReady = isAuthenticated && hydrated && scores !== undefined;

  useEffect(() => {
    statusRef.current = onStatus;
  }, [onStatus]);

  useEffect(() => {
    if (!persistenceReady || isPublicCatalog) return;

    if (!scoreId.current) {
      const existingScore = scores.find((score) => score.title === title && score.abc === abc);
      scoreId.current = existingScore?._id;
    }
  }, [abc, isPublicCatalog, persistenceReady, scores, title]);

  useEffect(() => {
    if (isPublicCatalog) scoreId.current = undefined;
  }, [isPublicCatalog]);

  useEffect(() => {
    if (!isAuthenticated || !hydrated || !persistenceReady || isPublicCatalog || !abc.trim()) return;
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
  }, [abc, hydrated, isAuthenticated, isPublicCatalog, persistenceReady, saveScore, title]);

  useEffect(() => {
    if (!isAuthenticated) {
      scoreId.current = undefined;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isLoading) statusRef.current("Connecting…");
    if (!isLoading && !isAuthenticated) statusRef.current("Sign in to sync");
  }, [isAuthenticated, isLoading]);

  async function handlePublish(score: LoadedScore) {
    setPublishingId(score.id);
    statusRef.current("Publishing…");
    try {
      await publishFromLibrary({ scoreId: score.id });
      statusRef.current("Published to public catalog");
    } catch {
      statusRef.current("Couldn’t publish");
    } finally {
      setPublishingId(null);
    }
  }

  async function handleSaveToLibrary() {
    if (!persistenceReady || !abc.trim()) return;

    setSavingCopy(true);
    statusRef.current("Saving to My Songs…");
    try {
      const savedId = await saveScore({
        title,
        abc,
        updatedAt: Date.now(),
      });
      scoreId.current = savedId;
      onSavedToLibrary();
      statusRef.current("Saved to My Songs");
    } catch {
      statusRef.current("Couldn’t save to My Songs");
    } finally {
      setSavingCopy(false);
    }
  }

  return (
    <div className="mt-[17px] grid gap-[3px]" aria-label="Saved charts">
      <Authenticated>
        {isPublicCatalog && (
          <button
            className="mb-2 inline-flex min-h-[32px] cursor-pointer items-center justify-center rounded-[7px] border border-[var(--accent)] bg-[var(--accent)] px-2.5 text-[10px] font-[680] text-white transition-[background-color,border-color,opacity] duration-[160ms] ease-in-out hover:border-[var(--accent-deep)] hover:bg-[var(--accent-deep)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-[0.55]"
            disabled={savingCopy}
            type="button"
            onClick={() => void handleSaveToLibrary()}
          >
            {savingCopy ? "Saving…" : "Save to My Songs"}
          </button>
        )}
        {scores?.length ? (
          scores
            .filter(
              (score, index, allScores) =>
                allScores.findIndex((candidate) => candidate.title === score.title && candidate.abc === score.abc) === index,
            )
            .map((score) => (
              <div className="flex items-center gap-1" key={score._id}>
                <button
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-[9px] rounded-[8px] border-0 bg-transparent p-2 text-left transition-[background-color] duration-[160ms] ease-in-out hover:bg-[var(--paper-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed"
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
                {isAdmin && (
                  <button
                    aria-label={`Publish ${score.title} to public catalog`}
                    className="shrink-0 rounded-[6px] border border-[var(--line-strong)] bg-[var(--paper)] px-1.5 py-1 text-[9px] font-[650] text-[var(--muted)] transition-[border-color,color,opacity] duration-[160ms] ease-in-out hover:border-[var(--accent)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-[0.55]"
                    disabled={publishingId === score._id}
                    type="button"
                    onClick={() => void handlePublish({ id: score._id, title: score.title, abc: score.abc })}
                  >
                    {publishingId === score._id ? "Publishing…" : "Publish"}
                  </button>
                )}
              </div>
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
