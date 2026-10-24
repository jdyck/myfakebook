"use client";

import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./editorial-library.module.css";

export type EditorialLibraryViewProps = {
  header?: ReactNode;
  captionClassName?: string;
  section: "songs" | "library" | "binders";
  title: string;
  titleId: string;
  eyebrow: string;
  description: ReactNode;
  noteTitle: string;
  note: ReactNode;
  stats: readonly (readonly [string, number])[];
  loading: boolean;
  primaryAction?: ReactNode;
  children: ReactNode;
};

export function EditorialLibraryView({
  header, captionClassName, section, title, titleId, eyebrow, description,
  noteTitle, note, stats, loading, primaryAction, children,
}: EditorialLibraryViewProps) {
  const mainId = `${section}-main`;

  return (
    <div className={styles.pageShell}>
      <a className={styles.skipLink} href={`#${mainId}`}>Skip to {section === "library" ? "your songs" : section}</a>
      {header}
      <main id={mainId} className={styles.pageContent}>
        <section className={styles.pageHeading} aria-labelledby={titleId}>
          <div>
            <p className={styles.eyebrow}>{eyebrow} <span>/</span> 01</p>
            <h1 id={titleId} className={styles.pageTitle}>{title}</h1>
          </div>
          <div className={styles.headingActions}>
            <p>{description}</p>
            {primaryAction === undefined ? <Link className={styles.primary} href="/new"><Plus size={16} strokeWidth={1.5} aria-hidden="true" />New song</Link> : primaryAction}
          </div>
        </section>
        <div className={styles.workspace}>
          <aside className={styles.collectionAside} aria-label={section === "library" ? "About your collection" : section === "binders" ? "About your binders" : "About the song catalog"}>
            <figure className={styles.editorialPhoto}>
              <Image src="/images/library/bassist.png" alt="A musician’s hand on the strings of an upright bass." fill sizes="(min-width: 1500px) 260px, (min-width: 1151px) 230px, 190px" />
              <figcaption className={captionClassName}>SAME<br />TUNES<br /><strong>FURTHER</strong><Image src="/images/library/bar.svg" width={28} height={5} alt="" /></figcaption>
            </figure>
            <div className={styles.collectionNote}>
              <p className={styles.eyebrow}>{noteTitle}</p>
              <p>{note}</p>
            </div>
            <dl className={styles.collectionStats}>
              {stats.map(([label, count]) => (
                <div key={label}><dt>{label}</dt><dd>{loading ? "—" : String(count).padStart(2, "0")}</dd></div>
              ))}
            </dl>
          </aside>
          {children}
        </div>
        <footer className={styles.pageFooter}>
          <p>TRADITION <span>/</span> INTERPRETATION <span>/</span> <b>NEXT</b></p>
          <Image src="/images/library/bar.svg" width={34} height={5} alt="" />
          <p>FOR MUSICIANS.<br />FOR THE MUSIC.</p>
        </footer>
      </main>
    </div>
  );
}
