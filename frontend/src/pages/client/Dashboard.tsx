import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { MessageSquare, CreditCard, Activity, Loader2 } from "lucide-react";
import api from "../../lib/axios";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export const ClientDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [recentCampaigns, setRecentCampaigns] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async (isPolling: boolean = false) => {
      if (!isPolling) setLoading(true);
      try {
        const [reportsRes, campaignsRes] = await Promise.all([
          api.get("/client/reports"),
          api.get("/client/campaigns")
        ]);
        setStats(reportsRes.data);
        setRecentCampaigns(campaignsRes.data.slice(0, 5));
      } catch (err) {
        console.error("Erreur lors du chargement du dashboard", err);
      } finally {
        if (!isPolling) setLoading(false);
      }
    };
    fetchData();
    
    const interval = setInterval(() => fetchData(true), 10000);
    return () => clearInterval(interval);
  }, []);

  const chartData = stats?.daily_stats || [];

  const kpis = [
    {
      title: "Solde SMS actuel",
      value: stats?.sms_balance?.toLocaleString() || "0",
      icon: CreditCard,
      trend: "Crédits disponibles",
      trendColor: "text-emerald-500",
    },
    {
      title: "Campagnes Envoyées",
      value: stats?.total_campaigns?.toString() || "0",
      icon: MessageSquare,
      trend: "Total historique",
      trendColor: "text-blue-500",
    },
    {
      title: "SMS Délivrés",
      value: stats?.total_sms_delivered?.toLocaleString() || "0",
      icon: Activity,
      trend: `${stats?.delivery_rate || 0}% de succès`,
      trendColor: "text-emerald-500",
    },
    {
      title: "SMS Échoués",
      value: stats?.total_sms_failed?.toLocaleString() || "0",
      icon: Activity,
      trend: "Erreurs de réseau",
      trendColor: "text-red-500",
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => (
          <Card key={index} className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                {kpi.title}
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <kpi.icon className="h-4 w-4 text-indigo-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{kpi.value}</div>
              <p className={`text-xs mt-1 font-medium ${kpi.trendColor}`}>
                {kpi.trend}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-2 glass-card h-[400px]">
          <CardHeader>
            <CardTitle className="text-lg">Consommation SMS (7 jours)</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValueClient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
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
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValueClient)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
          <div className="px-6 pb-6">
             <p className="text-xs text-slate-500 italic flex items-center gap-1.5">
               <Activity className="w-3 h-3 text-emerald-500" />
               Suivi en direct de vos envois de messages.
             </p>
          </div>
        </Card>
        
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Dernières Campagnes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentCampaigns.length > 0 ? (
              recentCampaigns.map((camp) => (
                <div key={camp.id} className="flex flex-col gap-1 p-3 rounded-lg hover:bg-slate-50 border border-slate-100">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium text-slate-900 truncate pr-2">{camp.name}</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      camp.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {camp.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1 text-[11px]">
                    <p className="text-slate-500">{camp.total_recipients} Destinataires</p>
                    <p className="font-semibold text-slate-700">-{camp.total_sms_used} SMS</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">
                Aucune campagne récente
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
