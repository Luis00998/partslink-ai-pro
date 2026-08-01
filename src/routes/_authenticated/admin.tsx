import { createFileRoute } from '@tanstack/react-router';
import { PageHeader, PageBody } from '@/components/page-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, Database, Search, TrendingUp, Users, AlertTriangle, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const Route = createFileRoute('/_authenticated/admin')({
  component: AdminDashboard,
});

function AdminDashboard() {
  const statsQuery = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [pecasCount, buscasCount, buscasSemResultado, ultimasImportacoes] = await Promise.all([
        supabase.from('pecas').select('id', { count: 'exact', head: true }),
        supabase.from('historico_buscas').select('id', { count: 'exact', head: true }),
        supabase.from('historico_buscas').select('*').contains('resultado', { total: 0 }).limit(5),
        supabase.from('pecas').select('*').order('created_at', { ascending: false }).limit(5)
      ]);

      return {
        totalPecas: pecasCount.count || 0,
        totalBuscas: buscasCount.count || 0,
        buscasSemResultado: buscasSemResultado.data || [],
        ultimasImportacoes: ultimasImportacoes.data || []
      };
    }
  });

  if (statsQuery.isLoading) return <AdminSkeleton />;

  const stats = statsQuery.data!;

  return (
    <>
      <PageHeader title="Painel Administrativo" description="Gestão e estatísticas do catálogo técnico." />
      <PageBody>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total de Peças" value={stats.totalPecas} icon={Database} description="Cadastradas no sistema" />
          <StatCard title="Total de Pesquisas" value={stats.totalBuscas} icon={Search} description="Histórico acumulado" />
          <StatCard title="Pesquisas Hoje" value="--" icon={Clock} description="Aguardando métrica real" />
          <StatCard title="Novos Usuários" value="--" icon={Users} description="Últimos 30 dias" />
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Peças Mais Pesquisadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground italic">Em desenvolvimento...</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-warning">
                <AlertTriangle className="h-4 w-4" /> Pesquisas Sem Resultado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.buscasSemResultado.map((b: any) => (
                  <div key={b.id} className="flex justify-between items-center text-sm border-b border-border pb-2 last:border-0">
                    <span className="font-mono">{b.termo}</span>
                    <span className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
                {stats.buscasSemResultado.length === 0 && <div className="text-xs text-muted-foreground">Nenhuma falha registrada.</div>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Últimas Atualizações no Catálogo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.ultimasImportacoes.map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center text-sm border-b border-border pb-2 last:border-0">
                    <div>
                      <div className="font-medium">{p.descricao}</div>
                      <div className="text-xs text-muted-foreground">{p.codigo_original || 'S/ OEM'} · {p.fabricante || 'S/ Fabricante'}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  );
}

function StatCard({ title, value, icon: Icon, description }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function AdminSkeleton() {
  return (
    <PageBody>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </PageBody>
  );
}