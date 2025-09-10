import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrderContext';
import LoadingSpinner from '../components/ui/loading-spinner';

interface Ticket {
  id: string;
  eventId: string;
  eventName: string;
  eventImage: string;
  eventDate: string;
  eventVenue: string;
  ticketType: string;
  quantity: number;
  price: number;
  currency: string;
  status: 'upcoming' | 'past' | 'cancelled';
}

const MyTicketsPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { orders, fetchOrders, isLoading } = useOrders();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    if (isAuthenticated) {
      console.log('MyTicketsPage: Fetching orders...');
      fetchOrders();
    }
  }, [isAuthenticated, fetchOrders]);

  // Convert orders to tickets format
  const tickets: Ticket[] = React.useMemo(() => {
    console.log('MyTicketsPage: Converting orders to tickets, orders:', orders);
    if (!orders || !Array.isArray(orders)) {
      console.log('MyTicketsPage: No orders or orders is not an array');
      return [];
    }
    
    return orders.flatMap(order => 
      (order.orderItems || order.tickets || []).map((item: any) => ({
        id: `${order.id}-${item.id}`,
        eventId: order.eventId,
        eventName: order.event?.name || order.event?.title || 'Unknown Event',
        eventImage: order.event?.imageUrl || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1000&q=80',
        eventDate: order.event?.startDate || order.event?.date || new Date().toISOString(),
        eventVenue: order.event?.venue || order.event?.address || order.event?.location || 'Unknown Venue',
        ticketType: item.ticketType?.name || 'General Admission',
        quantity: item.quantity,
        price: item.price || item.totalPrice || 0,
        currency: order.currency || 'PKR',
        status: new Date(order.event?.startDate || order.event?.date || new Date()) > new Date() ? 'upcoming' : 'past'
      }))
    );
  }, [orders]);

  const upcomingTickets = tickets.filter(ticket => ticket.status === 'upcoming');
  const pastTickets = tickets.filter(ticket => ticket.status === 'past');

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Please log in to view your tickets</h2>
          <Link to="/login" className="text-indigo-400 hover:underline">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-white">My Tickets</h1>
          <p className="mt-2 text-lg text-gray-400">Your personal archive of unforgettable events.</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-lg transition-colors duration-300 ${
                activeTab === 'upcoming'
                  ? 'border-indigo-600 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Upcoming ({upcomingTickets.length})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-lg transition-colors duration-300 ${
                activeTab === 'past'
                  ? 'border-indigo-600 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Past Events ({pastTickets.length})
            </button>
          </nav>
        </div>

        {/* Ticket Lists */}
        {activeTab === 'upcoming' && (
          <div>
            {upcomingTickets.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No upcoming events</h3>
                <p className="text-gray-400 mb-6">You don't have any upcoming events yet.</p>
                <Link
                  to="/"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300"
                >
                  Browse Events
                </Link>
              </div>
            ) : (
              <div className="grid gap-6">
                {upcomingTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="bg-gray-800 rounded-xl shadow-lg flex flex-col md:flex-row items-center overflow-hidden transform transition-transform duration-300 hover:scale-105 hover:shadow-indigo-500/30"
                  >
                    <img 
                      className="h-48 w-full md:h-full md:w-48 object-cover" 
                      src={ticket.eventImage} 
                      alt={ticket.eventName}
                    />
                    <div className="p-6 flex-grow w-full">
                      <p className="text-sm font-semibold text-indigo-400">
                        {formatEventDate(ticket.eventDate)}
                      </p>
                      <h2 className="text-2xl font-bold text-white mt-1">{ticket.eventName}</h2>
                      <p className="text-gray-400 mt-1">{ticket.eventVenue}</p>
                      <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between">
                        <Link
                          to={`/ticket/${ticket.id}`}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-5 rounded-lg transition-colors duration-300"
                        >
                          View Ticket
                        </Link>
                        <div className="text-right">
                          <p className="text-sm text-gray-400">{ticket.quantity} Ticket{ticket.quantity > 1 ? 's' : ''}</p>
                          <p className="text-sm text-gray-400">{ticket.ticketType}</p>
                          <p className="text-sm font-semibold text-indigo-400">
                            {ticket.currency} {ticket.price * ticket.quantity}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'past' && (
          <div>
            {pastTickets.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No past events</h3>
                <p className="text-gray-400">You haven't attended any events yet.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {pastTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="bg-gray-800 rounded-xl shadow-lg flex flex-col md:flex-row items-center overflow-hidden opacity-60"
                  >
                    <img 
                      className="h-48 w-full md:h-full md:w-48 object-cover" 
                      src={ticket.eventImage} 
                      alt={ticket.eventName}
                    />
                    <div className="p-6 flex-grow w-full">
                      <p className="text-sm font-semibold text-gray-500">
                        {formatEventDate(ticket.eventDate)}
                      </p>
                      <h2 className="text-2xl font-bold text-gray-400 mt-1">{ticket.eventName}</h2>
                      <p className="text-gray-500 mt-1">{ticket.eventVenue}</p>
                      <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between">
                        <span className="text-gray-500 font-semibold">Event Finished</span>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">{ticket.quantity} Ticket{ticket.quantity > 1 ? 's' : ''}</p>
                          <p className="text-sm text-gray-500">{ticket.ticketType}</p>
                          <Link to="#" className="text-indigo-500 hover:underline text-sm">
                            View Receipt
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyTicketsPage;
