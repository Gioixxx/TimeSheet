#!/usr/bin/env python3
"""context_report.py — rapporto sul preambolo che Claude Code ha caricato davvero.

Legge `.claude/context-audit.jsonl`, che l'hook `InstructionsLoaded` della console scrive a ogni
sessione (percorso, tipo, motivo del caricamento, genitore e dimensione di ogni file che entra nel
contesto, senza contenuto), prende l'ultima sessione e mostra cosa pesa. Con `--check` esce 1 se lo
stesso file è stato caricato due volte all'avvio.

Serve a `/token-cost` e `/lib-doctor`: una stima del preambolo non dice cosa ha caricato Claude Code
in quella sessione, questo rapporto sì. Senza il file dice che non ci sono dati (exit 0).

Solo libreria standard, Python 3.8 o successivo.

Uso:
  python context_report.py --report [--project <dir>] [--session <id>] [--json] [--check]
"""
import calendar
import json
import math
import os
import sys
import time

AUDIT_NAME = "context-audit.jsonl"
CHARS_PER_TOKEN = 4
DUPLICATE_WINDOW = 5    # secondi: due caricamenti ravvicinati dello stesso file sono la stessa ondata


def find_claude_dir(start_dir):
    """Risale cercando la cartella .claude/ del progetto (None se non c'è).

    La `.claude` nella cartella home dell'utente è quella globale di Claude Code, non di un progetto: si salta."""
    home = os.path.normcase(os.path.abspath(os.path.expanduser("~")))
    d = os.path.abspath(start_dir)
    while True:
        candidate = os.path.join(d, ".claude")
        if os.path.isdir(candidate) and os.path.normcase(d) != home:
            return candidate
        parent = os.path.dirname(d)
        if parent == d:
            return None
        d = parent


def norm(path):
    return str(path).replace("\\", "/")


def tokens(nbytes):
    return math.ceil(nbytes / CHARS_PER_TOKEN)


def read_events(path):
    events = []
    try:
        with open(path, "r", encoding="utf-8-sig") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    item = json.loads(line)
                except ValueError:
                    continue
                if isinstance(item, dict) and item.get("p"):
                    events.append(item)
    except OSError:
        pass
    return events


def timestamp(event):
    try:
        return calendar.timegm(time.strptime(event.get("t", ""), "%Y-%m-%dT%H:%M:%S"))
    except ValueError:
        return 0


def sessions(events):
    """Id delle sessioni nell'ordine in cui compaiono per l'ultima volta."""
    last = {}
    for index, event in enumerate(events):
        last[event.get("s", "")] = index
    return [s for s, _ in sorted(last.items(), key=lambda kv: kv[1])]


def summarize(events, session=None):
    """Riassunto di una sessione (l'ultima di default): file unici e duplicati all'avvio."""
    ids = sessions(events)
    if not ids:
        return None
    chosen = session if session is not None else ids[-1]
    mine = [e for e in events if e.get("s", "") == chosen and not e.get("agent")]
    files = {}
    startup_at = {}
    duplicates = []
    for event in mine:
        key = norm(event["p"]).lower()
        entry = files.setdefault(key, {
            "path": norm(event["p"]), "bytes": int(event.get("bytes") or 0),
            "type": event.get("type", ""), "reasons": [], "parent": norm(event.get("parent", "")),
        })
        entry["bytes"] = max(entry["bytes"], int(event.get("bytes") or 0))
        reason = event.get("reason", "")
        entry["reasons"].append(reason)
        if reason in ("session_start", "include"):
            # Un /clear o un resume ricaricano gli stessi file più tardi nella stessa sessione:
            # è un duplicato solo se i due caricamenti stanno nella stessa ondata.
            when = timestamp(event)
            if key in startup_at and abs(when - startup_at[key]) <= DUPLICATE_WINDOW:
                duplicates.append(entry["path"])
            startup_at[key] = when
    listed = sorted(files.values(), key=lambda e: -e["bytes"])
    for entry in listed:
        entry["tokens"] = tokens(entry["bytes"])
        entry["reasons"] = sorted(set(entry["reasons"]))
    startup = [e for e in listed if {"session_start", "include"} & set(e["reasons"])]
    return {
        "session": chosen,
        "files": listed,
        "startupTokens": sum(e["tokens"] for e in startup),
        "totalTokens": sum(e["tokens"] for e in listed),
        "duplicates": sorted(set(duplicates)),
        "sessions": len(ids),
    }


def short(path, project):
    p = norm(path)
    root = norm(project).rstrip("/") + "/"
    if p.lower().startswith(root.lower()):
        return p[len(root):]
    home = norm(os.path.expanduser("~")).rstrip("/") + "/"
    if p.lower().startswith(home.lower()):
        return "~/" + p[len(home):]
    return p


def print_report(summary, project):
    print(f"Preambolo misurato — sessione {summary['session'][:8] or '?'} "
          f"(1 di {summary['sessions']} registrate)")
    print(f"  all'avvio: ~{summary['startupTokens']} token · totale con i caricamenti lazy: ~{summary['totalTokens']} token\n")
    print(f"  {'token':>7}  {'motivo':<16} {'tipo':<8} file")
    for e in summary["files"][:25]:
        print(f"  {e['tokens']:>7}  {','.join(e['reasons'])[:16]:<16} {e['type'][:8]:<8} {short(e['path'], project)}")
    if len(summary["files"]) > 25:
        print(f"  … e altri {len(summary['files']) - 25} file")
    if summary["duplicates"]:
        print(f"\n❌ {len(summary['duplicates'])} file caricati due volte all'avvio "
              "(un `@` annidato che richiama un file già importato, o un modulo citato in due posti):")
        for d in summary["duplicates"][:10]:
            print(f"   {short(d, project)}")


def run_report(argv):
    project = os.getcwd()
    session = None
    as_json = "--json" in argv
    check = "--check" in argv
    if "--project" in argv:
        project = argv[argv.index("--project") + 1]
    if "--session" in argv:
        session = argv[argv.index("--session") + 1]
    claude_dir = find_claude_dir(project)
    events = read_events(os.path.join(claude_dir, AUDIT_NAME)) if claude_dir else []
    summary = summarize(events, session)
    if summary is None:
        message = ("Nessun dato: l'audit lo scrive la console (evento InstructionsLoaded) quando gli hook sono attivi. "
                   "Apri una sessione dalla console nel progetto e riprova.")
        if as_json:
            print(json.dumps({"session": None, "message": message}))
        else:
            print(message)
        return 0
    if as_json:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    else:
        print_report(summary, project)
    return 1 if (check and summary["duplicates"]) else 0


def main():
    argv = sys.argv[1:]
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass
    if "--report" in argv:
        return run_report(argv)
    print(__doc__)
    return 0 if ("--help" in argv or "-h" in argv) else 2


if __name__ == "__main__":
    sys.exit(main())
