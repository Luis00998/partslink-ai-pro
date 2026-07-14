import { createFileRoute, redirect } from "@tanstack/react-router";

// Módulo de gestão removido — o produto é um catálogo técnico, não um ERP.
// Mantido apenas como redirecionamento para compatibilidade de URLs antigas.
export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/busca" });
  },
  component: () => null,
});
