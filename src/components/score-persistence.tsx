"use client";

import { useEffect, useRef, useState } from "react";
import { Authenticated, Unauthenticated, useConvexAuth, useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { Trash2 } from "lucide-react";
import Link from "next/link";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export type LoadedScore = {
  id: Id<"scores">;
  title: string;
  abc: string;
};

type ScorePersistenceProps = {
  title: string;
  abc: string;
  hydrated: boolean;
  isPublicCatalog: boolean;
  currentScore: LoadedScore | null;
  onCurrentScoreChange: (score: LoadedScore | null) => void;
  onLibraryScoresChange: (scores: LoadedScore[]) => void;
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

function ConnectedScorePersistence({
  title,
  abc,
  hydrated,
  isPublicCatalog,
  currentScore,
  onCurrentScoreChange,
  onLibraryScoresChange,
  onStatus,
  onLoad,
}: ScorePersistenceProps) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const saveScore = useMutation(api.scores.save);
  const scores = useQuery(api.scores.listMine, isAuthenticated ? {} : "skip");
  const scoreId = useRef<Id<"scores"> | undefined>(undefined);
  const libraryScoresRef = useRef<LoadedScore[]>([]);
  const statusRef = useRef(onStatus);
  const persistenceReady = isAuthenticated && hydrated && scores !== undefined;

  useEffect(() => {
    statusRef.current = onStatus;
  }, [onStatus]);

  useEffect(() => {
    if (!scores) return;
    const nextScores = scores.map((score) => ({ id: score._id, title: score.title, abc: score.abc }));
    const scoresChanged =
      nextScores.length !== libraryScoresRef.current.length ||
      nextScores.some((score, index) => {
        const previous = libraryScoresRef.current[index];
        return !previous || previous.id !== score.id || previous.title !== score.title || previous.abc !== score.abc;
      });
    if (!scoresChanged) return;
    libraryScoresRef.current = nextScores;
    onLibraryScoresChange(nextScores);
  }, [onLibraryScoresChange, scores]);

  useEffect(() => {
    if (!persistenceReady || isPublicCatalog) return;

    if (!scoreId.current) {
      const existingScore = scores.find((score) => score.title === title && score.abc === abc);
      scoreId.current = existingScore?._id;
      if (existingScore) {
        onCurrentScoreChange({ id: existingScore._id, title: existingScore.title, abc: existingScore.abc });
      }
    }
  }, [abc, isPublicCatalog, onCurrentScoreChange, persistenceReady, scores, title]);

  useEffect(() => {
    if (!isPublicCatalog) return;
    scoreId.current = undefined;
    onCurrentScoreChange(null);
  }, [isPublicCatalog, onCurrentScoreChange]);

  useEffect(() => {
    if (isPublicCatalog) return;
    scoreId.current = currentScore?.id;
  }, [currentScore?.id, isPublicCatalog]);

  useEffect(() => {
    if (
      !isAuthenticated ||
      !hydrated ||
      !persistenceReady ||
      isPublicCatalog ||
      !abc.trim()
    ) {
      return;
    }
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
        onCurrentScoreChange({ id: savedId, title, abc });
        statusRef.current("Saved to workspace");
      } catch {
        statusRef.current("Couldn’t sync");
      }
    }, 850);
    return () => window.clearTimeout(timeout);
  }, [abc, hydrated, isAuthenticated, isPublicCatalog, onCurrentScoreChange, persistenceReady, saveScore, title]);

  useEffect(() => {
    if (!isAuthenticated) {
      scoreId.current = undefined;
      onCurrentScoreChange(null);
    }
  }, [isAuthenticated, onCurrentScoreChange]);

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
              <div className="flex items-center gap-1" key={score._id}>
                <button
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-[9px] rounded-[8px] border-0 bg-transparent p-2 text-left transition-[background-color] duration-[160ms] ease-in-out hover:bg-[var(--paper-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed"
                  type="button"
                  onClick={() => {
                    const loadedScore = { id: score._id, title: score.title, abc: score.abc };
                    scoreId.current = score._id;
                    onCurrentScoreChange(loadedScore);
                    onLoad(loadedScore);
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

export function RemoveFromLibraryButton({
  enabled,
  score,
  onRemoved,
  onStatus,
}: {
  enabled: boolean;
  score: LoadedScore | null;
  onRemoved: () => void;
  onStatus: (status: string) => void;
}) {
  if (!enabled || !score) return null;
  return <ConnectedRemoveFromLibraryButton onRemoved={onRemoved} onStatus={onStatus} score={score} />;
}

function ConnectedRemoveFromLibraryButton({
  score,
  onRemoved,
  onStatus,
}: {
  score: LoadedScore;
  onRemoved: () => void;
  onStatus: (status: string) => void;
}) {
  const removeScore = useMutation(api.scores.remove);
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    onStatus("Removing from My Songs…");
    try {
      await removeScore({ id: score.id });
      onRemoved();
      onStatus("Removed from My Songs");
    } catch {
      onStatus("Couldn’t remove from My Songs");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <button
      aria-label={`Remove ${score.title} from My Songs`}
      className="inline-flex min-h-[31px] cursor-pointer items-center justify-center gap-1.5 rounded-[7px] border border-[var(--line-strong)] bg-[var(--paper)] px-2.5 text-[10px] font-[650] text-[var(--muted)] transition-[border-color,color,opacity] duration-[160ms] ease-in-out hover:border-[var(--accent)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-[0.55]"
      disabled={removing}
      type="button"
      onClick={() => void handleRemove()}
    >
      <Trash2 size={13} strokeWidth={1.8} />
      {removing ? "Removing…" : "Remove"}
    </button>
  );
}

export function SaveToLibraryButton({
  enabled,
  hydrated,
  title,
  abc,
  onCurrentScoreChange,
  onSavedToLibrary,
  onStatus,
}: {
  enabled: boolean;
  hydrated: boolean;
  title: string;
  abc: string;
  onCurrentScoreChange: (score: LoadedScore | null) => void;
  onSavedToLibrary: () => void;
  onStatus: (status: string) => void;
}) {
  if (!enabled) return null;
  return (
    <ConnectedSaveToLibraryButton
      abc={abc}
      hydrated={hydrated}
      onCurrentScoreChange={onCurrentScoreChange}
      onSavedToLibrary={onSavedToLibrary}
      onStatus={onStatus}
      title={title}
    />
  );
}

function ConnectedSaveToLibraryButton({
  hydrated,
  title,
  abc,
  onCurrentScoreChange,
  onSavedToLibrary,
  onStatus,
}: {
  hydrated: boolean;
  title: string;
  abc: string;
  onCurrentScoreChange: (score: LoadedScore | null) => void;
  onSavedToLibrary: () => void;
  onStatus: (status: string) => void;
}) {
  const { isAuthenticated } = useConvexAuth();
  const saveScore = useMutation(api.scores.save);
  const scores = useQuery(api.scores.listMine, isAuthenticated ? {} : "skip");
  const [savingCopy, setSavingCopy] = useState(false);
  const persistenceReady = isAuthenticated && hydrated && scores !== undefined;

  if (!isAuthenticated) return null;

  async function handleSaveToLibrary() {
    if (!persistenceReady || !abc.trim()) return;

    setSavingCopy(true);
    onStatus("Saving to My Songs…");
    try {
      const savedId = await saveScore({
        title,
        abc,
        updatedAt: Date.now(),
      });
      onCurrentScoreChange({ id: savedId, title, abc });
      onSavedToLibrary();
      onStatus("Saved to My Songs");
    } catch {
      onStatus("Couldn’t save to My Songs");
    } finally {
      setSavingCopy(false);
    }
  }

  return (
    <button
      className="inline-flex min-h-[32px] cursor-pointer items-center justify-center rounded-[7px] border border-[var(--accent)] bg-[var(--accent)] px-2.5 text-[10px] font-[680] text-white transition-[background-color,border-color,opacity] duration-[160ms] ease-in-out hover:border-[var(--accent-deep)] hover:bg-[var(--accent-deep)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-[0.55]"
      disabled={savingCopy}
      type="button"
      onClick={() => void handleSaveToLibrary()}
    >
      {savingCopy ? "Saving…" : "Save to My Songs"}
    </button>
  );
}

export function AdminPublishButton({
  enabled,
  score,
  onStatus,
}: {
  enabled: boolean;
  score: LoadedScore | null;
  onStatus: (status: string) => void;
}) {
  if (!enabled || !score) return null;
  return <ConnectedAdminPublishButton onStatus={onStatus} score={score} />;
}

export function AdminDeletePublicSongButton({
  enabled,
  catalogId,
  onDeleted,
  onStatus,
}: {
  enabled: boolean;
  catalogId: Id<"catalogCharts"> | null;
  onDeleted: () => void;
  onStatus: (status: string) => void;
}) {
  if (!enabled || !catalogId) return null;
  return <ConnectedAdminDeletePublicSongButton catalogId={catalogId} onDeleted={onDeleted} onStatus={onStatus} />;
}

function ConnectedAdminDeletePublicSongButton({
  catalogId,
  onDeleted,
  onStatus,
}: {
  catalogId: Id<"catalogCharts">;
  onDeleted: () => void;
  onStatus: (status: string) => void;
}) {
  const { user } = useUser();
  const removeCatalogChart = useMutation(api.catalog.remove);
  const [removing, setRemoving] = useState(false);
  const isAdmin = user?.publicMetadata?.role === "admin";

  if (!isAdmin) return null;

  async function handleRemove() {
    setRemoving(true);
    onStatus("Deleting from public catalog…");
    try {
      await removeCatalogChart({ id: catalogId });
      onDeleted();
      onStatus("Deleted from public catalog");
    } catch {
      onStatus("Couldn’t delete from public catalog");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <button
      aria-label="Delete public song"
      className="inline-flex min-h-[31px] cursor-pointer items-center justify-center gap-1.5 rounded-[7px] border border-[var(--line-strong)] bg-[var(--paper)] px-2.5 text-[10px] font-[650] text-[var(--muted)] transition-[border-color,color,opacity] duration-[160ms] ease-in-out hover:border-[var(--accent)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-[0.55]"
      disabled={removing}
      type="button"
      onClick={() => void handleRemove()}
    >
      <Trash2 size={13} strokeWidth={1.8} />
      {removing ? "Deleting…" : "Delete"}
    </button>
  );
}

function ConnectedAdminPublishButton({
  score,
  onStatus,
}: {
  score: LoadedScore;
  onStatus: (status: string) => void;
}) {
  const { user } = useUser();
  const publishFromLibrary = useMutation(api.catalog.publishFromLibrary);
  const [publishing, setPublishing] = useState(false);
  const isAdmin = user?.publicMetadata?.role === "admin";

  if (!isAdmin) return null;

  async function handlePublish() {
    setPublishing(true);
    onStatus("Publishing…");
    try {
      await publishFromLibrary({ scoreId: score.id });
      onStatus("Published to public catalog");
    } catch {
      onStatus("Couldn’t publish");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <button
      aria-label={`Publish ${score.title} to public catalog`}
      className="inline-flex min-h-[31px] cursor-pointer items-center justify-center rounded-[7px] border border-[var(--line-strong)] bg-[var(--paper)] px-2.5 text-[10px] font-[650] text-[var(--muted)] transition-[border-color,color,opacity] duration-[160ms] ease-in-out hover:border-[var(--accent)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-[0.55]"
      disabled={publishing}
      type="button"
      onClick={() => void handlePublish()}
    >
      {publishing ? "Publishing…" : "Publish"}
    </button>
  );
}
