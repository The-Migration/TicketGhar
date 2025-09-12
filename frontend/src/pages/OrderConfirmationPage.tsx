import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEvents } from '../contexts/EventContext';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrderContext';
import LoadingSpinner from '../components/ui/loading-spinner';

const OrderConfirmationPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { currentEvent, fetchEvent } = useEvents();
  const { user, isAuthenticated } = useAuth();
  const { orders, fetchOrders } = useOrders();
  const [isLoading, setIsLoading] = useState(true);
  const [latestOrder, setLatestOrder] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (eventId) {
      fetchEvent(eventId);
    }
    
    // Fetch orders to get the latest one
    fetchOrders().then(() => {
      setIsLoading(false);
    });
  }, [eventId, fetchEvent, fetchOrders, isAuthenticated, navigate]);

  useEffect(() => {
    if (orders && orders.length > 0) {
      console.log('🔍 OrderConfirmationPage - All orders:', orders.map(o => ({ id: o.id, eventId: o.eventId, status: o.status })));
      console.log('🔍 OrderConfirmationPage - Looking for eventId:', eventId);
      
      // Get the most recent order for this event
      const eventOrders = orders.filter(order => order.eventId === eventId);
      console.log('🔍 OrderConfirmationPage - Event orders found:', eventOrders.length);
      
      if (eventOrders.length > 0) {
        const latest = eventOrders.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        console.log('✅ OrderConfirmationPage - Latest order:', latest.id);
        setLatestOrder(latest);
      } else {
        console.log('❌ OrderConfirmationPage - No orders found for event:', eventId);
        // If no orders found for this event, try to get the most recent order overall
        const mostRecent = orders.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        console.log('🔍 OrderConfirmationPage - Using most recent order overall:', mostRecent.id);
        setLatestOrder(mostRecent);
      }
    }
  }, [orders, eventId]);

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const generateQRCode = (orderId: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${orderId}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!currentEvent) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Event not found</h2>
          <Link to="/" className="text-indigo-400 hover:underline">
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          {/* Animated Checkmark */}
          <div>
            <svg 
              className="mx-auto h-24 w-24 text-green-400" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none"
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                className="success-checkmark" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="1.5"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* Content */}
          <div className="mt-6">
            <h1 className="text-3xl font-extrabold text-white">You're all set!</h1>
            <p className="mt-3 text-lg text-gray-400">
              Your ticket for {currentEvent.title || currentEvent.name} is confirmed.
            </p>
          </div>

          {/* Ticket Preview */}
          <div className="mt-8 transform scale-95">
            <div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden text-left">
              {/* Main Image Part */}
              <div className="relative">
                <img 
                  className="w-full h-40 object-cover" 
                  src={currentEvent.imageUrl || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1000&q=80'} 
                  alt={currentEvent.title || currentEvent.name}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-800 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-4">
                  <h2 className="text-2xl font-extrabold text-white">
                    {currentEvent.title || currentEvent.name}
                  </h2>
                  <p className="text-md font-semibold text-indigo-300">
                    {currentEvent.venue || currentEvent.address}
                  </p>
                </div>
              </div>
              {/* Details Part (Stub) */}
              <div className="p-4 border-t-2 border-dashed border-gray-600">
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 p-1 bg-white rounded-lg flex-shrink-0">
                    <img 
                      src={generateQRCode(latestOrder?.id || 'default')}
                      alt="QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="space-y-1">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Name</p>
                      <p className="font-bold text-white text-sm">
                        {user?.firstName} {user?.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Date</p>
                      <p className="font-bold text-white text-sm">
                        {formatEventDate(currentEvent.startDate || currentEvent.date || new Date().toISOString())}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Ticket ID</p>
                      <p className="font-mono font-bold text-sm text-indigo-300">
                        {latestOrder?.id || 'default'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to={`/ticket/${latestOrder?.id || 'default'}`}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300"
            >
              View Full Ticket
            </Link>
            <Link
              to="/user/tickets"
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300"
            >
              Go to All Orders
            </Link>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            A confirmation email with your ticket has been sent to {user?.email}
          </p>
        </div>
      </div>

    </div>
  );
};

export default OrderConfirmationPage;
