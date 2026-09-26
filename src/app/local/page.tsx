"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { BRAVURA_CODE_POINTS } from "./bravura-glyphs";
import styles from "./page.module.css";

const sections = [
  {
    id: "unicode",
    title: "Unicode symbols",
    range: "Outside the private-use area",
    description: "Text characters and symbols mapped by the font.",
    includes: (codePoint: number) => codePoint < 0xe000,
  },
  {
    id: "private-use",
    title: "Bravura private-use area",
    range: "U+E000–U+F5FA",
    description: "Bravura’s SMuFL music notation glyphs.",
    includes: (codePoint: number) => codePoint >= 0xe000 && codePoint <= 0xf8ff,
  },
  {
    id: "musical-symbols",
    title: "Musical Symbols block",
    range: "U+1D100–U+1D1E8",
    description: "Musical symbols mapped outside the private-use area.",
    includes: (codePoint: number) => codePoint >= 0x1d100,
  },
];

function formatCodePoint(codePoint: number) {
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
}

function codePointMatches(codePoint: number, query: string) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return true;

  const normalizedQuery = trimmedQuery.toLowerCase().replace(/^(u\+|0x)/, "");
  const hex = codePoint.toString(16).padStart(4, "0");
  return hex.includes(normalizedQuery) || String.fromCodePoint(codePoint) === trimmedQuery;
}

export default function LocalBravuraPage() {
  const [query, setQuery] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  const visibleSections = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          codePoints: BRAVURA_CODE_POINTS.filter(
            (codePoint) => section.includes(codePoint) && codePointMatches(codePoint, query),
          ),
        }))
        .filter((section) => section.codePoints.length > 0),
    [query],
  );

  const visibleCount = visibleSections.reduce((total, section) => total + section.codePoints.length, 0);

  async function copyGlyph(codePoint: number) {
    try {
      await navigator.clipboard.writeText(String.fromCodePoint(codePoint));
      setCopyStatus(`${formatCodePoint(codePoint)} copied`);
    } catch {
      setCopyStatus("Clipboard access is unavailable in this browser.");
    }
    window.setTimeout(() => setCopyStatus(""), 1600);
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link className={styles.backLink} href="/">
          <span aria-hidden="true">←</span> MyFakebook
        </Link>

        <header className={styles.hero}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowMark} />
            Local font specimen
          </div>
          <h1>
            Bravura <span>glyph atlas</span>
          </h1>
          <p className={styles.intro}>
            Every mapped character in the Bravura font installed in this app. Search by Unicode
            code point or paste a glyph, then click a tile to copy it.
          </p>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{BRAVURA_CODE_POINTS.length.toLocaleString()}</span>
              <span className={styles.statLabel}>mapped characters</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statValue}>Bravura</span>
              <span className={styles.statLabel}>music notation font</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statValue}>OFL 1.1</span>
              <span className={styles.statLabel}>font license</span>
            </div>
          </div>
        </header>

        <div className={styles.toolbar}>
          <label className={styles.searchBox}>
            <svg aria-hidden="true" className={styles.searchIcon} viewBox="0 0 24 24">
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 4.2 4.2" />
            </svg>
            <span className={styles.visuallyHidden}>Search glyphs</span>
            <input
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search U+E050 or paste a glyph…"
              type="search"
              value={query}
            />
            {query && (
              <button className={styles.clearButton} onClick={() => setQuery("")} type="button">
                Clear
              </button>
            )}
          </label>
          <div className={styles.resultCount} aria-live="polite">
            <strong>{visibleCount.toLocaleString()}</strong> of {BRAVURA_CODE_POINTS.length.toLocaleString()}
          </div>
        </div>

        <div className={styles.note}>
          <span className={styles.noteIcon} aria-hidden="true">♪</span>
          <p>
            Bravura’s notation symbols mostly use private-use code points. This map labels them by
            Unicode value because the installed font package does not include glyph names.
          </p>
        </div>

        {visibleSections.length > 0 ? (
          visibleSections.map((section) => (
            <section className={styles.section} key={section.id}>
              <div className={styles.sectionHeading}>
                <div>
                  <div className={styles.sectionTitleLine}>
                    <h2>{section.title}</h2>
                    <span className={styles.range}>{section.range}</span>
                  </div>
                  <p>{section.description}</p>
                </div>
                <span className={styles.sectionCount}>{section.codePoints.length}</span>
              </div>
              <div className={styles.glyphGrid}>
                {section.codePoints.map((codePoint) => {
                  const code = formatCodePoint(codePoint);
                  return (
                    <button
                      aria-label={`Copy glyph ${code}`}
                      className={styles.glyphTile}
                      key={codePoint}
                      onClick={() => void copyGlyph(codePoint)}
                      title={`Copy ${code}`}
                      type="button"
                    >
                      <span aria-hidden="true" className={styles.glyph}>
                        {String.fromCodePoint(codePoint)}
                      </span>
                      <span className={styles.glyphCode}>{code}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <div className={styles.emptyState}>
            <span className={styles.emptyGlyph} aria-hidden="true">𝄞</span>
            <h2>No glyphs found</h2>
            <p>Try a different code point or pasted character.</p>
          </div>
        )}

        <footer className={styles.footer}>
          <span>Font: @fontsource/bravura</span>
          <span>Click any character to copy it</span>
        </footer>
      </div>
      <div className={styles.copyStatus} aria-live="polite" role="status">
        {copyStatus}
      </div>
    </main>
  );
}
