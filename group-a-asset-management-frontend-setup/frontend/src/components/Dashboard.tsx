import { Package, AlertTriangle, TrendingUp, TrendingDown, Activity, CheckCircle, Clock, XCircle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getAssets } from '../services/assetService';
import { useEffect, useState, useMemo } from 'react';

type User = {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Asset Manager' | 'Technician' | 'Employee';
};

type DashboardProps = {
  user: User;
  onNavigate: (view: 'dashboard' | 'assets' | 'inventory' | 'faults' | 'users') => void;
};

export function Dashboard({ user, onNavigate }: DashboardProps) {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getAssets();
        setAssets(data);
      } catch {
        setAssets([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const stats = useMemo(() => {
    if (loading) return [];
    const total = assets.length;
    const inUse = assets.filter(a => a.assetsStatus?.toLowerCase() === 'in use').length;
    const maintenance = assets.filter(a => a.assetsStatus?.toLowerCase().includes('maintenance')).length;
    const inactive = assets.filter(a => a.assetsStatus?.toLowerCase() === 'inactive').length;
    return [
      { label: 'Total Assets', value: total.toString(), change: '', trend: 'up' as const, icon: Package, color: 'blue' as const },
      { label: 'In Use', value: inUse.toString(), change: '', trend: 'up' as const, icon: CheckCircle, color: 'green' as const },
      { label: 'Under Maintenance', value: maintenance.toString(), change: '', trend: 'down' as const, icon: Clock, color: 'yellow' as const },
      { label: 'Inactive', value: inactive.toString(), change: '', trend: 'down' as const, icon: XCircle, color: 'red' as const },
    ];
  }, [assets, loading]);

  const lifecycleData = useMemo(() => {
    if (loading) return [];
    const statusCounts = assets.reduce((acc, a) => {
      const status = a.assetsStatus || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }, [assets, loading]);

  const categoryData = useMemo(() => {
    if (loading) return [];
    const catCounts = assets.reduce((acc, a) => {
      const cat = a.laptopCategory || 'Other';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(catCounts).map(([name, value]) => ({ name, value }));
  }, [assets, loading]);

  const recentActivities = useMemo(() => {
    if (loading) return [];
    const activities: any[] = [];
    assets.forEach(asset => {
      if (asset.movements) {
        asset.movements.forEach((m: any) => {
          activities.push({
            id: `${asset.assetId}-${m.movementDate}`,
            type: 'asset',
            action: `${asset.make} ${asset.model} moved from ${m.fromLocation || 'N/A'} to ${m.toLocation || 'N/A'}`,
            time: new Date(m.movementDate).toLocaleString(),
          });
        });
      }
      if (asset.maintenanceHistory) {
        asset.maintenanceHistory.forEach((m: any) => {
          activities.push({
            id: `maint-${asset.assetId}-${m.maintenanceDate}`,
            type: 'maintenance',
            action: `Maintenance: ${m.description} on ${asset.make} ${asset.model}`,
            time: new Date(m.maintenanceDate).toLocaleString(),
          });
        });
      }
    });
    return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);
  }, [assets, loading]);


  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[#00A3A1] to-[#00BBD3] rounded-xl p-6 text-white">
        <h2 className="mb-2">Welcome back, {user.name}</h2>
        <p className="text-teal-100">Here's what's happening with your assets today</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'bg-teal-100 text-[#00A3A1]',
            green: 'bg-green-100 text-green-600',
            yellow: 'bg-yellow-100 text-yellow-600',
            red: 'bg-red-100 text-red-600',
          };

          return (
            <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className={`flex items-center gap-1 text-${stat.trend === 'up' ? 'green' : 'red'}-600`}>
                  {stat.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span>{stat.change}</span>
                </div>
              </div>
              <div className="text-gray-600">{stat.label}</div>
              <div className="text-gray-900 mt-1">{stat.value}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Lifecycle Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-gray-900 mb-4">Asset Lifecycle Status</h3>
          {lifecycleData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={lifecycleData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#00A3A1" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">No data</div>
          )}
        </div>

        {/* Asset Categories Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-gray-900 mb-4">Asset Categories</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#00A3A1', '#10B981', '#F59E0B', '#EF4444', '#00BBD3'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">No data</div>
          )}
        </div>
      </div>


      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900">Recent Activity</h3>
          <Activity className="w-5 h-5 text-gray-400" />
        </div>
        <div className="space-y-3">
          {recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-[#00A3A1] rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-gray-900">{activity.action}</p>
                  <p className="text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400">No recent activity</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => onNavigate('assets')}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:border-[#00A3A1] hover:shadow-md transition-all text-left"
        >
          <Package className="w-8 h-8 text-[#00A3A1] mb-3" />
          <h3 className="text-gray-900 mb-2">Manage Assets</h3>
          <p className="text-gray-600">Add, edit, or view asset details</p>
        </button>

        <button
          onClick={() => onNavigate('inventory')}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:border-[#00A3A1] hover:shadow-md transition-all text-left"
        >
          <Activity className="w-8 h-8 text-green-600 mb-3" />
          <h3 className="text-gray-900 mb-2">Track Movement</h3>
          <p className="text-gray-600">Check in/out and transfers</p>
        </button>

        <button
          onClick={() => onNavigate('faults')}
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:border-[#00A3A1] hover:shadow-md transition-all text-left"
        >
          <AlertTriangle className="w-8 h-8 text-red-600 mb-3" />
          <h3 className="text-gray-900 mb-2">Report Fault</h3>
          <p className="text-gray-600">Submit and track fault reports</p>
        </button>
      </div>
    </div>
  );
}