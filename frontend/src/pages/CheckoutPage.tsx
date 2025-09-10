import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEvents } from '../contexts/EventContext';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrderContext';
import LoadingSpinner from '../components/ui/loading-spinner';

interface TicketSelection {
  ticketTypeId: string;
  name: string;
  price: number;
  quantity: number;
  maxPerUser: number;
}

const CheckoutPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { currentEvent, fetchEvent } = useEvents();
  const { user, isAuthenticated } = useAuth();
  const { createOrder } = useOrders();
  
  const [timeLeft, setTimeLeft] = useState(8 * 60); // 8 minutes in seconds
  const [timerStarted, setTimerStarted] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<TicketSelection[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState(1); // 1: Select tickets, 2: Payment

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (eventId) {
      fetchEvent(eventId);
      
      // Check if user has a valid purchase session (from queue)
      const purchaseSessionId = localStorage.getItem(`purchaseSession_${eventId}`);
      if (!purchaseSessionId) {
        // No valid purchase session - redirect to queue
        alert('You must join the queue first to purchase tickets.');
        navigate(`/queue/${eventId}`);
        return;
      }
    }
  }, [eventId, fetchEvent, isAuthenticated, navigate]);

  useEffect(() => {
    if (!timerStarted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up, redirect back to queue
          navigate(`/queue/${eventId}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timerStarted, eventId, navigate]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleTicketQuantityChange = (ticketTypeId: string, quantity: number) => {
    setSelectedTickets(prev => {
      const existing = prev.find(t => t.ticketTypeId === ticketTypeId);
      if (existing) {
        if (quantity === 0) {
          return prev.filter(t => t.ticketTypeId !== ticketTypeId);
        }
        return prev.map(t => 
          t.ticketTypeId === ticketTypeId ? { ...t, quantity } : t
        );
      } else if (quantity > 0) {
        const ticketType = currentEvent?.ticketTypes?.find(t => t.id === ticketTypeId);
        if (ticketType) {
          return [...prev, {
            ticketTypeId,
            name: ticketType.name,
            price: ticketType.price,
            quantity,
            maxPerUser: ticketType.maxPerUser || 10
          }];
        }
      }
      return prev;
    });
  };

  const getTotalPrice = () => {
    return selectedTickets.reduce((total, ticket) => total + (ticket.price * ticket.quantity), 0);
  };

  const handleProceedToPayment = () => {
    if (selectedTickets.length === 0) {
      alert('Please select at least one ticket');
      return;
    }
    setStep(2);
    setTimerStarted(true); // Start the 8-minute timer when proceeding to payment
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get purchase session ID from localStorage
      const purchaseSessionId = localStorage.getItem(`purchaseSession_${eventId}`);
      
      // Create order with correct backend structure
      const orderData: any = {
        eventId: eventId!,
        items: selectedTickets.map(ticket => ({
          ticketTypeId: ticket.ticketTypeId,
          quantity: ticket.quantity
        })),
        customerName: `${user?.firstName} ${user?.lastName}`,
        customerEmail: user?.email,
        customerPhone: '',
        paymentMethod: 'card',
        paymentDetails: {
          cardType: 'visa',
          last4: '1234'
        }
      };
      
      // Only include purchaseSessionId if it's a valid UUID (not our dummy one)
      if (purchaseSessionId && purchaseSessionId.startsWith('session_')) {
        // This is our dummy session ID, don't include it
        console.log('Skipping dummy purchase session ID for development');
      } else if (purchaseSessionId) {
        // This is a real purchase session ID
        orderData.purchaseSessionId = purchaseSessionId;
      }

      console.log('Creating order with data:', orderData);
      console.log('User data:', user);
      console.log('User ID:', user?.id);
      console.log('Is authenticated:', isAuthenticated);
      console.log('About to call createOrder...');
      await createOrder(orderData);
      console.log('Order created successfully!');
      
      // Redirect to order confirmation page
      navigate(`/order-confirmation/${eventId}`);
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewTickets = () => {
    navigate('/user/tickets');
  };

  if (!currentEvent) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      {/* Timer Header */}
      {timerStarted && (
        <div className="bg-red-600 text-white py-2 text-center">
          <div className="max-w-7xl mx-auto px-4">
            <p className="font-semibold">
              ⏰ Time remaining: {formatTime(timeLeft)} - Complete your purchase before time runs out!
            </p>
          </div>
        </div>
      )}
      
      {!timerStarted && step === 1 && (
        <div className="bg-blue-600 text-white py-2 text-center">
          <div className="max-w-7xl mx-auto px-4">
            <p className="font-semibold">
              🎫 Select your tickets - 8-minute timer will start when you proceed to payment
            </p>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Event Header */}
        <div className="text-center mb-8">
          <img 
            src={currentEvent.imageUrl || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1000&q=80'} 
            alt={currentEvent.title || currentEvent.name} 
            className="w-full h-48 object-cover rounded-lg shadow-2xl mx-auto max-w-md"
          />
          <h1 className="text-3xl font-extrabold text-white mt-6">
            {currentEvent.title || currentEvent.name}
          </h1>
          <p className="text-gray-400 mt-2">
            {new Date(currentEvent.startDate || currentEvent.date || new Date()).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        {/* Step 1: Ticket Selection */}
        {step === 1 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Select Your Tickets</h2>
            
            <div className="space-y-4">
              {currentEvent.ticketTypes?.map((ticketType) => (
                <div key={ticketType.id} className="border border-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{ticketType.name}</h3>
                      <p className="text-gray-400 text-sm">{ticketType.description}</p>
                      <p className="text-indigo-400 font-bold text-lg">
                        {currentEvent.currency || 'PKR'} {ticketType.price}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          if (ticketType.id) {
                            const current = selectedTickets.find(t => t.ticketTypeId === ticketType.id)?.quantity || 0;
                            if (current > 0) {
                              handleTicketQuantityChange(ticketType.id, current - 1);
                            }
                          }
                        }}
                        className="w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center hover:bg-gray-600"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-white">
                        {selectedTickets.find(t => t.ticketTypeId === ticketType.id)?.quantity || 0}
                      </span>
                      <button
                        onClick={() => {
                          if (ticketType.id) {
                            const current = selectedTickets.find(t => t.ticketTypeId === ticketType.id)?.quantity || 0;
                            const maxPerUser = ticketType.maxPerUser || 10;
                            if (current < maxPerUser) {
                              handleTicketQuantityChange(ticketType.id, current + 1);
                            }
                          }
                        }}
                        className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedTickets.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-white">Total: {currentEvent.currency || 'PKR'} {getTotalPrice()}</span>
                  <button
                    onClick={handleProceedToPayment}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300"
                  >
                    Proceed to Payment
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Payment */}
        {step === 2 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Payment Information</h2>
            
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Order Summary</h3>
                {selectedTickets.map((ticket) => (
                  <div key={ticket.ticketTypeId} className="flex justify-between items-center py-2">
                    <span className="text-gray-300">
                      {ticket.quantity}x {ticket.name}
                    </span>
                    <span className="text-white font-semibold">
                      {currentEvent.currency || 'PKR'} {ticket.price * ticket.quantity}
                    </span>
                  </div>
                ))}
                <div className="border-t border-gray-600 pt-2 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-white">Total</span>
                    <span className="text-lg font-bold text-indigo-400">
                      {currentEvent.currency || 'PKR'} {getTotalPrice()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dummy Payment Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Card Number</label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Expiry Date</label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">CVV</label>
                    <input
                      type="text"
                      placeholder="123"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-6">
                <button
                  onClick={() => setStep(1)}
                  className="text-gray-400 hover:text-white transition-colors duration-300"
                >
                  ← Back to tickets
                </button>
                <button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-300"
                >
                  {isProcessing ? (
                    <div className="flex items-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    `Pay ${currentEvent.currency || 'PKR'} ${getTotalPrice()}`
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default CheckoutPage;
