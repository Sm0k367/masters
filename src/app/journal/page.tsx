"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import { AppShell } from "@/components/app-shell";
import { Disclaimer } from "@/components/desk-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useMemo, useState } from "react";

type WatchItem = {
  symbol: string;
  address: string;
  chain: string;
  note: string;
};

type JournalDay = {
  date: string;
  pumped: string;
  held: string;
  died: string;
};

const WATCH_KEY = "masters.watch.v1";
const JOURNAL_KEY = "masters.journal.v1";

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function JournalPage() {
  const [watch, setWatch] = useState<WatchItem[]>([]);
  const [symbol, setSymbol] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [days, setDays] = useState<JournalDay[]>([]);
  const [pumped, setPumped] = useState("");
  const [held, setHeld] = useState("");
  const [died, setDied] = useState("");

  useEffect(() => {
    try {
      const w = localStorage.getItem(WATCH_KEY);
      const j = localStorage.getItem(JOURNAL_KEY);
      if (w) setWatch(JSON.parse(w) as WatchItem[]);
      if (j) setDays(JSON.parse(j) as JournalDay[]);
    } catch {
      /* ignore */
    }
  }, []);

  const today = useMemo(
    () => days.find((day) => day.date === todayStamp()) ?? null,
    [days],
  );

  useEffect(() => {
    if (!today) return;
    setPumped(today.pumped);
    setHeld(today.held);
    setDied(today.died);
  }, [today]);

  function persistWatch(next: WatchItem[]) {
    setWatch(next);
    localStorage.setItem(WATCH_KEY, JSON.stringify(next));
  }

  function persistDays(next: JournalDay[]) {
    setDays(next);
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(next));
  }

  function addWatch() {
    if (!symbol.trim()) return;
    persistWatch([
      {
        symbol: symbol.trim().toUpperCase(),
        address: address.trim(),
        chain: "robinhood",
        note: note.trim(),
      },
      ...watch,
    ]);
    setSymbol("");
    setAddress("");
    setNote("");
  }

  function saveJournal() {
    const entry: JournalDay = {
      date: todayStamp(),
      pumped,
      held,
      died,
    };
    persistDays([entry, ...days.filter((day) => day.date !== entry.date)]);
  }

  const yesterday = days.find((day) => day.date !== todayStamp());

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">Journal</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Night: write 3 lines — what pumped, what held volume, what died. Tomorrow
            compare. That’s the edge, not more indicators.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Today’s three lines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={pumped}
                onChange={(event) => setPumped(event.target.value)}
                placeholder="What pumped"
              />
              <Textarea
                value={held}
                onChange={(event) => setHeld(event.target.value)}
                placeholder="What held volume"
              />
              <Textarea
                value={died}
                onChange={(event) => setDied(event.target.value)}
                placeholder="What died"
              />
              <Button type="button" onClick={saveJournal}>
                Save {todayStamp()}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compare to last session</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {yesterday ? (
                <div className="space-y-2">
                  <p className="font-mono text-xs">{yesterday.date}</p>
                  <p>
                    <span className="text-foreground">Pumped:</span> {yesterday.pumped || "—"}
                  </p>
                  <p>
                    <span className="text-foreground">Held:</span> {yesterday.held || "—"}
                  </p>
                  <p>
                    <span className="text-foreground">Died:</span> {yesterday.died || "—"}
                  </p>
                </div>
              ) : (
                <p>No prior session yet. Save tonight so tomorrow has a baseline.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Watchlist — stickier names only</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <Input
                value={symbol}
                onChange={(event) => setSymbol(event.target.value)}
                placeholder="PONS"
              />
              <Input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="0x…"
                className="font-mono"
              />
              <Input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Why it’s here"
              />
            </div>
            <Button type="button" variant="outline" onClick={addWatch}>
              Add
            </Button>
            <div className="space-y-2">
              {watch.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Empty. Don’t put every Hood/Cat clone here — only names you will still
                  look at tomorrow.
                </p>
              ) : (
                watch.map((item, index) => (
                  <div
                    key={`${item.symbol}-${index}`}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2"
                  >
                    <div>
                      <div className="font-medium">{item.symbol}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {item.address || "no contract saved"}
                      </div>
                      {item.note ? (
                        <div className="text-xs text-muted-foreground">{item.note}</div>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      onClick={() => persistWatch(watch.filter((_, i) => i !== index))}
                    >
                      Remove
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        <Disclaimer />
      </div>
    </AppShell>
  );
}
