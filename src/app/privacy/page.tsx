import fs from "fs/promises";
import path from "path";
import type React from "react";

function renderMarkdown(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];

  function flushList() {
    if (listItems.length === 0) return;
    nodes.push(
      <ul key={`list-${nodes.length}`} className="ml-6 list-disc space-y-2 text-slate-700 dark:text-slate-300">
        {listItems.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>,
    );
    listItems = [];
  }

  for (const line of lines) {
    if (!line.trim()) {
      flushList();
      continue;
    }

    if (line.startsWith("# ")) {
      flushList();
      nodes.push(<h1 key={`h1-${nodes.length}`} className="text-4xl font-semibold text-slate-950 dark:text-slate-100">{line.slice(2)}</h1>);
      continue;
    }

    if (line.startsWith("## ")) {
      flushList();
      nodes.push(<h2 key={`h2-${nodes.length}`} className="mt-8 text-2xl font-semibold text-slate-900 dark:text-slate-100">{line.slice(3)}</h2>);
      continue;
    }

    if (line.startsWith("- ")) {
      listItems.push(line.slice(2));
      continue;
    }

    flushList();
    nodes.push(<p key={`p-${nodes.length}`} className="text-base leading-8 text-slate-700 dark:text-slate-300">{line}</p>);
  }

  flushList();
  return nodes;
}

export default async function PrivacyPage() {
  const markdown = await fs.readFile(path.join(process.cwd(), "src/content/privacy-policy.md"), "utf8");

  return (
    <main className="page-shell">
      <section className="soft-card space-y-5 rounded-[36px] p-8">
        {renderMarkdown(markdown)}
      </section>
    </main>
  );
}
