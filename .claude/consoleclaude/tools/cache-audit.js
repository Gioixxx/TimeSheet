#!/usr/bin/env node
/**
 * cache-audit.js — audit del prompt caching dai transcript JSONL di Claude Code.
 *
 * Per ogni turno assistant del thread principale (no sidechain) estrae `usage` e
 * calcola hit-rate = cache_read / (cache_read + cache_creation + input) e contesto.
 * I chunk multipli dello stesso messaggio API (stesso `message.id`) contano 1 turno.
 * Conta anche le chiamate agli strumenti del sidecar (`mcp__ollama-sidecar__*`) nel
 * transcript analizzato e in quelli dello stesso progetto toccati nelle ultime 24 ore.
 * Le chiamate dei Dot (subagent) non stanno nel transcript della sessione ma in
 * `<sessione>/subagents/agent-*.jsonl`, accanto a `<sessione>.jsonl`: si contano anche quelle.
 * Conta anche i flussi meccanici che con il sidecar in sessione passano prima da lui (`/commit`, `/changelog`,
 * `/handoff`, `/session-end`, deleghe al Dot Git e all'Archivista) e ne ricava `sidecar.policy`: `violated` se il
 * sidecar è in sessione (`CONSOLECLAUDE_SIDECAR=1`, la passa la console), ci sono stati flussi e 0 chiamate in 24 ore.
 *
 * Default: transcript più recente del PROGETTO CORRENTE (cwd → slug nella cartella dei
 * transcript). Un audit sul newest globale fotografa una sessione qualunque, non la tua —
 * è la modalità `--newest`, da usare consapevolmente. Output JSON su stdout; input
 * deterministico per il comando /token-cost.
 *
 * Uso:
 *   node cache-audit.js                  # progetto corrente
 *   node cache-audit.js --project <dir>  # altro progetto
 *   node cache-audit.js --newest         # newest globale
 *   node cache-audit.js --last 10        # dettaglio ultimi N turni (default 5)
 *   node cache-audit.js --help
 *
 * Env:
 *   CONSOLECLAUDE_CLAUDE_HOME  cartella dati di Claude Code da usare al posto di quella dell'utente (usata dai test)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const SIDECAR_PREFIX = 'mcp__ollama-sidecar__';
const DAY_MS = 24 * 60 * 60 * 1000;
// Flussi che con il sidecar in sessione devono chiamarlo prima di sintetizzare: comandi e Dot.
const FLOW_COMMANDS = ['commit', 'changelog', 'handoff', 'session-end'];
const FLOW_DOTS = { 'dot-git': 'git', 'dot-archivista': 'archivista' };
const COMMAND_RE = /<command-name>\/([a-z-]+)<\/command-name>/g;

function claudeHome() {
  return (
    process.env.CONSOLECLAUDE_CLAUDE_HOME ||
    path.join(os.homedir(), '.claude')
  );
}

/** Slug directory progetto come lo scrive Claude Code: non-alfanumerici → '-'. */
function projectSlug(dir) {
  return path.resolve(dir).replace(/[^a-zA-Z0-9]/g, '-');
}

/** Il .jsonl con mtime più recente tra le directory date (non ricorsivo). */
function newestTranscript(dirs) {
  let newest = null;
  for (const dir of dirs) {
    let entries;
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const f of entries) {
      if (!f.endsWith('.jsonl')) continue;
      const p = path.join(dir, f);
      let mtime;
      try {
        mtime = fs.statSync(p).mtimeMs;
      } catch {
        continue;
      }
      if (!newest || mtime > newest.mtime) newest = { file: p, mtime };
    }
  }
  return newest;
}

/** I transcript dei subagent di una sessione: `<sessione>/subagents/*.jsonl` (la cartella ha il nome del transcript senza `.jsonl`). */
function subagentTranscripts(sessionDir) {
  const subDir = path.join(sessionDir, 'subagents');
  let entries;
  try {
    entries = fs.readdirSync(subDir);
  } catch {
    return [];
  }
  return entries.filter((f) => f.endsWith('.jsonl')).map((f) => path.join(subDir, f));
}

/** Usage dei turni assistant main-chain, deduplicati per message.id. */
function parseUsage(transcriptPath) {
  const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
  const usages = [];
  const seenIds = new Set();
  let model = null;
  for (const line of lines) {
    if (!line.includes('"usage"')) continue;
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }
    if (e.isSidechain || e.type !== 'assistant' || !e.message || !e.message.usage) continue;
    const id = e.message.id;
    if (id) {
      if (seenIds.has(id)) continue;
      seenIds.add(id);
    }
    if (e.message.model) model = e.message.model;
    const u = e.message.usage;
    usages.push({
      read: u.cache_read_input_tokens || 0,
      write: u.cache_creation_input_tokens || 0,
      fresh: u.input_tokens || 0,
      out: u.output_tokens || 0,
    });
  }
  return { usages, model };
}

const bump = (m, k, n = 1) => m.set(k, (m.get(k) || 0) + n);

/**
 * Un transcript: le chiamate agli strumenti del sidecar (`calls`: nome del tool → numero) e i flussi meccanici (`flows`:
 * `commit`, `git`, `archivista`… → numero). Ogni `tool_use` conta una volta sola (per id), anche se il file ha il thread di
 * un subagent inline (isSidechain); un comando conta solo nel messaggio dell'utente. I file dei subagent veri
 * (`<sessione>/subagents/`) non sono inclusi: li somma `sidecarStats`.
 */
function scanTranscript(transcriptPath) {
  const calls = new Map();
  const flows = new Map();
  let text;
  try {
    text = fs.readFileSync(transcriptPath, 'utf8');
  } catch {
    return { calls, flows };
  }
  const seen = new Set();
  for (const line of text.split('\n')) {
    const sidecar = line.includes(SIDECAR_PREFIX);
    const command = line.includes('<command-name>/');
    const dot = line.includes('"subagent_type"');
    if (!sidecar && !command && !dot) continue;
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }
    const msg = e && e.message;
    if (command && e.type === 'user' && msg) {
      const body = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content || '');
      for (const m of body.matchAll(COMMAND_RE)) if (FLOW_COMMANDS.includes(m[1])) bump(flows, m[1]);
    }
    const content = msg && Array.isArray(msg.content) ? msg.content : [];
    for (const block of content) {
      if (!block || block.type !== 'tool_use' || typeof block.name !== 'string') continue;
      if (block.id) {
        if (seen.has(block.id)) continue;
        seen.add(block.id);
      }
      if (block.name.startsWith(SIDECAR_PREFIX)) bump(calls, block.name.slice(SIDECAR_PREFIX.length));
      const type = (block.name === 'Agent' || block.name === 'Task') && block.input ? FLOW_DOTS[block.input.subagent_type] : null;
      if (type) bump(flows, type);
    }
  }
  return { calls, flows };
}

/** Le chiamate agli strumenti del sidecar in un transcript (vedi `scanTranscript`). */
function sidecarCalls(transcriptPath) {
  return scanTranscript(transcriptPath).calls;
}

/**
 * `ok`: chiamate nelle 24 ore, o nessun flusso da fare; `violated`: sidecar in sessione, flussi fatti e nessuna chiamata;
 * `no-data`: il sidecar non risulta in sessione e non ci sono chiamate (non un'anomalia).
 */
function policyOf({ inSession, calls24h, flows24h }) {
  if (calls24h > 0) return 'ok';
  if (!inSession) return 'no-data';
  return flows24h > 0 ? 'violated' : 'ok';
}

/** Riassunto delle chiamate al sidecar: nel transcript analizzato e, nella sua cartella, in quelli toccati nelle ultime 24 ore. */
function sidecarStats(transcript, now, env = process.env) {
  const here = sidecarCalls(transcript);
  // I Dot lavorano come subagent: le loro chiamate stanno nei file di <sessione>/subagents/, non in <sessione>.jsonl.
  for (const p of subagentTranscripts(transcript.replace(/\.jsonl$/, ''))) {
    for (const [tool, n] of sidecarCalls(p)) bump(here, tool, n);
  }
  const sum = (m) => [...m.values()].reduce((a, b) => a + b, 0);
  let calls24h = 0;
  const tools24h = new Map();
  const flows = new Map();
  const dir = path.dirname(transcript);
  let entries = [];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    entries = [];
  }
  // Transcript delle sessioni del progetto e dei loro subagent, ognuno con il proprio mtime.
  const files = [];
  for (const f of entries) {
    const p = path.join(dir, f);
    if (f.endsWith('.jsonl')) files.push(p);
    else files.push(...subagentTranscripts(p));
  }
  for (const p of files) {
    try {
      if (now - fs.statSync(p).mtimeMs > DAY_MS) continue;
    } catch {
      continue;
    }
    const scan = scanTranscript(p);
    for (const [tool, n] of scan.calls) {
      calls24h += n;
      bump(tools24h, tool, n);
    }
    for (const [flow, n] of scan.flows) bump(flows, flow, n);
  }
  let topTool = null;
  let topN = 0;
  for (const [tool, n] of tools24h) {
    if (n > topN) {
      topN = n;
      topTool = tool;
    }
  }
  const flows24h = sum(flows);
  const inSession = env.CONSOLECLAUDE_SIDECAR === '1';
  return {
    transcriptCalls: sum(here),
    calls24h,
    topTool,
    inSession,
    flows24h,
    flows: Object.fromEntries([...flows].sort()),
    policy: policyOf({ inSession, calls24h, flows24h }),
  };
}

function hitPct(u) {
  const prompt = u.read + u.write + u.fresh;
  return prompt ? Math.round((u.read / prompt) * 100) : null;
}

function fail(msg, hint) {
  console.log(JSON.stringify({ error: msg, hint }, null, 2));
  process.exit(1);
}

const HELP = [
  'cache-audit.js — hit-rate del prompt caching e chiamate al sidecar dai transcript di Claude Code',
  '',
  'Uso: node cache-audit.js [--project <dir>] [--newest] [--last N] [--help]',
  '  (nessuna opzione)  transcript più recente del progetto corrente',
  '  --project <dir>    transcript più recente di un altro progetto',
  '  --newest           transcript più recente in assoluto',
  '  --last N           dettaglio degli ultimi N turni (default 5)',
  'Output: JSON su stdout. Errore: JSON con "error" e "hint", exit 1.',
].join('\n');

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(HELP);
    return;
  }
  const newest = argv.includes('--newest');
  const lastIdx = argv.indexOf('--last');
  const lastN = lastIdx >= 0 ? Math.max(1, parseInt(argv[lastIdx + 1], 10) || 5) : 5;
  const projIdx = argv.indexOf('--project');
  const projectDir = projIdx >= 0 ? argv[projIdx + 1] : process.cwd();

  const projectsDir = path.join(claudeHome(), 'projects');
  if (!fs.existsSync(projectsDir)) {
    fail('directory transcript non trovata: ' + projectsDir);
  }

  let scanDirs;
  let scope;
  let slug = null;
  if (newest) {
    scope = 'newest';
    scanDirs = fs
      .readdirSync(projectsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => path.join(projectsDir, d.name));
  } else {
    scope = 'project';
    slug = projectSlug(projectDir);
    const dir = path.join(projectsDir, slug);
    if (!fs.existsSync(dir)) {
      fail(
        'nessun transcript per il progetto ' + projectDir + ' (slug ' + slug + ')',
        'apri una sessione Claude Code nel progetto, oppure usa --newest / --project <dir>'
      );
    }
    scanDirs = [dir];
  }

  const found = newestTranscript(scanDirs);
  if (!found) fail('nessun transcript .jsonl trovato', 'scope: ' + scope);

  const { usages, model } = parseUsage(found.file);
  if (!usages.length) fail('nessun turno con usage in ' + path.basename(found.file));

  const totals = usages.reduce(
    (t, u) => ({ read: t.read + u.read, write: t.write + u.write, fresh: t.fresh + u.fresh, out: t.out + u.out }),
    { read: 0, write: 0, fresh: 0, out: 0 }
  );
  const avgHitPct = Math.round(
    (usages.reduce((s, u) => s + (hitPct(u) || 0), 0) / usages.length)
  );
  const last = usages.slice(-lastN).map((u) => ({
    ...u,
    hitPct: hitPct(u),
    context: u.read + u.write + u.fresh + u.out,
  }));

  console.log(
    JSON.stringify(
      {
        transcript: path.basename(found.file),
        project: newest ? path.basename(path.dirname(found.file)) : slug,
        scope,
        model,
        totalTurns: usages.length,
        avgHitPct,
        totals,
        lastTurns: last,
        sidecar: sidecarStats(found.file, Date.now()),
      },
      null,
      2
    )
  );
}

main();
