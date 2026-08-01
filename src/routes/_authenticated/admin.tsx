import { createFileRoute } from '@tanstack/react-router';
import { PageHeader, PageBody } from '@/components/page-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database, Search, TrendingUp, Users, AlertTriangle, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const Route = createFileRoute('/_authenticated/admin')({
  component: AdminDashboard,
});

function AdminDashboard() {
  const statsQuery = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      // Get counts from the optimized view
      const { data: statsView, error: statsError } = await supabase
        .from('admin_stats' as any)
        .select('*')
        .single();
      
      if (statsError) {
        console.error('Error fetching admin stats view:', statsError);
        // Fallback to manual counts if view fails
        const { count: pecasCount } = await supabase.from('pecas').select('*', { count: 'exact', head: true });
        const { count: buscasCount } = await supabase.from('historico_buscas').select('*', { count: 'exact', head: true });
        
        return {
          totalPecas: pecasCount || 0,
          totalBuscas: buscasCount || 0,
          pesquisasBanco: 0,
          pesquisasInternet: 0,
          pecasEnriquecidas: 0,
          economiaTavily: 0,
          buscasSemResultado: [],
          ultimasImportacoes: []
        };
      }

      // Get latest parts
      const { data: ultimasImportacoes } = await supabase
        .from('pecas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: ultimasBuscas } = await supabase
        .from('historico_buscas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      const failedSearches = (ultimasBuscas || []).filter((b: any) => {
         const res = b.resultado as any;
         return res && (res.total === 0 || res.encontrado === false);
      }).slice(0, 5);

      const totalInternet = (statsView as any)?.pesquisas_internet || 0;
      const totalBanco = (statsView as any)?.pesquisas_banco || 0;
      
      return {
        totalPecas: (statsView as any)?.total_pecas || 0,
        totalBuscas: (statsView as any)?.total_pesquisas || 0,
        pesquisasBanco: totalBanco,
        pesquisasInternet: totalInternet,
        pecasEnriquecidas: (statsView as any)?.pecas_enriquecidas || 0,
        economiaTavily: totalBanco * 0.05, // Estimate 0.05 credits saved per local search
        buscasSemResultado: failedSearches,
        ultimasImportacoes: ultimasImportacoes || []
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
          <StatCard title="Total de Peças" value={stats.totalPecas} icon={Database} description="No catálogo" />
          <StatCard title="Pesquisas Totais" value={stats.totalBuscas} icon={Search} description="Histórico total" />
          <StatCard title="Respondido pelo Banco" value={stats.pesquisasBanco} icon={Clock} description="Acesso rápido" />
          <StatCard title="Respondido pela Internet" value={stats.pesquisasInternet} icon={TrendingUp} description="Via Smart Search" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
          <StatCard title="Economia Tavily" value={stats.economiaTavily.toLocaleString('pt-BR', { style: 'currency', currency: 'USD' })} icon={TrendingUp} description="Créditos poupados" />
          <StatCard title="Peças Enriquecidas" value={stats.pecasEnriquecidas} icon={Database} description="Salvas via IA" />
          <StatCard title="Falhas de Busca" value={stats.buscasSemResultado.length} icon={AlertTriangle} description="Últimas sem resultado" />
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Distribuição por Fabricante
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground italic">Relatório em processamento...</div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-warning">
                <AlertTriangle className="h-4 w-4" /> Lacunas no Catálogo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.buscasSemResultado.map((b: any) => (
                  <div key={b.id} className="flex justify-between items-center text-sm border-b border-border pb-2 last:border-0">
                    <span className="font-mono text-xs">{b.termo}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">{new Date(b.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
                {stats.buscasSemResultado.length === 0 && <div className="text-xs text-muted-foreground">Nenhuma busca sem resultado encontrada.</div>}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8 border-border/60 shadow-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Últimas Peças Catalogadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.ultimasImportacoes.map((p: any) => (
                <div key={p.id} className="flex justify-between items-center text-sm border-b border-border pb-2 last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{p.descricao}</div>
                    <div className="text-[10px] text-muted-foreground uppercase flex gap-2">
                      <span>{p.codigo_original || 'S/ OEM'}</span>
                      <span>·</span>
                      <span>{p.fabricante || 'S/ Marca'}</span>
                      {p.fonte_url && <span className="text-primary font-bold">IA</span>}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground ml-4">{new Date(p.created_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}

function StatCard({ title, value, icon: Icon, description }: any) {
  return (
    <Card className="border-border/60 shadow-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{description}</p>
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