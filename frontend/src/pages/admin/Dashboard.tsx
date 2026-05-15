import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Users, Send, Package, Activity, Loader2 } from "lucide-react";
import api from "../../lib/axios";
import { Link } from "react-router-dom";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [recentClients, setRecentClients] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async (isPolling: boolean = false) => {
      if (!isPolling) setLoading(true);
      try {
        const [reportsRes, clientsRes] = await Promise.all([
          api.get("/admin/reports"),
          api.get("/admin/clients?status_filter=pending")
        ]);
        setStats(reportsRes.data);
        setRecentClients(clientsRes.data.slice(0, 5));
      } catch (err) {
        console.error("Erreur admin dashboard", err);
      } finally {
        if (!isPolling) setLoading(false);
      }
    };
    fetchData();
    
    const interval = setInterval(() => fetchData(true), 10000);
    return () => clearInterval(interval);
  }, []);

  // Format data for chart (from real backend stats)
  const chartData = stats?.daily_stats || [];

  const kpis = [
    {
      title: "Clients Actifs",
      value: stats?.active_clients?.toString() || "0",
      icon: Users,
      trend: `${stats?.total_clients || 0} au total`,
      trendColor: "text-emerald-500",
      href: "/admin/clients",
    },
    {
      title: "Volume SMS (Total)",
      value: stats?.total_sms_sent?.toLocaleString() || "0",
      icon: Send,
      trend: `${stats?.delivery_rate || 0}% délivrés`,
      trendColor: "text-emerald-500",
      href: "/admin/reports",
    },
    {
      title: "Chiffre d'Affaires",
      value: `${stats?.total_revenue?.toLocaleString() || "0"} XAF`,
      icon: Package,
      trend: "Ventes de packs",
      trendColor: "text-blue-500",
      href: "/admin/packs",
    },
    {
      title: "Sender IDs / Attente",
      value: stats?.pending_senders?.toString() || "0",
      icon: Activity,
      trend: "Action requise",
      trendColor: "text-amber-500",
      href: "/admin/senders",
    },
  ];

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {kpis.map((kpi, index) => (
          <Link to={kpi.href} key={index} className="block group">
            <Card className="glass-card transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 group-hover:text-blue-600 transition-colors">
                  {kpi.title}
                </CardTitle>
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <kpi.icon className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{kpi.value}</div>
                <p className={`text-xs mt-1 font-medium ${kpi.trendColor}`}>
                  {kpi.trend}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <Card className="col-span-2 glass-card h-[400px]">
          <CardHeader>
            <CardTitle className="text-lg">Évolution du Volume SMS</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                    backdropFilter: 'blur(8px)',
                    borderRadius: '16px', 
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
          <div className="px-6 pb-6">
             <p className="text-xs text-slate-500 italic flex items-center gap-1.5">
               <Activity className="w-3 h-3 text-emerald-500" />
               Mise à jour en temps réel selon l'activité de la passerelle.
             </p>
          </div>
        </Card>
        
        <Card className="glass-card h-[400px]">
          <CardHeader>
            <CardTitle>Inscriptions Récentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentClients.length > 0 ? (
              recentClients.map((client) => (
                <div key={client.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold uppercase">
                    {client.first_name[0]}{client.last_name[0]}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-slate-900">{client.first_name} {client.last_name}</h4>
                    <p className="text-xs text-slate-500">{client.company || "Individuel"}</p>
                  </div>
                  <div className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase">
                    Attente
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400 text-sm">
                Aucune inscription en attente
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
