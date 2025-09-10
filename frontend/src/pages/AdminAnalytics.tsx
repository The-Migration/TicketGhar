import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Calendar, 
  DollarSign, 
  ShoppingCart,
  Eye,
  Download,
  RefreshCw,
  Filter,
  Calendar as CalendarIcon,
  PieChart,
  Activity
} from 'lucide-react';
import { ColorfulCard } from '../components/ui/colorful-card';
import RainbowButton from '../components/ui/rainbow-button';
import NeonText from '../components/ui/neon-text';

interface AnalyticsData {
  overview: {
    totalRevenue: number;
    totalOrders: number;
    totalUsers: number;
    totalEvents: number;
    revenueGrowth: number;
    ordersGrowth: number;
    usersGrowth: number;
    eventsGrowth: number;
  };
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    orders: number;
  }>;
  topEvents: Array<{
    id: string;
    title: string;
    revenue: number;
    ticketsSold: number;
    conversionRate: number;
  }>;
  userActivity: Array<{
    date: string;
    newUsers: number;
    activeUsers: number;
    orders: number;
  }>;
  paymentMethods: Array<{
    method: string;
    count: number;
    percentage: number;
    revenue: number;
  }>;
  eventCategories: Array<{
    category: string;
    count: number;
    revenue: number;
    percentage: number;
  }>;
}

const AdminAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  // Mock data - in real app, this would come from API
  useEffect(() => {
    const mockAnalytics: AnalyticsData = {
      overview: {
        totalRevenue: 125750.50,
        totalOrders: 1847,
        totalUsers: 1256,
        totalEvents: 45,
        revenueGrowth: 12.5,
        ordersGrowth: 8.3,
        usersGrowth: 15.2,
        eventsGrowth: 22.1
      },
      revenueByMonth: [
        { month: 'Jan', revenue: 8500, orders: 120 },
        { month: 'Feb', revenue: 9200, orders: 135 },
        { month: 'Mar', revenue: 10800, orders: 150 },
        { month: 'Apr', revenue: 12500, orders: 175 },
        { month: 'May', revenue: 14200, orders: 200 },
        { month: 'Jun', revenue: 16800, orders: 240 },
        { month: 'Jul', revenue: 19500, orders: 280 },
        { month: 'Aug', revenue: 22100, orders: 315 },
        { month: 'Sep', revenue: 18900, orders: 270 },
        { month: 'Oct', revenue: 16500, orders: 235 },
        { month: 'Nov', revenue: 14200, orders: 200 },
        { month: 'Dec', revenue: 12850, orders: 180 }
      ],
      topEvents: [
        {
          id: '1',
          title: 'Summer Music Festival 2024',
          revenue: 45000,
          ticketsSold: 600,
          conversionRate: 85.2
        },
        {
          id: '2',
          title: 'Tech Conference 2024',
          revenue: 32000,
          ticketsSold: 400,
          conversionRate: 78.5
        },
        {
          id: '3',
          title: 'Art Exhibition Opening',
          revenue: 18000,
          ticketsSold: 720,
          conversionRate: 92.1
        },
        {
          id: '4',
          title: 'Comedy Night',
          revenue: 15000,
          ticketsSold: 500,
          conversionRate: 88.7
        }
      ],
      userActivity: [
        { date: '2025-09-01', newUsers: 25, activeUsers: 180, orders: 45 },
        { date: '2025-09-02', newUsers: 32, activeUsers: 195, orders: 52 },
        { date: '2025-09-03', newUsers: 28, activeUsers: 210, orders: 48 },
        { date: '2025-09-04', newUsers: 35, activeUsers: 225, orders: 61 },
        { date: '2025-09-05', newUsers: 41, activeUsers: 240, orders: 67 },
        { date: '2025-09-06', newUsers: 38, activeUsers: 255, orders: 73 },
        { date: '2025-09-07', newUsers: 45, activeUsers: 270, orders: 79 }
      ],
      paymentMethods: [
        { method: 'Credit Card', count: 1205, percentage: 65.2, revenue: 82000 },
        { method: 'Stripe', count: 342, percentage: 18.5, revenue: 22800 },
        { method: 'PayPal', count: 200, percentage: 10.8, revenue: 13350 },
        { method: 'Bank Transfer', count: 100, percentage: 5.4, revenue: 7600 }
      ],
      eventCategories: [
        { category: 'Music', count: 15, revenue: 65000, percentage: 35.2 },
        { category: 'Technology', count: 12, revenue: 48000, percentage: 26.0 },
        { category: 'Art', count: 8, revenue: 32000, percentage: 17.3 },
        { category: 'Comedy', count: 6, revenue: 25000, percentage: 13.5 },
        { category: 'Sports', count: 4, revenue: 15000, percentage: 8.1 }
      ]
    };

    setTimeout(() => {
      setAnalytics(mockAnalytics);
      setIsLoading(false);
    }, 1500);
  }, [dateRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? (
      <TrendingUp className="w-4 h-4 text-green-600" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-600" />
    );
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'text-green-600' : 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-vibrant-purple-50 via-vibrant-blue-50 to-vibrant-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-vibrant-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-vibrant-purple-50 via-vibrant-blue-50 to-vibrant-pink-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <NeonText 
            className="text-4xl font-bold mb-2" 
            color="purple" 
          >
            Analytics Dashboard
          </NeonText>
          <p className="text-gray-600 text-lg">
            Comprehensive insights into your platform performance
          </p>
        </div>

        {/* Controls */}
        <div className="mb-8">
          <ColorfulCard className="p-6" colorScheme="blue" variant="glass">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Range
                  </label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-vibrant-blue-500"
                  >
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                    <option value="1y">Last year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Metric
                  </label>
                  <select
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-vibrant-blue-500"
                  >
                    <option value="revenue">Revenue</option>
                    <option value="orders">Orders</option>
                    <option value="users">Users</option>
                    <option value="events">Events</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <RainbowButton variant="aurora" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </RainbowButton>
                <RainbowButton variant="sunset" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </RainbowButton>
              </div>
            </div>
          </ColorfulCard>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <ColorfulCard className="p-6" colorScheme="purple" variant="glass">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(analytics.overview.totalRevenue)}
                </p>
                <div className="flex items-center mt-1">
                  {getGrowthIcon(analytics.overview.revenueGrowth)}
                  <span className={`text-sm ml-1 ${getGrowthColor(analytics.overview.revenueGrowth)}`}>
                    {analytics.overview.revenueGrowth > 0 ? '+' : ''}{analytics.overview.revenueGrowth}%
                  </span>
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-vibrant-purple-600" />
            </div>
          </ColorfulCard>

          <ColorfulCard className="p-6" colorScheme="blue" variant="glass">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(analytics.overview.totalOrders)}
                </p>
                <div className="flex items-center mt-1">
                  {getGrowthIcon(analytics.overview.ordersGrowth)}
                  <span className={`text-sm ml-1 ${getGrowthColor(analytics.overview.ordersGrowth)}`}>
                    {analytics.overview.ordersGrowth > 0 ? '+' : ''}{analytics.overview.ordersGrowth}%
                  </span>
                </div>
              </div>
              <ShoppingCart className="w-8 h-8 text-vibrant-blue-600" />
            </div>
          </ColorfulCard>

          <ColorfulCard className="p-6" colorScheme="emerald" variant="glass">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(analytics.overview.totalUsers)}
                </p>
                <div className="flex items-center mt-1">
                  {getGrowthIcon(analytics.overview.usersGrowth)}
                  <span className={`text-sm ml-1 ${getGrowthColor(analytics.overview.usersGrowth)}`}>
                    {analytics.overview.usersGrowth > 0 ? '+' : ''}{analytics.overview.usersGrowth}%
                  </span>
                </div>
              </div>
              <Users className="w-8 h-8 text-vibrant-emerald-600" />
            </div>
          </ColorfulCard>

          <ColorfulCard className="p-6" colorScheme="orange" variant="glass">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Events</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(analytics.overview.totalEvents)}
                </p>
                <div className="flex items-center mt-1">
                  {getGrowthIcon(analytics.overview.eventsGrowth)}
                  <span className={`text-sm ml-1 ${getGrowthColor(analytics.overview.eventsGrowth)}`}>
                    {analytics.overview.eventsGrowth > 0 ? '+' : ''}{analytics.overview.eventsGrowth}%
                  </span>
                </div>
              </div>
              <Calendar className="w-8 h-8 text-vibrant-orange-600" />
            </div>
          </ColorfulCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Revenue Chart */}
          <ColorfulCard className="p-6" colorScheme="blue" variant="glass">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-vibrant-blue-600" />
                Revenue Trend
              </h3>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-vibrant-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Revenue</span>
              </div>
            </div>
            <div className="space-y-3">
              {analytics.revenueByMonth.slice(-6).map((month, index) => (
                <div key={month.month} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 w-12">{month.month}</span>
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-vibrant-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${(month.revenue / Math.max(...analytics.revenueByMonth.map(m => m.revenue))) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-20 text-right">
                    {formatCurrency(month.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </ColorfulCard>

          {/* Top Events */}
          <ColorfulCard className="p-6" colorScheme="emerald" variant="glass">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-vibrant-emerald-600" />
                Top Performing Events
              </h3>
              <Eye className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {analytics.topEvents.map((event, index) => (
                <div key={event.id} className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-vibrant-emerald-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-bold text-vibrant-emerald-600">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{event.title}</p>
                      <p className="text-xs text-gray-500">{event.ticketsSold} tickets sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(event.revenue)}
                    </p>
                    <p className="text-xs text-green-600">{event.conversionRate}% conversion</p>
                  </div>
                </div>
              ))}
            </div>
          </ColorfulCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Payment Methods */}
          <ColorfulCard className="p-6" colorScheme="purple" variant="glass">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <PieChart className="w-5 h-5 mr-2 text-vibrant-purple-600" />
                Payment Methods
              </h3>
            </div>
            <div className="space-y-4">
              {analytics.paymentMethods.map((method, index) => (
                <div key={method.method} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-full mr-3" 
                         style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}></div>
                    <span className="text-sm font-medium text-gray-900">{method.method}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(method.revenue)}
                    </p>
                    <p className="text-xs text-gray-500">{method.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </ColorfulCard>

          {/* Event Categories */}
          <ColorfulCard className="p-6" colorScheme="orange" variant="glass">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-vibrant-orange-600" />
                Event Categories
              </h3>
            </div>
            <div className="space-y-4">
              {analytics.eventCategories.map((category, index) => (
                <div key={category.category} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-full mr-3" 
                         style={{ backgroundColor: `hsl(${index * 72}, 70%, 50%)` }}></div>
                    <span className="text-sm font-medium text-gray-900">{category.category}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(category.revenue)}
                    </p>
                    <p className="text-xs text-gray-500">{category.count} events</p>
                  </div>
                </div>
              ))}
            </div>
          </ColorfulCard>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;