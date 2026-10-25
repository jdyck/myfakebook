import type { Story } from "@ladle/react";
import titleStyles from "./page-title.module.css";

const families = [
  { name: "Inter", role: "Body and interface", utility: "font-sans" },
  { name: "Roboto Flex", role: "Headings and display", utility: "font-display" },
  { name: "Roboto Mono", role: "Code and notation source", utility: "font-mono" },
] as const;

const sizes = [
  { utility: "text-2xl", size: "24px" },
  { utility: "text-xl", size: "20px" },
  { utility: "text-lg", size: "18px" },
  { utility: "text-base", size: "16px" },
  { utility: "text-sm", size: "14px" },
  { utility: "text-xs", size: "12px" },
] as const;

const weights = [
  { utility: "font-normal", weight: "400" },
  { utility: "font-medium", weight: "500" },
  { utility: "font-semibold", weight: "600" },
  { utility: "font-bold", weight: "700" },
] as const;

export const Overview: Story = () => (
  <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 font-sans">
    <header className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Foundations</p>
      <h1 className="font-display text-2xl font-bold">Typography</h1>
      <p className="max-w-prose text-sm text-muted">
        The app’s bundled variable fonts and shared type tokens. Use Ladle’s theme
        and viewport controls to compare their appearance.
      </p>
    </header>

    <section aria-labelledby="page-titles" className="flex flex-col gap-4">
      <h2 id="page-titles" className="font-display text-lg font-semibold">Library and song titles</h2>
      <p className="text-sm text-muted">Inter, weight 900. Both titles share the same responsive scale; resize the viewport to preview it.</p>
      <p className={titleStyles.title}>My Library</p>
      <p className={titleStyles.title}>The Silver Spear</p>
    </section>

    <section aria-labelledby="type-families" className="flex flex-col gap-4">
      <h2 id="type-families" className="font-display text-lg font-semibold">Font families</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {families.map(({ name, role, utility }) => (
          <div key={name} className="min-w-0 border border-line bg-paper p-4">
            <h3 className={`${utility} text-xl font-semibold`}>{name}</h3>
            <p className="mt-1 text-xs text-muted">{role}</p>
            <code className="mt-2 block text-xs text-muted">{utility}</code>
            <p className={`${utility} mt-6 break-words text-lg`}>The Silver Spear</p>
            <p className={`${utility} mt-2 break-words text-sm`}>Aa Bb Cc · 0123456789</p>
            <p className={`${utility} mt-2 break-words text-sm`}>♯ ♭ &amp; / ( ) — “ ”</p>
          </div>
        ))}
      </div>
    </section>

    <section aria-labelledby="type-scale" className="flex flex-col gap-4">
      <h2 id="type-scale" className="font-display text-lg font-semibold">Type scale</h2>
      <p className="text-sm text-muted">Size samples use Inter at normal weight. Pixel values assume a 16px root size.</p>
      <div className="divide-y divide-line border-y border-line">
        {sizes.map(({ utility, size }) => (
          <div key={utility} className="grid min-w-0 gap-2 py-4 sm:grid-cols-[12rem_1fr] sm:items-baseline">
            <code className="text-xs text-muted">{utility} · {size}</code>
            <p className={`${utility} break-words`}>The Silver Spear — a reel in D major</p>
          </div>
        ))}
      </div>
    </section>

    <section aria-labelledby="type-weights" className="flex flex-col gap-4">
      <h2 id="type-weights" className="font-display text-lg font-semibold">Font weights</h2>
      {weights.map(({ utility, weight }) => (
        <div key={utility} className="grid gap-2 sm:grid-cols-[12rem_1fr] sm:items-baseline">
          <code className="text-xs text-muted">{utility} · {weight}</code>
          <p className={`${utility} text-lg`}>Save a song to My Library</p>
        </div>
      ))}
    </section>

    <section aria-labelledby="type-composition" className="flex flex-col gap-4">
      <h2 id="type-composition" className="font-display text-lg font-semibold">Text in context</h2>
      <article className="flex max-w-prose flex-col gap-3 border border-line bg-paper p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Reel · D major · 4/4</p>
        <h3 className="font-display text-2xl font-bold leading-tight">The Silver Spear</h3>
        <p className="text-base leading-relaxed">
          Keep your favorite tunes together, prepare a binder for the next session,
          and find the right setting when it is time to play.
        </p>
        <p className="text-sm text-muted">Traditional Irish tune. <strong>Ready for the session.</strong></p>
        <pre className="overflow-x-auto border border-line bg-canvas p-3 font-mono text-xs leading-relaxed"><code>{"X:1\nT:The Silver Spear\nM:4/4\nL:1/8\nK:D\n|: dBBA B2 dB | A2 FA DAFA :|"}</code></pre>
        <p className="text-xs text-muted">Source notation uses Roboto Mono; headings use Roboto Flex.</p>
      </article>
    </section>
  </main>
);
