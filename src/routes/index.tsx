import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Search,
  Layers,
  Truck,
  Sparkles,
  Package,
  FileText,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PartsLink AI Pro — Catálogo de peças por chassi, placa e código" },
      {
        name: "description",
        content:
          "Identifique peças por VIN, placa ou código original. Equivalências, orçamentos e catálogo para linha pesada e leve.",
      },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-primary shadow-glow">
              <Layers className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight">PartsLink <span className="text-primary">AI Pro</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Começar grátis</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" /> Nova geração de catálogo automotivo
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-6xl">
              O catálogo de peças mais rápido do Brasil,
              <span className="bg-gradient-primary bg-clip-text text-transparent"> agora com IA</span>.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Identifique peças por chassi (VIN), placa ou código original. Consulte
              equivalências, monte orçamentos profissionais e acelere sua oficina —
              linha pesada e leve.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/auth">
                <Button size="lg" className="shadow-glow">
                  <Zap className="mr-2 h-4 w-4" /> Começar agora
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline">Ver demonstração</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card p-6 shadow-card transition hover:border-primary/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border/60 bg-surface/50">
        <div className="mx-auto max-w-7xl px-6 py-16 text-center">
          <h2 className="text-3xl font-bold">Pronto para acelerar sua operação?</h2>
          <p className="mt-3 text-muted-foreground">Crie sua conta em segundos.</p>
          <div className="mt-6">
            <Link to="/auth">
              <Button size="lg">Criar conta gratuita</Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} PartsLink AI Pro. Todos os direitos reservados.
      </footer>
    </div>
  );
}

const features = [
  {
    icon: Search,
    title: "Busca por VIN e Placa",
    desc: "Identifique o veículo automaticamente através do chassi ou placa e abra o catálogo correto.",
  },
  {
    icon: Truck,
    title: "Linha pesada e leve",
    desc: "Scania, Volvo, Mercedes-Benz, VW, DAF, Iveco, MAN e todas as principais montadoras.",
  },
  {
    icon: Package,
    title: "Estoque e catálogo",
    desc: "Controle completo de peças, códigos originais, fornecedores e equivalências.",
  },
  {
    icon: FileText,
    title: "Orçamentos profissionais",
    desc: "Monte orçamentos com PDF, WhatsApp e cálculo automático de totais.",
  },
  {
    icon: Sparkles,
    title: "Parts AI",
    desc: "Assistente inteligente para identificar peças, sugerir substituições e tirar dúvidas técnicas.",
  },
  {
    icon: ShieldCheck,
    title: "Precisão em primeiro lugar",
    desc: "Nunca inventamos códigos. Se a informação não existe, informamos claramente.",
  },
];
