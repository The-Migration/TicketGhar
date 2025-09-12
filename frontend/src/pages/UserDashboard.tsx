import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrderContext';
import { formatEventDate, formatEventTime } from '../utils/timezone';

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const { orders, fetchOrders, isLoading } = useOrders();

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const ordersArray = Array.isArray(orders) ? orders : [];
  const recentOrders = ordersArray.slice(0, 5);
  const totalSpent = ordersArray.reduce((sum, order) => {
    const amount = typeof order.totalAmount === 'number' ? order.totalAmount : parseFloat(order.totalAmount) || 0;
    return sum + amount;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-gray-400 mt-2">
            Here's what's happening with your tickets and events.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
            <div className="flex items-center">
              <div className="bg-indigo-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Total Orders</p>
                <p className="text-2xl font-bold text-white">{ordersArray.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Total Spent</p>
                <p className="text-2xl font-bold text-white">PKR {(totalSpent || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">Confirmed Orders</p>
                <p className="text-2xl font-bold text-white">
                  {ordersArray.filter(order => order.status === 'confirmed').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg shadow-md border border-gray-700">
              <div className="px-6 py-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Recent Orders</h2>
                  <Link
                    to="/user/orders"
                    className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                  >
                    View all
                  </Link>
                </div>
              </div>
              
              <div className="divide-y divide-gray-700">
                {isLoading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  </div>
                ) : recentOrders.length === 0 ? (
                  <div className="p-6 text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-gray-400">No orders yet</p>
                    <Link
                      to="/events"
                      className="text-indigo-400 hover:text-indigo-300 text-sm font-medium mt-2 inline-block"
                    >
                      Browse events
                    </Link>
                  </div>
                ) : (
                  recentOrders.map((order) => (
                    <div key={order.id} className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-white">
                            {order.event?.title || order.event?.name || 'Unknown Event'}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {order.event?.startDate || order.event?.date ? 
                              `${formatEventDate(order.event.startDate || order.event.date)} at ${formatEventTime(order.event.startDate || order.event.date)}` : 
                              'Date not available'
                            }
                          </p>
                          <p className="text-sm text-gray-400">
                            {(() => {
                              // Count tickets from orderItems
                              let ticketCount = 0;
                              if (order.orderItems && Array.isArray(order.orderItems)) {
                                order.orderItems.forEach(item => {
                                  if (item.tickets && Array.isArray(item.tickets)) {
                                    ticketCount += item.tickets.length;
                                  } else {
                                    // If no individual tickets, count by quantity
                                    ticketCount += item.quantity || 1;
                                  }
                                });
                              } else if (order.tickets && Array.isArray(order.tickets)) {
                                ticketCount = order.tickets.length;
                              }
                              return `${ticketCount} ticket${ticketCount !== 1 ? 's' : ''}`;
                            })()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-white">
                            {order.event?.currency || 'PKR'} {(() => {
                              // Calculate subtotal from order items (base price without taxes/fees)
                              let subtotal = 0;
                              if (order.orderItems && Array.isArray(order.orderItems)) {
                                order.orderItems.forEach(item => {
                                  // Use unitPrice * quantity or totalPrice if available
                                  const itemTotal = item.totalPrice || (item.unitPrice || 0) * (item.quantity || 1);
                                  // Ensure itemTotal is a number
                                  const numericTotal = typeof itemTotal === 'number' ? itemTotal : parseFloat(itemTotal) || 0;
                                  subtotal += numericTotal;
                                });
                              } else {
                                // Fallback to total amount if no order items
                                subtotal = typeof order.totalAmount === 'number' ? order.totalAmount : parseFloat(order.totalAmount) || 0;
                              }
                              // Ensure subtotal is a number before calling toFixed
                              const numericSubtotal = typeof subtotal === 'number' ? subtotal : parseFloat(subtotal) || 0;
                              return numericSubtotal.toFixed(2);
                            })()}
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
                      <div className="mt-4 flex justify-end">
                        <Link
                          to={`/user/orders/${order.id}`}
                          className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  to="/events"
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors text-center block"
                >
                  Browse Events
                </Link>
                <Link
                  to="/user/profile"
                  className="w-full bg-gray-700 text-gray-300 py-2 px-4 rounded-md hover:bg-gray-600 transition-colors text-center block"
                >
                  Update Profile
                </Link>
                <Link
                  to="/user/orders"
                  className="w-full bg-gray-700 text-gray-300 py-2 px-4 rounded-md hover:bg-gray-600 transition-colors text-center block"
                >
                  View All Orders
                </Link>
              </div>
            </div>

            {/* Account Info */}
            <div className="bg-gray-800 rounded-lg shadow-md p-6 mt-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-4">Account Info</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="text-white">{user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Member since</p>
                  <p className="text-white">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user?.isVerified 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {user?.isVerified ? 'Verified' : 'Pending Verification'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
