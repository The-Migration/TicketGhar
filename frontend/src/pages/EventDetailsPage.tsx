import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEvents } from '../contexts/EventContext';
import { useAuth } from '../contexts/AuthContext';
import { useQueue } from '../contexts/QueueContext';
import { formatEventDate, formatEventTime, getTimeUntilEvent } from '../utils/timezone';

const EventDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentEvent, fetchEvent, isLoading } = useEvents();
  const { isAuthenticated } = useAuth();
  const { currentPosition, estimatedWaitTime, joinQueue, leaveQueue, isLoading: queueLoading } = useQueue();
  const [selectedTickets, setSelectedTickets] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    if (id) {
      fetchEvent(id);
    }
  }, [id, fetchEvent]);

  const handleJoinQueue = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (id) {
      try {
        await joinQueue(id);
      } catch (error) {
        console.error('Failed to join queue:', error);
      }
    }
  };

  const handleLeaveQueue = async () => {
    if (id) {
      try {
        await leaveQueue(id);
      } catch (error) {
        console.error('Failed to leave queue:', error);
      }
    }
  };

  const handleTicketQuantityChange = (ticketTypeId: string, quantity: number) => {
    setSelectedTickets(prev => ({
      ...prev,
      [ticketTypeId]: quantity
    }));
  };

  const totalTickets = Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
  const totalPrice = currentEvent ? Object.entries(selectedTickets).reduce((sum, [ticketTypeId, quantity]) => {
    const ticketType = currentEvent.ticketTypes?.find((tt: any) => tt.id === ticketTypeId);
    return sum + (ticketType ? ticketType.price * quantity : 0);
  }, 0) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Event not found</h1>
          <Link to="/events" className="text-blue-600 hover:text-blue-800">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li><Link to="/" className="hover:text-gray-700">Home</Link></li>
            <li>/</li>
            <li><Link to="/events" className="hover:text-gray-700">Events</Link></li>
            <li>/</li>
            <li className="text-gray-900">{currentEvent.title}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {currentEvent.imageUrl && (
                <img
                  src={currentEvent.imageUrl}
                  alt={currentEvent.title}
                  className="w-full h-64 object-cover"
                />
              )}
              
              <div className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                    {currentEvent.category}
                  </span>
                  <span className="text-sm text-gray-500">
                    {currentEvent.availableTickets} tickets available
                  </span>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {currentEvent.title}
                </h1>

                <p className="text-gray-600 mb-6 leading-relaxed">
                  {currentEvent.description}
                </p>

                {/* Event Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="flex items-start">
                    <svg className="w-6 h-6 text-gray-400 mr-3 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <h3 className="font-semibold text-gray-900">Date & Time</h3>
                      <p className="text-gray-600">{formatEventDate(currentEvent.date || currentEvent.startDate, currentEvent.timezone)}</p>
                      <p className="text-gray-600">{formatEventTime(currentEvent.date || currentEvent.startDate, currentEvent.timezone)}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <svg className="w-6 h-6 text-gray-400 mr-3 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <h3 className="font-semibold text-gray-900">Location</h3>
                      <p className="text-gray-600">{currentEvent.location}</p>
                      <p className="text-gray-600">{currentEvent.venue}</p>
                    </div>
                  </div>
                </div>

                {/* Time Until Event */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-blue-800 font-medium">
                      {getTimeUntilEvent(currentEvent.date || currentEvent.startDate)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ticket Selection & Queue */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Get Tickets</h2>

              {/* Queue Status */}
              {currentPosition !== null ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="text-center">
                    <h3 className="font-semibold text-yellow-800 mb-2">You're in the queue!</h3>
                    <p className="text-yellow-700 mb-2">Position: #{currentPosition}</p>
                    {estimatedWaitTime && (
                      <p className="text-yellow-700 mb-4">
                        Estimated wait: {Math.ceil(estimatedWaitTime / 60)} minutes
                      </p>
                    )}
                    <button
                      onClick={handleLeaveQueue}
                      disabled={queueLoading}
                      className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                    >
                      Leave Queue
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <button
                    onClick={handleJoinQueue}
                    disabled={queueLoading || currentEvent.availableTickets === 0}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {queueLoading ? 'Joining...' : 'Join Queue'}
                  </button>
                  {currentEvent.availableTickets === 0 && (
                    <p className="text-red-600 text-sm mt-2 text-center">
                      This event is sold out
                    </p>
                  )}
                </div>
              )}

              {/* Ticket Types */}
              {currentEvent.ticketTypes && currentEvent.ticketTypes.length > 0 && (
                <div className="space-y-4 mb-6">
                  <h3 className="font-semibold text-gray-900">Select Tickets</h3>
                  {currentEvent.ticketTypes.map((ticketType: any) => (
                    <div key={ticketType.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">{ticketType.name}</h4>
                          <p className="text-sm text-gray-600">{ticketType.description}</p>
                        </div>
                        <span className="text-lg font-bold text-blue-600">
                          ${ticketType.price}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          {ticketType.available} available
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleTicketQuantityChange(ticketType.id, Math.max(0, (selectedTickets[ticketType.id] || 0) - 1))}
                            disabled={!selectedTickets[ticketType.id] || selectedTickets[ticketType.id] <= 0}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                          >
                            -
                          </button>
                          <span className="w-8 text-center">
                            {selectedTickets[ticketType.id] || 0}
                          </span>
                          <button
                            onClick={() => handleTicketQuantityChange(ticketType.id, (selectedTickets[ticketType.id] || 0) + 1)}
                            disabled={!selectedTickets[ticketType.id] || selectedTickets[ticketType.id] >= ticketType.available}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Order Summary */}
              {totalTickets > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Tickets ({totalTickets})</span>
                    <span className="font-semibold">${totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600">Service Fee</span>
                    <span className="font-semibold">$0.00</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold border-t border-gray-200 pt-2">
                    <span>Total</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                  
                  <button
                    onClick={() => navigate('/checkout')}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 mt-4"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailsPage;
