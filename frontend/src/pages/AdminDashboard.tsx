import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEvents } from '../contexts/EventContext';
import { useOrders } from '../contexts/OrderContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Calendar, 
  Users, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  Plus,
  Settings,
  BarChart3,
  Eye,
  Edit,
  Trash2,
  Clock,
  MapPin,
  Ticket
} from 'lucide-react';
import { ColorfulCard } from '../components/ui/colorful-card';
import RainbowButton from '../components/ui/rainbow-button';
import NeonText from '../components/ui/neon-text';

interface DashboardStats {
  totalEvents: number;
  activeEvents: number;
  totalOrders: number;
  totalRevenue: number;
  totalUsers: number;
  recentOrders: any[];
  upcomingEvents: any[];
  monthlyRevenue: number;
  conversionRate: number;
}

const AdminDashboard: React.FC = () => {
  const { events, fetchEvents } = useEvents();
  const { orders, fetchOrders } = useOrders();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    activeEvents: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalUsers: 0,
    recentOrders: [],
    upcomingEvents: [],
    monthlyRevenue: 0,
    conversionRate: 0,
  });

  useEffect(() => {
    fetchEvents();
    fetchOrders();
  }, [fetchEvents, fetchOrders]);

  useEffect(() => {
    const eventsArray = Array.isArray(events) ? events : [];
    const ordersArray = Array.isArray(orders) ? orders : [];
    
    if (eventsArray.length > 0 || ordersArray.length > 0) {
      const activeEvents = eventsArray.filter(event => event.status === 'active');
      const totalRevenue = ordersArray.reduce((sum, order) => {
        const amount = typeof order.totalAmount === 'number' ? order.totalAmount : parseFloat(order.totalAmount) || 0;
        return sum + amount;
      }, 0);
      const recentOrders = ordersArray.slice(0, 5);
      const upcomingEvents = eventsArray
        .filter(event => new Date(event.date || event.startDate) > new Date())
        .sort((a, b) => new Date(a.date || a.startDate).getTime() - new Date(b.date || b.startDate).getTime())
        .slice(0, 5);

      // Calculate monthly revenue (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const monthlyRevenue = ordersArray
        .filter(order => new Date(order.createdAt) > thirtyDaysAgo)
        .reduce((sum, order) => {
          const amount = typeof order.totalAmount === 'number' ? order.totalAmount : parseFloat(order.totalAmount) || 0;
          return sum + amount;
        }, 0);

      // Calculate conversion rate (orders / events)
      const conversionRate = eventsArray.length > 0 ? (ordersArray.length / eventsArray.length) * 100 : 0;

      setStats({
        totalEvents: eventsArray.length,
        activeEvents: activeEvents.length,
        totalOrders: ordersArray.length,
        totalRevenue,
        totalUsers: 150, // Mock data - would come from user context
        recentOrders,
        upcomingEvents,
        monthlyRevenue,
        conversionRate,
      });
    }
  }, [events, orders]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-vibrant-purple-50 via-vibrant-blue-50 to-vibrant-pink-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <NeonText 
            className="text-4xl font-bold mb-2" 
            color="purple" 
          >
            Admin Dashboard
          </NeonText>
          <p className="text-gray-600 text-lg">
            Welcome back, {user?.firstName}! Manage your ticket platform with ease.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <ColorfulCard className="p-6" colorScheme="blue" variant="glass">
            <div className="flex items-center">
              <div className="bg-vibrant-blue-100 p-3 rounded-full">
                <Calendar className="w-6 h-6 text-vibrant-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Events</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
                <p className="text-xs text-green-600">+{stats.activeEvents} active</p>
              </div>
            </div>
          </ColorfulCard>

          <ColorfulCard className="p-6" colorScheme="emerald" variant="glass">
            <div className="flex items-center">
              <div className="bg-vibrant-emerald-100 p-3 rounded-full">
                <Users className="w-6 h-6 text-vibrant-emerald-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                <p className="text-xs text-green-600">+12 this week</p>
              </div>
            </div>
          </ColorfulCard>

          <ColorfulCard className="p-6" colorScheme="orange" variant="glass">
            <div className="flex items-center">
              <div className="bg-vibrant-orange-100 p-3 rounded-full">
                <ShoppingCart className="w-6 h-6 text-vibrant-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
                <p className="text-xs text-green-600">+{stats.recentOrders.length} recent</p>
              </div>
            </div>
          </ColorfulCard>

          <ColorfulCard className="p-6" colorScheme="purple" variant="glass">
            <div className="flex items-center">
              <div className="bg-vibrant-purple-100 p-3 rounded-full">
                <DollarSign className="w-6 h-6 text-vibrant-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toFixed(2)}</p>
                <p className="text-xs text-green-600">${stats.monthlyRevenue.toFixed(2)} this month</p>
              </div>
            </div>
          </ColorfulCard>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Link to="/admin/events/new">
              <RainbowButton 
                className="w-full py-4 px-6 text-center block"
                variant="rainbow"
                size="lg"
                animated
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Event
              </RainbowButton>
            </Link>
            <Link to="/admin/events">
              <RainbowButton 
                className="w-full py-4 px-6 text-center block"
                variant="aurora"
                size="lg"
                animated
              >
                <Calendar className="w-5 h-5 mr-2" />
                Manage Events
              </RainbowButton>
            </Link>
            <Link to="/admin/users">
              <RainbowButton 
                className="w-full py-4 px-6 text-center block"
                variant="ocean"
                size="lg"
                animated
              >
                <Users className="w-5 h-5 mr-2" />
                Manage Users
              </RainbowButton>
            </Link>
            <Link to="/admin/analytics">
              <RainbowButton 
                className="w-full py-4 px-6 text-center block"
                variant="sunset"
                size="lg"
                animated
              >
                <BarChart3 className="w-5 h-5 mr-2" />
                View Analytics
              </RainbowButton>
            </Link>
            <Link to="/admin/queue">
              <RainbowButton 
                className="w-full py-4 px-6 text-center block"
                variant="ocean"
                size="lg"
                animated
              >
                <Users className="w-5 h-5 mr-2" />
                Manage Queue
              </RainbowButton>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Orders */}
          <ColorfulCard className="p-6" colorScheme="blue" variant="glass">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2 text-vibrant-blue-600" />
                Recent Orders
              </h2>
              <Link
                to="/admin/orders"
                className="text-vibrant-blue-600 hover:text-vibrant-blue-800 text-sm font-medium flex items-center"
              >
                View all <Eye className="w-4 h-4 ml-1" />
              </Link>
            </div>
            
            <div className="space-y-4">
              {stats.recentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No orders yet</p>
                </div>
              ) : (
                stats.recentOrders.map((order) => (
                  <div key={order.id} className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900">
                          {order.event?.title || 'Unknown Event'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Order #{order.id.slice(-8)}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          ${(typeof order.totalAmount === 'number' ? order.totalAmount : parseFloat(order.totalAmount) || 0).toFixed(2)}
                        </p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          order.status === 'confirmed' 
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ColorfulCard>

          {/* Upcoming Events */}
          <ColorfulCard className="p-6" colorScheme="emerald" variant="glass">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-vibrant-emerald-600" />
                Upcoming Events
              </h2>
              <Link
                to="/admin/events"
                className="text-vibrant-emerald-600 hover:text-vibrant-emerald-800 text-sm font-medium flex items-center"
              >
                View all <Eye className="w-4 h-4 ml-1" />
              </Link>
            </div>
            
            <div className="space-y-4">
              {stats.upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No upcoming events</p>
                </div>
              ) : (
                stats.upcomingEvents.map((event) => (
                  <div key={event.id} className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900">
                          {event.title || event.name}
                        </h3>
                        <p className="text-xs text-gray-400 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(event.date || event.startDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {event.venue || event.location || event.address}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900 flex items-center">
                          <Ticket className="w-3 h-3 mr-1" />
                          {event.availableTickets || event.availableTickets} left
                        </p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          event.status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : event.status === 'inactive'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {event.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ColorfulCard>
        </div>

        {/* Admin Management Tools */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ColorfulCard className="p-6" colorScheme="purple" variant="glass">
            <div className="text-center">
              <div className="bg-vibrant-purple-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Settings className="w-8 h-8 text-vibrant-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">System Settings</h3>
              <p className="text-sm text-gray-600 mb-4">Configure platform settings and preferences</p>
              <Link to="/admin/settings">
                <RainbowButton variant="rainbow" size="sm" className="w-full">
                  Manage Settings
                </RainbowButton>
              </Link>
            </div>
          </ColorfulCard>

          <ColorfulCard className="p-6" colorScheme="orange" variant="glass">
            <div className="text-center">
              <div className="bg-vibrant-orange-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-vibrant-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics & Reports</h3>
              <p className="text-sm text-gray-600 mb-4">View detailed analytics and generate reports</p>
              <Link to="/admin/analytics">
                <RainbowButton variant="sunset" size="sm" className="w-full">
                  View Analytics
                </RainbowButton>
              </Link>
            </div>
          </ColorfulCard>

          <ColorfulCard className="p-6" colorScheme="cyan" variant="glass">
            <div className="text-center">
              <div className="bg-vibrant-cyan-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="w-8 h-8 text-vibrant-cyan-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">User Management</h3>
              <p className="text-sm text-gray-600 mb-4">Manage users, roles, and permissions</p>
              <Link to="/admin/users">
                <RainbowButton variant="ocean" size="sm" className="w-full">
                  Manage Users
                </RainbowButton>
              </Link>
            </div>
          </ColorfulCard>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;