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
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [userTicketAllowance, setUserTicketAllowance] = useState<{[key: string]: number}>({});
  const [isLoadingAllowance, setIsLoadingAllowance] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (eventId) {
      fetchEvent(eventId);
      fetchUserTicketAllowance(); // Fetch user's ticket allowance
      
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
    const ticketType = currentEvent?.ticketTypes?.find(t => t.id === ticketTypeId);
    const maxPerUser = ticketType?.maxPerUser || 10;
    const remainingAllowance = userTicketAllowance[ticketTypeId] || maxPerUser;
    
    // Clear any previous limit message
    setLimitMessage(null);
    
    // Check if user has already reached their limit
    if (remainingAllowance === 0) {
      setLimitMessage(`You have already reached the maximum limit of ${maxPerUser} tickets for ${ticketType?.name || 'this ticket type'}. You cannot purchase more tickets.`);
      // Auto-clear message after 5 seconds
      setTimeout(() => setLimitMessage(null), 5000);
      return; // Don't update the quantity
    }
    
    // Check if quantity exceeds the remaining allowance
    if (quantity > remainingAllowance) {
      setLimitMessage(`You can only purchase ${remainingAllowance} more ticket${remainingAllowance === 1 ? '' : 's'} for ${ticketType?.name || 'this ticket type'}. You have already purchased ${maxPerUser - remainingAllowance} ticket${(maxPerUser - remainingAllowance) === 1 ? '' : 's'}.`);
      // Auto-clear message after 4 seconds
      setTimeout(() => setLimitMessage(null), 4000);
      return; // Don't update the quantity
    }
    
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

  const fetchUserTicketAllowance = async () => {
    if (!eventId || !isAuthenticated) return;
    
    setIsLoadingAllowance(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${eventId}/user-allowance`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const allowanceMap: {[key: string]: number} = {};
        data.ticketAllowance?.forEach((allowance: any) => {
          allowanceMap[allowance.id] = allowance.remainingAllowance;
        });
        setUserTicketAllowance(allowanceMap);
      }
    } catch (error) {
      console.error('Failed to fetch ticket allowance:', error);
    } finally {
      setIsLoadingAllowance(false);
    }
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
      
      // Include purchaseSessionId for both dummy and real sessions
      if (purchaseSessionId) {
        orderData.purchaseSessionId = purchaseSessionId;
        if (purchaseSessionId.startsWith('session_')) {
          console.log('Including dummy purchase session ID for development');
        } else {
          console.log('Including real purchase session ID');
        }
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
            
            {/* Overall limit reached message */}
            {Object.values(userTicketAllowance).every(allowance => allowance === 0) && (
              <div className="mb-6 p-4 bg-red-900 border border-red-600 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-red-200 font-semibold">Purchase Limit Reached</p>
                    <p className="text-red-300 text-sm">You have already reached the maximum ticket purchase limit for this event. You cannot purchase more tickets.</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Loading indicator */}
            {isLoadingAllowance && (
              <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-400 mr-2"></div>
                  <p className="text-gray-300 text-sm">Checking your ticket allowance...</p>
                </div>
              </div>
            )}
            
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
                      <p className="text-gray-500 text-xs mt-1">
                        {ticketType.id && userTicketAllowance[ticketType.id] !== undefined 
                          ? `${userTicketAllowance[ticketType.id]} remaining (${(ticketType.maxPerUser || 10) - userTicketAllowance[ticketType.id]} already purchased)`
                          : `Maximum ${ticketType.maxPerUser || 10} tickets per user`
                        }
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
                            handleTicketQuantityChange(ticketType.id, current + 1);
                          }
                        }}
                        disabled={!ticketType.id || userTicketAllowance[ticketType.id] === 0 || (selectedTickets.find(t => t.ticketTypeId === ticketType.id)?.quantity || 0) >= (userTicketAllowance[ticketType.id] || ticketType.maxPerUser || 10)}
                        className={`w-8 h-8 rounded-full text-white flex items-center justify-center ${
                          !ticketType.id || userTicketAllowance[ticketType.id] === 0 || (selectedTickets.find(t => t.ticketTypeId === ticketType.id)?.quantity || 0) >= (userTicketAllowance[ticketType.id] || ticketType.maxPerUser || 10)
                            ? 'bg-gray-600 cursor-not-allowed opacity-50'
                            : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Limit Message */}
            {limitMessage && (
              <div className="mt-4 p-4 bg-yellow-900 border border-yellow-600 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-yellow-200 text-sm">{limitMessage}</p>
                </div>
              </div>
            )}

            {selectedTickets.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-white">Total: {currentEvent.currency || 'PKR'} {getTotalPrice()}</span>
                  <button
                    onClick={handleProceedToPayment}
                    disabled={Object.values(userTicketAllowance).every(allowance => allowance === 0)}
                    className={`font-bold py-3 px-6 rounded-lg transition-colors duration-300 ${
                      Object.values(userTicketAllowance).every(allowance => allowance === 0)
                        ? 'bg-gray-600 cursor-not-allowed opacity-50 text-gray-400'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
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
