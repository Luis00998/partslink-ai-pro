import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { chatWithPartsAI } from "@/lib/parts-ai.functions";
import { PageHeader, PageBody } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Send, Loader2, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/parts-ai")({
  head: () => ({ meta: [{ title: "Parts AI — PartsLink AI Pro" }] }),
  component: PartsAIPage,
});

type Msg = { role: "user" | "assistant"; content: string };

function PartsAIPage() {
  const chat = useServerFn(chatWithPartsAI);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Olá! Sou o Parts AI. Posso te ajudar a identificar peças, sugerir equivalências ou responder dúvidas técnicas. Como posso ajudar?" },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const mut = useMutation({
    mutationFn: async (userText: string) => {
      const next: Msg[] = [...messages, { role: "user", content: userText }];
      setMessages(next);
      const res = await chat({ data: { messages: next } });
      return res.content;
    },
    onSuccess: (content) => setMessages((m) => [...m, { role: "assistant", content }]),
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <>
      <PageHeader
        title="Parts AI"
        description="Assistente inteligente para identificação de peças e dúvidas técnicas."
      />
      <PageBody>
        <Card className="mx-auto flex h-[calc(100vh-14rem)] max-w-3xl flex-col border-border/60 shadow-card">
          <CardContent className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-primary">
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-surface"}`}>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
                {m.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            {mut.isPending && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="rounded-lg bg-surface px-4 py-2.5"><Loader2 className="h-4 w-4 animate-spin" /></div>
              </div>
            )}
            <div ref={endRef} />
          </CardContent>
          <form
            className="flex gap-2 border-t border-border p-3"
            onSubmit={(e) => { e.preventDefault(); if (input.trim() && !mut.isPending) { mut.mutate(input.trim()); setInput(""); } }}
          >
            <Input placeholder="Pergunte sobre uma peça, código ou aplicação…" value={input} onChange={(e) => setInput(e.target.value)} disabled={mut.isPending} />
            <Button type="submit" disabled={mut.isPending || !input.trim()}><Send className="h-4 w-4" /></Button>
          </form>
        </Card>
      </PageBody>
    </>
  );
}
