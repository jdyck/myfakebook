"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import { Header } from "@/components/app-shell/header/header";
import { PreviewPanel } from "@/components/songs/preview/preview-panel";
import { DEFAULT_DISPLAY_SETTINGS } from "@/lib/notation/abc-display";
import binderStyles from "./binder-detail.module.css";
import titleStyles from "@/components/ui/page-title.module.css";
import styles from "@/components/library/editorial-library.module.css";

type PublicBinder = NonNullable<FunctionReturnType<typeof api.binders.getPublic>>;
export function PublicBinderView({ binder }: { binder: PublicBinder }) {
  const [selected, setSelected] = useState<string | null>(null);
  const song = binder.items.find(item => item.songId === selected) ?? binder.items[0];
  return <>
    <section className={styles.pageHeading}>
      <div className={binderStyles.titleAndDetails}>
        <Link className={binderStyles.binderBackLink} href="/binders">← All binders</Link>
        <h1 className={`${titleStyles.title} ${binderStyles.binderTitle}`}>{binder.name}</h1>
      </div>
      <p className={styles.eyebrow}>Published binder</p>
    </section>
    <div className={binderStyles.binderWorkspace}>
      <aside className={binderStyles.binderSidebar} aria-label="Binder songs">
        <div className={binderStyles.songsSectionHeader}>
          <h2 className={binderStyles.songsSectionTitle}>Songs</h2>
          <span className={binderStyles.songCount}>{String(binder.items.length).padStart(2, "0")}</span>
        </div>
        <ol className={binderStyles.orderedSongList}>{binder.items.map((item, index) => <li key={item.songId}
          className={`${binderStyles.orderedSongItem} ${song?.songId === item.songId ? binderStyles.selectedSongItem : binderStyles.unselectedSongItem}`}>
          <button className={binderStyles.songSelectionButton} type="button" aria-pressed={song?.songId === item.songId} onClick={() => setSelected(item.songId)}>
            <span className={binderStyles.songNumber}>{String(index + 1).padStart(2, "0")}</span>
            <span className={binderStyles.songName}>{item.title}</span>
          </button>
        </li>)}</ol>
      </aside>
      <section className={binderStyles.selectedSongLayout} aria-label="Selected song preview">
        {song ? <>
          <div className={binderStyles.selectedSongContent}>
            <Link className={binderStyles.openSongWorkspaceLink} href={`/songs/${encodeURIComponent(song.songId)}`}>Open song →</Link>
          </div>
          <PreviewPanel abc={song.abc} displaySettings={{ ...DEFAULT_DISPLAY_SETTINGS, ...song.displaySettings }} />
        </> : <div className={binderStyles.selectedSongEmptyState}>
          <h2 className={binderStyles.emptyStateTitle}>No songs available in your location.</h2>
        </div>}
      </section>
    </div>
  </>;
}
export function usePublicBinders(id?: string) {
  const [loaded, setLoaded] = useState<{ id?: string; data: { binder: PublicBinder | null; binders: FunctionReturnType<typeof api.binders.listPublic> | null } }>();
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    fetch(`/api/public-binders${id ? `?id=${encodeURIComponent(id)}` : ""}`, { cache: "no-store" })
      .then(response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => { if (active) { setLoaded({ id, data }); setError(false); } })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [id]);
  return { result: loaded?.id === id ? loaded?.data : undefined, error };
}
export function PublicBinderPage({ id }: { id: string }) {
  const { result, error } = usePublicBinders(id);
  return <div className={styles.pageShell}>
    <Header clerkConfigured={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)} activeSection="binders" />
    <main className={styles.pageContent}>{error ? <p>Couldn’t load binder.</p> : !result ? <p role="status">Loading binder…</p>
      : result.binder ? <PublicBinderView binder={result.binder} /> : <h1>Binder not found</h1>}</main>
  </div>;
}
