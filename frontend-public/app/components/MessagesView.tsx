import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import {
  createMessage,
  getThread,
  listThreads,
  markThreadRead,
  type MessageRecipientRole,
  type ThreadSummary,
} from "~/api/messages";
import { useAuth } from "~/auth/AuthCtx";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import { Stagger, StaggerItem } from "~/components/motion/StaggerList";

interface MessagesViewProps {
  title: string;
}

export function MessagesView({ title }: MessagesViewProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  const threadsQ = useQuery({
    queryKey: ["messages", "threads"],
    queryFn: () => listThreads(),
    refetchInterval: 15_000,
  });

  const items = threadsQ.data?.items ?? [];

  useEffect(() => {
    if (selectedId == null && items.length > 0) {
      setSelectedId(items[0].thread_id);
    }
  }, [selectedId, items]);

  const selectedSummary = useMemo(
    () => items.find((t) => t.thread_id === selectedId) ?? null,
    [items, selectedId],
  );

  return (
    <div className="max-w-6xl">
      <div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-(--color-text-faint)">
          Mesajlar
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight text-(--color-text-strong) sm:text-4xl">
            {title}
          </h1>
          <Button
            variant="accent"
            size="md"
            className="hidden md:inline-flex"
            onClick={() => setComposeOpen(true)}
          >
            Yeni Mesaj
          </Button>
        </div>
        <p className="mt-2 max-w-xl text-sm text-(--color-text-muted)">
          Yönetim ve koordinatörle iletişime buradan geç. Tüm yazışmalar kayıt
          altına alınır.
        </p>
      </div>

      <section className="mt-8 grid min-h-[28rem] grid-cols-1 gap-4 md:grid-cols-[22rem_1fr]">
        <ThreadList
          threads={items}
          loading={threadsQ.isLoading}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <ThreadPane
          summary={selectedSummary}
          viewerId={user?.id}
          onSent={() => {
            qc.invalidateQueries({ queryKey: ["messages", "threads"] });
          }}
        />
      </section>

      <div className="mt-6 flex justify-end md:hidden">
        <Button variant="accent" onClick={() => setComposeOpen(true)}>
          Yeni Mesaj
        </Button>
      </div>

      <AnimatePresence>
        {composeOpen && (
          <ComposeModal
            onClose={() => setComposeOpen(false)}
            onSent={(threadId) => {
              setComposeOpen(false);
              setSelectedId(threadId);
              qc.invalidateQueries({ queryKey: ["messages", "threads"] });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface ThreadListProps {
  threads: ThreadSummary[];
  loading: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
}

function ThreadList({ threads, loading, selectedId, onSelect }: ThreadListProps) {
  if (loading) {
    return (
      <Card className="flex h-40 items-center justify-center text-sm text-(--color-text-faint)">
        Yükleniyor…
      </Card>
    );
  }
  if (threads.length === 0) {
    return (
      <Card className="flex h-48 flex-col items-center justify-center px-6 text-center">
        <div className="text-sm text-(--color-text-muted)">Henüz mesaj yok.</div>
        <div className="mt-1 text-xs text-(--color-text-faint)">
          Yeni Mesaj butonuyla iletişime başla.
        </div>
      </Card>
    );
  }
  return (
    <Stagger className="space-y-2.5" stagger={0.04}>
      {threads.map((t) => {
        const isSelected = t.thread_id === selectedId;
        const targetLabel = recipientLabel(t);
        return (
          <StaggerItem key={t.thread_id}>
            <motion.button
              type="button"
              onClick={() => onSelect(t.thread_id)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              className={[
                "relative w-full overflow-hidden rounded-(--radius-xl) px-4 py-3.5 text-left",
                "border transition-colors duration-(--duration-fast) ease-(--ease-out-expo)",
                isSelected
                  ? "border-accent/60 bg-card shadow-(--shadow-soft)"
                  : "border-border bg-card/70 hover:border-accent/40 hover:bg-card",
              ].join(" ")}
            >
              {isSelected && (
                <motion.span
                  layoutId="thread-active"
                  className="absolute left-0 top-0 h-full w-1"
                  style={{
                    background:
                      "linear-gradient(180deg, var(--brand-orange-500), var(--brand-blue-500))",
                  }}
                  transition={{ type: "spring", stiffness: 360, damping: 30 }}
                />
              )}
              <div className="flex items-center justify-between gap-3">
                <Badge tone={isSelected ? "accent" : "outline"}>{targetLabel}</Badge>
                {t.unread_count > 0 && (
                  <motion.span
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 420, damping: 22 }}
                    className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-semibold text-accent-foreground"
                  >
                    {t.unread_count}
                  </motion.span>
                )}
              </div>
              <div className="mt-2 line-clamp-2 text-sm text-(--color-text-strong)">
                {t.last_message.body}
              </div>
              <div className="mt-1 text-xs text-(--color-text-faint)">
                {formatDateTime(t.last_message.created_at)}
              </div>
            </motion.button>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}

interface ThreadPaneProps {
  summary: ThreadSummary | null;
  viewerId?: number;
  onSent: () => void;
}

function ThreadPane({ summary, viewerId, onSent }: ThreadPaneProps) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const threadId = summary?.thread_id ?? null;

  const threadQ = useQuery({
    queryKey: ["messages", "thread", threadId],
    queryFn: () => getThread(threadId as number),
    enabled: threadId !== null,
    refetchInterval: 15_000,
  });

  useEffect(() => {
    if (threadId == null) return;
    if (!summary) return;
    if (summary.unread_count > 0) {
      markThreadRead(threadId)
        .then(() => {
          qc.invalidateQueries({ queryKey: ["messages", "threads"] });
        })
        .catch(() => undefined);
    }
  }, [threadId, summary, qc]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [threadQ.data]);

  const sendMut = useMutation({
    mutationFn: () =>
      createMessage({
        body,
        thread_id: threadId ?? undefined,
      }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["messages", "thread", threadId] });
      onSent();
    },
  });

  if (!summary || threadId == null) {
    return (
      <Card className="flex min-h-[28rem] flex-col items-center justify-center px-6 py-12 text-center">
        <div
          className="mb-3 h-10 w-10 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, oklch(from var(--brand-blue-500) l c h / 0.25), oklch(from var(--brand-orange-500) l c h / 0.25), oklch(from var(--brand-blue-500) l c h / 0.25))",
            WebkitMask: "radial-gradient(circle, transparent 56%, black 57%)",
            mask: "radial-gradient(circle, transparent 56%, black 57%)",
          }}
        />
        <div className="text-sm font-medium text-(--color-text-strong)">
          Bir konuşma seç
        </div>
        <div className="mt-1 text-xs text-(--color-text-faint)">
          Soldan konuşma seçerek başla.
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex min-h-[28rem] flex-col p-0">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-(--color-text-faint)">
            Alıcı
          </div>
          <div className="mt-0.5 text-sm font-semibold text-(--color-text-strong)">
            {recipientLabel(summary)}
          </div>
        </div>
        <Badge tone="outline">#{summary.thread_id}</Badge>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-6 py-5"
        style={{ maxHeight: "32rem" }}
      >
        {threadQ.isLoading ? (
          <div className="text-sm text-(--color-text-faint)">Yükleniyor…</div>
        ) : (
          <AnimatePresence initial={false}>
            {(threadQ.data?.items ?? []).map((m) => {
              const mine = viewerId != null && m.sender_id === viewerId;
              return (
                <motion.div
                  key={m.id}
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{
                    type: "spring",
                    stiffness: 360,
                    damping: 28,
                  }}
                  className={"flex " + (mine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={[
                      "max-w-[75%] rounded-(--radius-2xl) px-4 py-2.5 text-sm leading-relaxed",
                      mine
                        ? "rounded-br-(--radius-sm) bg-primary text-primary-foreground"
                        : "rounded-bl-(--radius-sm) bg-muted text-(--color-text-strong)",
                    ].join(" ")}
                  >
                    {!mine && (
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-(--color-text-faint)">
                        {m.sender_name ?? "—"}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{m.body}</div>
                    <div
                      className={[
                        "mt-1.5 text-[10px]",
                        mine ? "text-primary-foreground/70" : "text-(--color-text-faint)",
                      ].join(" ")}
                    >
                      {formatDateTime(m.created_at)}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      <form
        className="flex items-end gap-2 border-t border-border px-6 py-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim()) return;
          sendMut.mutate();
        }}
      >
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Mesajını yaz…"
          className="flex-1 resize-none"
        />
        <Button
          type="submit"
          variant="accent"
          disabled={!body.trim() || sendMut.isPending}
        >
          {sendMut.isPending ? "Gönderiliyor…" : "Gönder"}
        </Button>
      </form>
      {sendMut.isError && (
        <div className="border-t border-destructive/20 bg-destructive/8 px-6 py-2 text-xs text-destructive">
          {(sendMut.error as Error)?.message ?? "Gönderilemedi"}
        </div>
      )}
    </Card>
  );
}

interface ComposeModalProps {
  onClose: () => void;
  onSent: (threadId: number) => void;
}

function ComposeModal({ onClose, onSent }: ComposeModalProps) {
  const [role, setRole] = useState<MessageRecipientRole>("admin");
  const [body, setBody] = useState("");

  const sendMut = useMutation({
    mutationFn: () => createMessage({ recipient_role: role, body }),
    onSuccess: (m) => {
      onSent(m.thread_id);
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{
        backgroundColor: "oklch(from var(--brand-navy-900) l c h / 0.45)",
        backdropFilter: "blur(8px)",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", stiffness: 360, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-(--radius-2xl) bg-card p-7 shadow-(--shadow-lift)"
      >
        <div
          className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl"
          style={{
            background: "oklch(from var(--brand-orange-500) l c h / 0.35)",
          }}
        />
        <div className="relative">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-(--color-text-faint)">
            Yeni Mesaj
          </div>
          <h2 className="mt-1 text-xl font-semibold text-(--color-text-strong)">
            Kime yazıyorsun?
          </h2>

          <div className="mt-5 space-y-2.5">
            {(
              [
                {
                  value: "admin",
                  title: "Yönetim (Admin)",
                  meta: "Genel havuz",
                },
                {
                  value: "coordinator",
                  title: "Koordinatörün",
                  meta: "Eşleşmen üzerinden",
                },
              ] as { value: MessageRecipientRole; title: string; meta: string }[]
            ).map((opt) => {
              const active = role === opt.value;
              return (
                <label
                  key={opt.value}
                  className={[
                    "relative flex cursor-pointer items-center gap-3 rounded-(--radius-xl) border px-4 py-3 text-sm",
                    "transition-colors duration-(--duration-fast) ease-(--ease-out-expo)",
                    active
                      ? "border-accent/60 bg-accent/8"
                      : "border-border bg-card hover:border-accent/40",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="recipient_role"
                    checked={active}
                    onChange={() => setRole(opt.value)}
                    className="sr-only"
                  />
                  <span
                    className={[
                      "relative flex h-4 w-4 items-center justify-center rounded-full border",
                      active ? "border-accent" : "border-border",
                    ].join(" ")}
                  >
                    <AnimatePresence>
                      {active && (
                        <motion.span
                          key="dot"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ type: "spring", stiffness: 420, damping: 22 }}
                          className="h-2 w-2 rounded-full bg-accent"
                        />
                      )}
                    </AnimatePresence>
                  </span>
                  <span className="font-medium text-(--color-text-strong)">
                    {opt.title}
                  </span>
                  <span className="ml-auto text-xs text-(--color-text-faint)">
                    {opt.meta}
                  </span>
                </label>
              );
            })}
          </div>

          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Mesajını yaz…"
            className="mt-5 resize-none"
          />

          {sendMut.isError && (
            <div className="mt-3 rounded-(--radius-md) border border-destructive/20 bg-destructive/8 px-3 py-2 text-xs text-destructive">
              {(sendMut.error as Error)?.message ?? "Gönderilemedi"}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Vazgeç
            </Button>
            <Button
              type="button"
              variant="accent"
              disabled={!body.trim() || sendMut.isPending}
              onClick={() => sendMut.mutate()}
            >
              {sendMut.isPending ? "Gönderiliyor…" : "Gönder"}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function recipientLabel(t: ThreadSummary): string {
  if (t.recipient_role === "admin") return "Yönetim";
  if (t.recipient_name) return `Koord. ${t.recipient_name}`;
  return "Koordinatör";
}

function formatDateTime(s: string): string {
  try {
    const d = new Date(s);
    return d.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}
