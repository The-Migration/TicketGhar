import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useOrders } from '../contexts/OrderContext';
import { formatEventDate, formatEventTime } from '../utils/timezone';

const OrderTicketsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentOrder, fetchOrder, isLoading } = useOrders();

  useEffect(() => {
    if (id) {
      fetchOrder(id);
    }
  }, [id, fetchOrder]);

  const handleDownloadTickets = async () => {
    if (!currentOrder?.id) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to download tickets.');
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:3001/api/orders/${currentOrder.id}/download-tickets`, {
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
      a.download = `tickets-order-${currentOrder.id}.${blob.type.includes('zip') ? 'zip' : 'pdf'}`;
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Order not found</h1>
          <Link to="/user/dashboard" className="text-blue-600 hover:text-blue-800">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <nav className="mb-4">
            <ol className="flex items-center space-x-2 text-sm text-gray-500">
              <li><Link to="/user/dashboard" className="hover:text-gray-700">Dashboard</Link></li>
              <li>/</li>
              <li><Link to="/user/orders" className="hover:text-gray-700">Orders</Link></li>
              <li>/</li>
              <li className="text-gray-900">Order #{currentOrder.id ? currentOrder.id.slice(-8) : 'N/A'}</li>
            </ol>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Information</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{currentOrder.event?.title || 'Event Title'}</h3>
                  <p className="text-gray-600">
                    {currentOrder.event?.date ? formatEventDate(currentOrder.event.date) : 'Date TBD'} at {currentOrder.event?.date ? formatEventTime(currentOrder.event.date) : 'Time TBD'}
                  </p>
                  <p className="text-gray-600">{currentOrder.event?.location || 'Location TBD'}</p>
                </div>
              </div>
            </div>

            {/* Ticket Details */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Ticket Details</h2>
              <div className="space-y-4">
                {currentOrder.tickets && currentOrder.tickets.length > 0 ? (
                  currentOrder.tickets.map((ticket, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900">{ticket.ticketType?.name || 'Ticket Type'}</h3>
                          <p className="text-sm text-gray-600">Quantity: {ticket.quantity || 1}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            ${ticket.totalPrice ? ticket.totalPrice.toFixed(2) : '0.00'}
                          </p>
                          <p className="text-sm text-gray-600">
                            ${ticket.ticketType?.price ? ticket.ticketType.price.toFixed(2) : '0.00'} each
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No tickets found for this order.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Order Status */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Status</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Order Status</span>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    currentOrder.status === 'confirmed' 
                      ? 'bg-green-100 text-green-800'
                      : currentOrder.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {currentOrder.status || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Payment Status</span>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    currentOrder.paymentStatus === 'paid' 
                      ? 'bg-green-100 text-green-800'
                      : currentOrder.paymentStatus === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {currentOrder.paymentStatus || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Order Date</span>
                  <span className="text-gray-900">
                    {currentOrder.createdAt ? new Date(currentOrder.createdAt).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">${currentOrder.totalAmount ? currentOrder.totalAmount.toFixed(2) : '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service Fee</span>
                  <span className="text-gray-900">$0.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="text-gray-900">$0.00</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-lg font-semibold text-gray-900">
                      ${currentOrder.totalAmount ? currentOrder.totalAmount.toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={handleDownloadTickets}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Download Tickets
                </button>
                <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors">
                  Print Tickets
                </button>
                {currentOrder.status === 'confirmed' && (
                  <button className="w-full bg-red-100 text-red-700 py-2 px-4 rounded-md hover:bg-red-200 transition-colors">
                    Request Refund
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTicketsPage;
