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

function ConnectedScorePersistence({ title, abc, onStatus, onLoad }: ScorePersistenceProps) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const saveScore = useMutation(api.scores.save);
  const scores = useQuery(api.scores.listMine, isAuthenticated ? {} : "skip");
  const scoreId = useRef<Id<"scores"> | undefined>(undefined);
  const statusRef = useRef(onStatus);

  useEffect(() => {
    statusRef.current = onStatus;
  }, [onStatus]);

  useEffect(() => {
    if (!isAuthenticated || !abc.trim()) return;
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
  }, [abc, isAuthenticated, saveScore, title]);

  useEffect(() => {
    if (isLoading) statusRef.current("Connecting…");
    if (!isLoading && !isAuthenticated) statusRef.current("Sign in to sync");
  }, [isAuthenticated, isLoading]);

  return (
    <div className="recent-list" aria-label="Saved charts">
      <Authenticated>
        {scores?.length ? (
          scores.map((score) => (
            <button
              className="recent-score"
              key={score._id}
              type="button"
              onClick={() => {
                scoreId.current = score._id;
                onLoad({ id: score._id, title: score.title, abc: score.abc });
                statusRef.current("Loaded from workspace");
              }}
            >
              <span className="recent-score-icon">♪</span>
              <span className="recent-score-copy">
                <span className="recent-score-title">{score.title}</span>
                <span className="recent-score-meta">{new Date(score.updatedAt).toLocaleDateString()}</span>
              </span>
            </button>
          ))
        ) : (
          <div className="library-empty">Your saved charts will appear here.</div>
        )}
      </Authenticated>
      <Unauthenticated>
        <div className="library-empty">
          <Link className="library-auth-link" href="/sign-in">
            Sign in
          </Link>{" "}
          to sync charts across devices.
        </div>
      </Unauthenticated>
    </div>
  );
}
