import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrderContext';

const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { orders, fetchOrders } = useOrders();
  const [isLoading, setIsLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Fetch orders to get the order data
    fetchOrders().then(() => {
      setIsLoading(false);
    });
  }, [fetchOrders, isAuthenticated, navigate]);

  useEffect(() => {
    if (orders && orders.length > 0 && id) {
      console.log('🔍 TicketDetailPage - Looking for order with ID:', id);
      console.log('🔍 TicketDetailPage - Available orders:', orders.map(o => ({ id: o.id, status: o.status })));
      
      // Find the order by ID - try exact match first
      let foundOrder = orders.find(order => order.id === id);
      
      // If not found, try to find by orderNumber or partial ID match
      if (!foundOrder) {
        console.log('🔍 TicketDetailPage - Exact match not found, trying partial match...');
        foundOrder = orders.find(order => 
          order.id.includes(id) || 
          id.includes(order.id)
        );
      }
      
      if (foundOrder) {
        console.log('✅ TicketDetailPage - Found order:', foundOrder.id);
        setOrder(foundOrder);
        // For now, create mock tickets - in real implementation, these would come from the order
        const ticketCount = foundOrder.orderItems?.reduce((total: number, item: any) => total + (item.quantity || 1), 0) || 1;
        const mockTickets = Array.from({ length: ticketCount }, (_, index) => ({
          id: `${foundOrder!.id}-${index + 1}`,
          ticketNumber: `TKT-${foundOrder!.id.slice(-8).toUpperCase()}-${index + 1}`,
          orderId: foundOrder!.id,
          eventName: foundOrder!.event?.name || 'Event Name',
          eventDate: foundOrder!.event?.startDate || foundOrder!.event?.date,
          eventVenue: foundOrder!.event?.venue || foundOrder!.event?.location || 'Venue TBD',
          ticketType: foundOrder!.orderItems?.[0]?.ticketType?.name || 'General Admission',
          customerName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Customer Name',
          eventImage: foundOrder!.event?.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMWYyOTM3Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iI2ZmZmZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkV2ZW50IEltYWdlPC90ZXh0Pjwvc3ZnPg=='
        }));
        setTickets(mockTickets);
      } else {
        console.log('❌ TicketDetailPage - Order not found with ID:', id);
      }
    }
  }, [orders, id, user]);

  const formatEventDate = (dateString: string) => {
    if (!dateString) return 'Date TBD';
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

  const generateQRCode = (ticketNumber: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticketNumber}`;
  };

  const handleDownloadAll = async () => {
    if (!order?.id) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to download tickets.');
      return;
    }
    
    console.log('🔍 Downloading tickets for order ID:', order.id);
    console.log('🔍 Download URL:', `http://localhost:3001/api/orders/${order.id}/download-tickets`);
    
    try {
      const response = await fetch(`http://localhost:3001/api/orders/${order.id}/download-tickets`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download tickets');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tickets-order-${order.id}.${blob.type.includes('zip') ? 'zip' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading tickets:', error);
      alert('Failed to download tickets. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-white mb-4">Order not found</h1>
          <p className="text-gray-400 mb-6">
            We couldn't find an order with ID: <code className="bg-gray-800 px-2 py-1 rounded text-sm">{id}</code>
          </p>
          <div className="space-y-3">
            <Link 
              to="/user/tickets" 
              className="block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300"
            >
              Back to My Tickets
            </Link>
            <Link 
              to="/user/dashboard" 
              className="block bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      {/* Header */}
      <header className="bg-gray-800/80 backdrop-blur-md shadow-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="font-extrabold text-2xl text-white">Ticket Ghar</Link>
            <Link to="/user/tickets" className="text-indigo-400 hover:text-indigo-300 transition-colors duration-300 font-semibold">
              ← Back to My Tickets
            </Link>
          </div>
        </div>
      </header>

      <main className="py-8 px-4 flex flex-col items-center justify-center">
        {/* Ticket Display */}
        <div className="w-full max-w-sm space-y-4">
          {tickets.map((ticket, index) => (
            <div key={ticket.id} className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
              <div className="relative">
                <img 
                  className="w-full h-48 object-cover" 
                  src={ticket.eventImage} 
                  alt="Event cover"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMWYyOTM3Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iI2ZmZmZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkV2ZW50IEltYWdlPC90ZXh0Pjwvc3ZnPg==';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-800 to-transparent"></div>
                <div className="absolute top-4 right-4 bg-black/50 text-white font-bold text-lg px-3 py-1 rounded-lg">
                  {index + 1} of {tickets.length}
                </div>
                <div className="absolute bottom-0 left-0 p-6">
                  <h1 className="text-3xl font-extrabold text-white">{ticket.eventName}</h1>
                  <p className="text-lg font-semibold text-indigo-300">Live in Concert</p>
                </div>
              </div>
              <div className="p-6 border-t-2 border-dashed border-gray-600">
                <div className="flex items-center space-x-4">
                  <div className="w-24 h-24 p-1 bg-white rounded-lg flex-shrink-0">
                    <img
                      src={generateQRCode(ticket.ticketNumber)}
                      alt="QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-left space-y-2">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Name</p>
                      <p className="font-bold text-white">{ticket.customerName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Date</p>
                      <p className="font-bold text-white">{formatEventDate(ticket.eventDate)}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 border-t border-gray-700 pt-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Ticket ID</p>
                  <p className="font-mono font-bold text-lg text-indigo-300">{ticket.ticketNumber}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 space-y-3 w-full max-w-sm">
          <button
            onClick={handleDownloadAll}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            Download All Tickets (PDF)
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300">
              Add to Apple Wallet
            </button>
            <button className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300">
              Add to Google Pay
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TicketDetailPage;
