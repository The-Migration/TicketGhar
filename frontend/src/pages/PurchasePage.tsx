import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePurchase } from '../contexts/PurchaseContext';
import { useAuth } from '../contexts/AuthContext';

const PurchasePage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { currentSession, createPurchaseSession, updateTicketSelection, completePurchase, isLoading } = usePurchase();
  const { isAuthenticated } = useAuth();
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    billingAddress: '',
    city: '',
    state: '',
    zipCode: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (sessionId && !currentSession) {
      // If we have a sessionId but no current session, we might need to fetch it
      // For now, we'll assume the session is created elsewhere
    }
  }, [isAuthenticated, sessionId, currentSession, navigate]);

  const handleTicketQuantityChange = async (ticketTypeId: string, quantity: number) => {
    if (currentSession) {
      try {
        await updateTicketSelection(ticketTypeId, quantity);
      } catch (error) {
        console.error('Failed to update ticket selection:', error);
      }
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) return;

    setIsProcessing(true);
    try {
      const order = await completePurchase(paymentData);
      navigate(`/user/orders/${order.id}`);
    } catch (error) {
      console.error('Purchase failed:', error);
      // Handle error (show error message)
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPaymentData({
      ...paymentData,
      [e.target.name]: e.target.value,
    });
  };

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Purchase session not found</h1>
          <button
            onClick={() => navigate('/events')}
            className="text-blue-600 hover:text-blue-800"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  const totalTickets = currentSession.selectedTickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
  const totalAmount = currentSession.selectedTickets.reduce((sum, ticket) => 
    sum + ((typeof ticket.ticketType.price === 'number' ? ticket.ticketType.price : parseFloat(ticket.ticketType.price || '0')) * ticket.quantity), 0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Purchase</h1>
          <p className="text-gray-600 mt-2">
            Review your order and complete the payment to secure your tickets.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Event & Ticket Selection */}
          <div className="space-y-6">
            {/* Event Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Information</h2>
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-gray-900">{currentSession.event.title}</h3>
                <p className="text-gray-600">
                  {new Date(currentSession.event.date).toLocaleDateString()}
                </p>
                <p className="text-gray-600">{currentSession.event.location}</p>
              </div>
            </div>

            {/* Ticket Selection */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Tickets</h2>
              <div className="space-y-4">
                {currentSession.selectedTickets.map((ticket) => (
                  <div key={ticket.ticketTypeId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{ticket.ticketType.name}</h3>
                        <p className="text-sm text-gray-600">{ticket.ticketType.description || 'Standard ticket'}</p>
                      </div>
                      <span className="text-lg font-bold text-blue-600">
                        ${ticket.ticketType.price}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {ticket.ticketType.available} available
                      </span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleTicketQuantityChange(ticket.ticketTypeId, Math.max(0, ticket.quantity - 1))}
                          disabled={ticket.quantity <= 0}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                        >
                          -
                        </button>
                        <span className="w-8 text-center">{ticket.quantity}</span>
                        <button
                          onClick={() => handleTicketQuantityChange(ticket.ticketTypeId, ticket.quantity + 1)}
                          disabled={ticket.quantity >= ticket.ticketType.available}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tickets ({totalTickets})</span>
                  <span className="text-gray-900">${totalAmount.toFixed(2)}</span>
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
                      ${totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Information</h2>
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Card Number
                  </label>
                  <input
                    type="text"
                    id="cardNumber"
                    name="cardNumber"
                    value={paymentData.cardNumber}
                    onChange={handleInputChange}
                    placeholder="1234 5678 9012 3456"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      id="expiryDate"
                      name="expiryDate"
                      value={paymentData.expiryDate}
                      onChange={handleInputChange}
                      placeholder="MM/YY"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-1">
                      CVV
                    </label>
                    <input
                      type="text"
                      id="cvv"
                      name="cvv"
                      value={paymentData.cvv}
                      onChange={handleInputChange}
                      placeholder="123"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="cardholderName" className="block text-sm font-medium text-gray-700 mb-1">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    id="cardholderName"
                    name="cardholderName"
                    value={paymentData.cardholderName}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="billingAddress" className="block text-sm font-medium text-gray-700 mb-1">
                    Billing Address
                  </label>
                  <input
                    type="text"
                    id="billingAddress"
                    name="billingAddress"
                    value={paymentData.billingAddress}
                    onChange={handleInputChange}
                    placeholder="123 Main St"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={paymentData.city}
                      onChange={handleInputChange}
                      placeholder="New York"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={paymentData.state}
                      onChange={handleInputChange}
                      placeholder="NY"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    id="zipCode"
                    name="zipCode"
                    value={paymentData.zipCode}
                    onChange={handleInputChange}
                    placeholder="10001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isProcessing || totalTickets === 0}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing...' : `Complete Purchase - $${totalAmount.toFixed(2)}`}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchasePage;
