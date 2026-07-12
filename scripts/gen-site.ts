#!/usr/bin/env -S deno run --allow-read --allow-write
// Docs-site generator. Parses README.md (command + flag tables, code blocks)
// and emits site/index.html — a man-page-meets-modern command reference.
// stdlib + @deno/gfm only.

import { render } from "@deno/gfm";

const HERE = new URL(".", import.meta.url).pathname.replace(
	/^\/([A-Za-z]:)/,
	"$1",
);
const ROOT = new URL("../", import.meta.url).pathname.replace(
	/^\/([A-Za-z]:)/,
	"$1",
);
const readme = (await Deno.readTextFile(`${ROOT}README.md`)).replace(
	/\r\n/g,
	"\n",
);
const CSS = await Deno.readTextFile(`${HERE}assets/style.css`);
const JS = await Deno.readTextFile(`${HERE}assets/app.js`);

interface Row {
	cells: string[];
}
interface Table {
	headers: string[];
	rows: Row[];
}

/** Pull the first markdown table that appears after a heading matching `re`. */
function tableAfter(md: string, re: RegExp): Table | null {
	const lines = md.split("\n");
	let i = lines.findIndex((l) => re.test(l));
	if (i < 0) return null;
	while (i < lines.length && !lines[i].trimStart().startsWith("|")) i++;
	const block: string[] = [];
	while (i < lines.length && lines[i].trimStart().startsWith("|")) {
		block.push(lines[i++]);
	}
	if (block.length < 2) return null;
	const parse = (l: string) =>
		l
			.trim()
			.replace(/^\||\|$/g, "")
			.split(/(?<!\\)\|/)
			.map((c) => c.trim());
	const headers = parse(block[0]);
	const rows = block.slice(2).map((l) => ({ cells: parse(l) }));
	return { headers, rows };
}

/** First fenced code block after a heading matching `re`. */
function codeAfter(md: string, re: RegExp): string {
	const lines = md.split("\n");
	let i = lines.findIndex((l) => re.test(l));
	if (i < 0) return "";
	while (i < lines.length && !lines[i].startsWith("```")) i++;
	i++;
	const out: string[] = [];
	while (i < lines.length && !lines[i].startsWith("```")) out.push(lines[i++]);
	return out.join("\n");
}

const esc = (s: string) =>
	s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Inline markdown → HTML for cell contents: `code`, escape pipes already split.
function inline(s: string): string {
	return esc(s)
		.replace(/`([^`]+)`/g, "<code>$1</code>")
		.replace(/\\\|/g, "|")
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

const commands = tableAfter(readme, /^##+\s+Commands/i);
const flags = tableAfter(readme, /^##+\s+Flags/i);
const quickStart = codeAfter(readme, /^##+\s+Quick start/i);
const tagline =
	readme.match(/^Complete NextDNS[^\n]*/m)?.[0] ??
	"Complete NextDNS account CLI.";

// Command palette rotated through the typed-prompt signature.
const promptLines = quickStart
	.split("\n")
	.map((l) => l.replace(/\s{2,}#.*$/, "").trim())
	.filter((l) => l.startsWith("ndns"))
	.slice(0, 6);

function commandCards(t: Table | null): string {
	if (!t) return "";
	return t.rows
		.map((r) => {
			const name = r.cells[0] ?? "";
			const purpose = r.cells[1] ?? "";
			const verb = name.replace(/`/g, "").split(/\s|</)[0];
			return `<article class="cmd" id="cmd-${esc(verb)}">
  <div class="cmd__sig"><span class="cmd__prog">ndns</span> <span class="cmd__name">${inline(
		name,
	)}</span></div>
  <p class="cmd__desc">${inline(purpose)}</p>
</article>`;
		})
		.join("\n");
}

function flagRows(t: Table | null): string {
	if (!t) return "";
	return t.rows
		.map(
			(r) =>
				`<tr><td class="kbd-cell">${inline(r.cells[0] ?? "")}</td><td>${inline(
					r.cells[1] ?? "",
				)}</td></tr>`,
		)
		.join("\n");
}

// README intro paragraph rendered through gfm, stripped of octicon anchors.
const introMd = readme.split("\n").slice(6, 10).join("\n");
const intro = render(introMd)
	.replace(/<a class="anchor"[^>]*>.*?<\/a>/gs, "")
	.trim();

const navItems = (commands?.rows ?? [])
	.map((r) => {
		const verb = (r.cells[0] ?? "").replace(/`/g, "").split(/\s|</)[0];
		return `<a href="#cmd-${esc(verb)}">${esc(verb)}</a>`;
	})
	.join("");

const html = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>ndns — NextDNS command reference</title>
<meta name="description" content="${esc(tagline)}" />
<meta name="color-scheme" content="dark light" />
<link rel="preconnect" href="https://fonts.bunny.net" crossorigin />
<link
  href="https://fonts.bunny.net/css?family=space-grotesk:500,700|ibm-plex-sans:400,500|ibm-plex-mono:400,500"
  rel="stylesheet"
/>
<style>${CSS}</style>
</head>
<body>
<a class="skip" href="#reference">Skip to reference</a>
<header class="masthead">
  <div class="wrap masthead__row">
    <div class="brand">
      <span class="brand__mark" aria-hidden="true">&gt;_</span>
      <span class="brand__name">ndns</span>
      <span class="brand__sec">(1)</span>
    </div>
    <nav class="masthead__nav">
      <a href="#reference">Reference</a>
      <a href="#flags">Flags</a>
      <a href="https://github.com/chirag127/ndns">Source</a>
      <a href="https://github.com/chirag127/ndns/releases">Download</a>
    </nav>
  </div>
</header>

<section class="hero">
  <div class="wrap hero__grid">
    <div class="hero__lede">
      <p class="hero__eyebrow">NAME</p>
      <h1 class="hero__title">ndns — complete NextDNS account CLI</h1>
      <div class="hero__intro">${intro}</div>
      <div class="hero__cta">
        <a class="btn btn--primary" href="#reference">Command reference</a>
        <a class="btn" href="https://github.com/chirag127/ndns#install">Install</a>
      </div>
    </div>
    <div class="term" role="img" aria-label="Animated ndns command prompt">
      <div class="term__bar"><span></span><span></span><span></span></div>
      <div class="term__body">
        <span class="term__ps1">nextdns@cli</span>
        <span class="term__sep">~</span>
        <span class="term__caret">$</span>
        <span class="term__type" id="typed"></span><span class="term__cursor" aria-hidden="true"></span>
      </div>
    </div>
  </div>
</section>

<main class="wrap layout">
  <aside class="toc" aria-label="Command index">
    <p class="toc__label">SYNOPSIS</p>
    <nav class="toc__nav">${navItems}</nav>
  </aside>
  <div class="content">
    <section id="reference" aria-labelledby="ref-h">
      <h2 id="ref-h" class="sec">Commands</h2>
      <div class="cmd-grid">
${commandCards(commands)}
      </div>
    </section>
    <section id="flags" aria-labelledby="flags-h">
      <h2 id="flags-h" class="sec">Flags</h2>
      <table class="flags">
        <thead><tr><th>Flag</th><th>Meaning</th></tr></thead>
        <tbody>
${flagRows(flags)}
        </tbody>
      </table>
    </section>
  </div>
</main>

<footer class="foot">
  <div class="wrap foot__row">
    <span>ndns · MIT · <a href="https://github.com/chirag127/ndns">chirag127/ndns</a></span>
    <span>NextDNS API is BETA — see <a href="https://nextdns.github.io/api">docs</a></span>
  </div>
</footer>

<script id="prompt-data" type="application/json">${JSON.stringify(promptLines)}</script>
<script>${JS}</script>
</body>
</html>
`;

await Deno.writeTextFile(`${HERE}../site/index.html`, html);
console.log(
	`site/index.html written (${commands?.rows.length ?? 0} commands, ${
		flags?.rows.length ?? 0
	} flags)`,
);
