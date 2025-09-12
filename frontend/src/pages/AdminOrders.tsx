import React, { useEffect, useState } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Filter, 
  Eye, 
  Download,
  Calendar,
  User,
  DollarSign,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  MoreVertical,
  RefreshCw
} from 'lucide-react';
import { ColorfulCard } from '../components/ui/colorful-card';
import RainbowButton from '../components/ui/rainbow-button';
import NeonText from '../components/ui/neon-text';

interface Order {
  id: string;
  userId: string;
  eventId: string;
  event?: {
    title: string;
    date: string;
    venue: string;
  };
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: 'credit_card' | 'paypal' | 'stripe' | 'bank_transfer';
  paymentReference: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

interface OrderItem {
  id: string;
  ticketTypeId: string;
  ticketType?: {
    name: string;
    price: number;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Mock data - in real app, this would come from API
  useEffect(() => {
    const mockOrders: Order[] = [
      {
        id: '1',
        userId: '2',
        eventId: '1',
        event: {
          title: 'Summer Music Festival 2024',
          date: '2024-07-15T18:00:00.000Z',
          venue: 'Central Park'
        },
        user: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com'
        },
        totalAmount: 150.00,
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentMethod: 'credit_card',
        paymentReference: 'txn_123456789',
        createdAt: '2025-09-07T10:30:00.000Z',
        updatedAt: '2025-09-07T10:35:00.000Z',
        items: [
          {
            id: '1',
            ticketTypeId: '1',
            ticketType: {
              name: 'General Admission',
              price: 75.00
            },
            quantity: 2,
            unitPrice: 75.00,
            totalPrice: 150.00
          }
        ]
      },
      {
        id: '2',
        userId: '3',
        eventId: '2',
        event: {
          title: 'Tech Conference 2024',
          date: '2024-08-20T09:00:00.000Z',
          venue: 'Convention Center'
        },
        user: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com'
        },
        totalAmount: 150.00,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'stripe',
        paymentReference: 'txn_123456790',
        createdAt: '2025-09-07T14:20:00.000Z',
        updatedAt: '2025-09-07T14:20:00.000Z',
        items: [
          {
            id: '2',
            ticketTypeId: '3',
            ticketType: {
              name: 'Standard Ticket',
              price: 150.00
            },
            quantity: 1,
            unitPrice: 150.00,
            totalPrice: 150.00
          }
        ]
      },
      {
        id: '3',
        userId: '4',
        eventId: '1',
        event: {
          title: 'Summer Music Festival 2024',
          date: '2024-07-15T18:00:00.000Z',
          venue: 'Central Park'
        },
        user: {
          firstName: 'Bob',
          lastName: 'Wilson',
          email: 'bob.wilson@example.com'
        },
        totalAmount: 75.00,
        status: 'cancelled',
        paymentStatus: 'refunded',
        paymentMethod: 'credit_card',
        paymentReference: 'txn_123456791',
        createdAt: '2025-09-06T16:45:00.000Z',
        updatedAt: '2025-09-07T09:15:00.000Z',
        items: [
          {
            id: '3',
            ticketTypeId: '1',
            ticketType: {
              name: 'General Admission',
              price: 75.00
            },
            quantity: 1,
            unitPrice: 75.00,
            totalPrice: 75.00
          }
        ]
      }
    ];

    setTimeout(() => {
      setOrders(mockOrders);
      setIsLoading(false);
    }, 1000);
  }, []);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.user?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.event?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.paymentReference.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesPaymentStatus = paymentStatusFilter === 'all' || order.paymentStatus === paymentStatusFilter;
    
    return matchesSearch && matchesStatus && matchesPaymentStatus;
  });

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
  };

  const handlePaymentStatusChange = async (orderId: string, newPaymentStatus: Order['paymentStatus']) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, paymentStatus: newPaymentStatus } : order
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'credit_card': return <CreditCard className="w-4 h-4" />;
      case 'paypal': return <DollarSign className="w-4 h-4" />;
      case 'stripe': return <CreditCard className="w-4 h-4" />;
      case 'bank_transfer': return <DollarSign className="w-4 h-4" />;
      default: return <CreditCard className="w-4 h-4" />;
    }
  };

  const stats = {
    total: orders.length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    pending: orders.filter(o => o.status === 'pending').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    totalRevenue: orders.filter(o => o.paymentStatus === 'paid').reduce((sum, o) => sum + o.totalAmount, 0),
    pendingRevenue: orders.filter(o => o.paymentStatus === 'pending').reduce((sum, o) => sum + o.totalAmount, 0),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-vibrant-purple-50 via-vibrant-blue-50 to-vibrant-pink-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <NeonText 
            className="text-4xl font-bold mb-2" 
            color="purple" 
          >
            Order Management
          </NeonText>
          <p className="text-gray-600 text-lg">
            Manage all orders, payments, and transactions across your platform
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <ColorfulCard className="p-6" colorScheme="blue" variant="glass">
            <div className="text-center">
              <ShoppingCart className="w-8 h-8 text-vibrant-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">Total Orders</p>
            </div>
          </ColorfulCard>

          <ColorfulCard className="p-6" colorScheme="emerald" variant="glass">
            <div className="text-center">
              <CheckCircle className="w-8 h-8 text-vibrant-emerald-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.confirmed}</p>
              <p className="text-sm text-gray-600">Confirmed</p>
            </div>
          </ColorfulCard>

          <ColorfulCard className="p-6" colorScheme="orange" variant="glass">
            <div className="text-center">
              <Clock className="w-8 h-8 text-vibrant-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
          </ColorfulCard>

          <ColorfulCard className="p-6" colorScheme="pink" variant="glass">
            <div className="text-center">
              <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.cancelled}</p>
              <p className="text-sm text-gray-600">Cancelled</p>
            </div>
          </ColorfulCard>

          <ColorfulCard className="p-6" colorScheme="purple" variant="glass">
            <div className="text-center">
              <DollarSign className="w-8 h-8 text-vibrant-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toFixed(2)}</p>
              <p className="text-sm text-gray-600">Total Revenue</p>
            </div>
          </ColorfulCard>

          <ColorfulCard className="p-6" colorScheme="cyan" variant="glass">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-vibrant-cyan-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">${stats.pendingRevenue.toFixed(2)}</p>
              <p className="text-sm text-gray-600">Pending Revenue</p>
            </div>
          </ColorfulCard>
        </div>

        {/* Filters */}
        <ColorfulCard className="p-6 mb-8" colorScheme="blue" variant="glass">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Orders
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by customer, event, or reference..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-vibrant-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-vibrant-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Status
              </label>
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-vibrant-blue-500"
              >
                <option value="all">All Payment Statuses</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            <div className="flex items-end">
              <RainbowButton 
                variant="rainbow" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setPaymentStatusFilter('all');
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset Filters
              </RainbowButton>
            </div>
          </div>
        </ColorfulCard>

        {/* Orders Table */}
        <ColorfulCard className="p-6" colorScheme="emerald" variant="glass">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Orders ({filteredOrders.length})
            </h2>
            <RainbowButton variant="aurora" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Orders
            </RainbowButton>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vibrant-emerald-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            #{order.id.slice(-8)}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-400">
                            Ref: {order.paymentReference}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-vibrant-purple-100 flex items-center justify-center">
                              <span className="text-xs font-medium text-vibrant-purple-600">
                                {order.user?.firstName[0]}{order.user?.lastName[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {order.user?.firstName} {order.user?.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.user?.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {order.event?.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.event?.venue}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(order.event?.date || '').toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            ${typeof order.totalAmount === 'number' ? order.totalAmount.toFixed(2) : parseFloat(order.totalAmount || '0').toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getPaymentMethodIcon(order.paymentMethod)}
                          <div className="ml-2">
                            <div className="text-sm font-medium text-gray-900 capitalize">
                              {order.paymentMethod.replace('_', ' ')}
                            </div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(order.paymentStatus)}`}>
                              {order.paymentStatus}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="text-vibrant-blue-600 hover:text-vibrant-blue-900 p-1"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {order.status === 'pending' && (
                            <button
                              onClick={() => handleStatusChange(order.id, 'confirmed')}
                              className="text-green-600 hover:text-green-900 p-1"
                              title="Confirm Order"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {order.status === 'confirmed' && (
                            <button
                              onClick={() => handleStatusChange(order.id, 'cancelled')}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Cancel Order"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ColorfulCard>
      </div>
    </div>
  );
};

export default AdminOrders;