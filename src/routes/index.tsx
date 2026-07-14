import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Layers, Fingerprint, Car, Barcode, Camera, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PartsLink AI Pro — Catálogo técnico de peças automotivas" },
      { name: "description", content: "Catálogo técnico profissional: identifique peças por placa, chassi, código original, código de fabricante, nome ou foto. Linha pesada e leve." },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/busca" });
  },
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-primary shadow-glow">
              <Layers className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight">PartsLink <span className="text-primary">AI Pro</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost" size="sm">Entrar</Button></Link>
            <Link to="/auth"><Button size="sm">Criar conta</Button></Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="mx-auto max-w-4xl px-6 py-20 md:py-28 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> Catálogo técnico com IA — nunca inventa códigos
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl">
            Identifique qualquer peça automotiva —
            <span className="bg-gradient-primary bg-clip-text text-transparent"> pesada ou leve</span>.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Placa, chassi (VIN), código original, código de fabricante, nome ou foto.
            Uma única barra de busca. Precisão técnica em primeiro lugar.
          </p>

          <form
            className="mx-auto mt-8 flex max-w-2xl gap-2"
            onSubmit={(e) => { e.preventDefault(); navigate({ to: "/auth" }); }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Placa, chassi, código original, nome da peça…"
                className="h-12 pl-10 text-base"
              />
            </div>
            <Button size="lg" type="submit">Buscar</Button>
          </form>

          <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
            <Chip icon={Car} label="Placa" />
            <Chip icon={Fingerprint} label="Chassi (VIN)" />
            <Chip icon={Barcode} label="Código original" />
            <Chip icon={Barcode} label="Código do fabricante" />
            <Chip icon={Search} label="Nome da peça" />
            <Chip icon={Camera} label="Foto (IA)" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          <Feature
            icon={ShieldCheck}
            title="Nunca inventa códigos"
            desc="Toda resposta técnica passa por consulta à base ou API real. Se não existir, respondemos 'não encontrado' — nunca uma equivalência deduzida."
          />
          <Feature
            icon={Sparkles}
            title="Parts AI com RAG"
            desc="Assistente especialista que consulta primeiro o catálogo e só depois responde. Zero alucinação em códigos e aplicações."
          />
          <Feature
            icon={Layers}
            title="Catálogo por veículo"
            desc="Motor, combustível, ar, arrefecimento, freios, suspensão, elétrica — inspirado no PartsLink24 com a agilidade do Audatex."
          />
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} PartsLink AI Pro
      </footer>
    </div>
  );
}

function Chip({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/60 px-2.5 py-1">
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
