"use client";

import { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { api } from "../../../convex/_generated/api";
import { Header } from "@/components/app-shell/header/header";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import componentStyles from "./binders-index.module.css";


export function BindersIndex() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const binders = useQuery(api.binders.listMine, isAuthenticated ? {} : "skip");
  const createBinder = useMutation(api.binders.create);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const id = await createBinder({ name });
      router.push(`/setlists/${encodeURIComponent(id)}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Couldn’t create binder");
    } finally {
      setSaving(false);
    }
  }

  const loading = isLoading || (isAuthenticated && binders === undefined);

  return (
    <div className={componentStyles.pageShell}>
      <Header clerkConfigured />
      <main className={componentStyles.pageContent}>
        <div className={componentStyles.pageHeadingRow}>
          <div>
            <h1 className={componentStyles.pageTitle}>Binders</h1>
            <p className={componentStyles.pageDescription}>Organize songs in performance order.</p>
          </div>
          {!loading && binders && <span className={componentStyles.binderCount}>{binders.length} binder{binders.length === 1 ? "" : "s"}</span>}
        </div>

        <form className={componentStyles.createBinderForm} onSubmit={(event) => void handleCreate(event)}>
          <label className={componentStyles.formFieldLabel} htmlFor="new-binder-name">Binder name</label>
          <TextField
            className={componentStyles.binderNameInput}
            id="new-binder-name"
            maxLength={80}
            placeholder="For example, Friday at the Blue Note"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Button disabled={saving} size="regular" type="submit" variant="primary">{saving ? "Creating…" : "Create binder"}</Button>
        </form>
        {status && <p className={componentStyles.formErrorMessage} role="alert">{status}</p>}

        {loading ? (
          <p role="status">Loading your binders…</p>
        ) : binders?.length ? (
          <ul className={componentStyles.binderList}>
            {binders.map((binder) => (
              <li key={binder._id}>
                <Link
                  className={componentStyles.binderLink}
                  href={`/setlists/${encodeURIComponent(binder._id)}`}
                >
                  <span className={componentStyles.binderDetails}>
                    <span className={componentStyles.binderName}>{binder.name}</span>
                    <span className={componentStyles.binderMetadata}>{binder.itemCount} song{binder.itemCount === 1 ? "" : "s"} · Updated {new Date(binder.updatedAt).toLocaleDateString()}</span>
                  </span>
                  <span className={componentStyles.openBinderLabel}>Open</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className={componentStyles.emptyBindersState}>
            <p className={componentStyles.emptyStateTitle}>No binders yet</p>
            <p className={componentStyles.emptyStateDescription}>Create a binder, then add your songs or songs from the public library.</p>
          </div>
        )}
      </main>
    </div>
  );
}
