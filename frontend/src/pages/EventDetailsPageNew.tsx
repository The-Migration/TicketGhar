import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEvents } from '../contexts/EventContext';
import { useAuth } from '../contexts/AuthContext';
import { useQueue } from '../contexts/QueueContext';
import { formatEventDate, formatEventTime, getTimeUntilEvent } from '../utils/timezone';
import RainbowButton from '../components/ui/rainbow-button';
import { ColorfulCard } from '../components/ui/colorful-card';
import NeonText from '../components/ui/neon-text';
import LoadingSpinner from '../components/ui/loading-spinner';

const EventDetailsPageNew: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentEvent, fetchEvent, isLoading } = useEvents();
  const { user, isAuthenticated } = useAuth();
  const { currentPosition, estimatedWaitTime, joinQueue, leaveQueue, isLoading: queueLoading } = useQueue();
  const [showQueueModal, setShowQueueModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEvent(id);
    }
  }, [id, fetchEvent]);

  const handleGetTickets = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (id) {
      try {
        setShowQueueModal(true);
        await joinQueue(id);
        
        // Redirect to queue status page after a short delay
        setTimeout(() => {
          navigate(`/queue/${id}`);
        }, 2000);
      } catch (error) {
        console.error('Failed to join queue:', error);
        setShowQueueModal(false);
      }
    }
  };

  const getEventStatus = () => {
    if (!currentEvent) return 'inactive';
    
    const now = new Date();
    const saleStart = new Date((currentEvent as any).ticketSaleStartTime || currentEvent.startDate || currentEvent.date);
    const saleEnd = new Date((currentEvent as any).ticketSaleEndTime || currentEvent.endDate || currentEvent.date);
    
    if (now < saleStart) return 'upcoming';
    if (now >= saleStart && now <= saleEnd) return 'active';
    return 'ended';
  };

  const getStatusMessage = () => {
    const status = getEventStatus();
    switch (status) {
      case 'upcoming':
        return { text: 'Sale starts soon!', color: 'text-yellow-400', bg: 'bg-yellow-900/50' };
      case 'active':
        return { text: '✅ Sale is active now! Tickets are selling fast.', color: 'text-green-400', bg: 'bg-green-900/50' };
      case 'ended':
        return { text: '❌ Sale has ended', color: 'text-red-400', bg: 'bg-red-900/50' };
      default:
        return { text: 'Sale inactive', color: 'text-gray-400', bg: 'bg-gray-900/50' };
    }
  };

  const getMinPrice = () => {
    if (!currentEvent?.ticketTypes || currentEvent.ticketTypes.length === 0) {
      return currentEvent?.ticketPrice || '0';
    }
    
    const prices = currentEvent.ticketTypes.map((tt: any) => parseFloat(tt.price || '0'));
    return Math.min(...prices).toString();
  };

  const formatRefundDeadline = () => {
    if (!currentEvent?.refundDeadline) return null;
    
    const deadline = new Date(currentEvent.refundDeadline);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      date: deadline.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      daysRemaining: diffDays > 0 ? diffDays : 0
    };
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
          <h1 className="text-2xl font-bold text-white mb-4">Event not found</h1>
          <Link to="/events" className="text-indigo-400 hover:text-indigo-300">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusMessage();
  const refundInfo = formatRefundDeadline();

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      {/* Main Content Area */}
      <main className="pb-28 lg:pb-0">
        {/* Immersive Hero Section */}
        <section 
          className="relative h-[50vh] bg-cover bg-center"
          style={{
            backgroundImage: currentEvent.imageUrl 
              ? `url(${currentEvent.imageUrl})` 
              : `url('https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1740&q=80')`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-black/40"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-end pb-12">
            <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight">
              {currentEvent.name || currentEvent.title}
            </h1>
            <div className="mt-4 flex flex-col md:flex-row md:items-center gap-x-6 gap-y-2 text-gray-300">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>
                  {formatEventDate(currentEvent.startDate || currentEvent.date || new Date(), currentEvent.timezone)} at {formatEventTime(currentEvent.startDate || currentEvent.date || new Date(), currentEvent.timezone)}
                </span>
              </div>
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{currentEvent.venue}, {currentEvent.address}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="lg:grid lg:grid-cols-3 lg:gap-12">
            {/* Left Column: Event Description & Details */}
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white">About the Event</h2>
                <p className="mt-4 text-gray-400 leading-relaxed">
                  {currentEvent.description}
                </p>
              </div>

              {currentEvent.ticketTypes && currentEvent.ticketTypes.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-white">Ticket Types</h2>
                  <div className="mt-4 space-y-3">
                    {currentEvent.ticketTypes.map((ticketType: any, index: number) => (
                      <div key={ticketType.id || index} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-white">{ticketType.name}</h3>
                            <p className="text-sm text-gray-400">{ticketType.description}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              {ticketType.available || ticketType.quantityTotal} available
                            </p>
                          </div>
                          <span className="text-lg font-bold text-indigo-400">
                            {currentEvent.currency || 'PKR'} {ticketType.price}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {refundInfo && (
                <div>
                  <h2 className="text-2xl font-bold text-white">Refund Policy</h2>
                  <div className="mt-4 bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <p className="text-gray-400 leading-relaxed">
                      {(currentEvent as any).refundPolicy || "You can request a full refund for your tickets up until the deadline listed below. After this date, all ticket sales are final. Please note, if the event is cancelled by the organizer, all tickets will be refunded automatically."}
                    </p>
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <p className="font-semibold text-white">
                        Refund Deadline: <span className="font-normal text-amber-400">
                          {refundInfo.date} ({refundInfo.daysRemaining} days remaining)
                        </span>
                      </p>
                      <p className="mt-2 text-sm text-gray-500">
                        For refund requests, contact <a href="mailto:support@ticketghar.com" className="text-indigo-400 hover:underline">support@ticketghar.com</a> or call <a href="tel:+923001234567" className="text-indigo-400 hover:underline">+92 300 1234567</a>.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Sticky Ticket Widget (DESKTOP ONLY) */}
            <div className="hidden lg:block lg:col-span-1 mt-12 lg:mt-0">
              <div className="sticky top-24 bg-gray-800 rounded-lg p-6 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white">Get Your Tickets</h3>
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    High Demand
                  </span>
                </div>

                <div className="border-t border-b border-gray-700 py-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-gray-400 text-lg">Price</span>
                    <span className="font-extrabold text-2xl text-white">
                      Starting from <span className="text-indigo-400">
                        {currentEvent.currency || 'PKR'} {getMinPrice()}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <p className={`text-xs text-center font-semibold p-2 rounded ${statusInfo.bg} ${statusInfo.color}`}>
                    {statusInfo.text}
                  </p>
                </div>

                <RainbowButton
                  onClick={handleGetTickets}
                  disabled={getEventStatus() !== 'active' || currentEvent.availableTickets === 0}
                  className="mt-6 w-full py-4 text-lg"
                  variant="rainbow"
                >
                  Get Tickets
                </RainbowButton>

                <p className="text-xs text-gray-500 mt-4 text-center">
                  You will be placed in a virtual queue to ensure a fair process.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Mobile Floating Action Bar (MOBILE ONLY) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-800/90 backdrop-blur-sm border-t border-gray-700 p-4 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <p className="text-gray-400 text-sm">Price starts from</p>
            <p className="font-bold text-xl text-white">
              {currentEvent.currency || 'PKR'} {getMinPrice()}
            </p>
          </div>
          <RainbowButton
            onClick={handleGetTickets}
            disabled={getEventStatus() !== 'active' || currentEvent.availableTickets === 0}
            className="py-3 px-6 text-md shadow-lg"
            variant="rainbow"
          >
            Get Tickets
          </RainbowButton>
        </div>
      </div>

      {/* Queue Modal */}
      {showQueueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-lg shadow-xl p-8 text-center max-w-sm mx-4">
            <img 
              src={currentEvent.imageUrl || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=300&q=80'}
              alt="Event Image" 
              className="w-24 h-24 rounded-full mx-auto -mt-20 border-4 border-gray-700 object-cover"
            />
            <h2 className="text-2xl font-bold text-white mt-4">You're in line!</h2>
            <p className="text-gray-400 mt-2">
              Great choice! We're saving your spot for <span className="font-bold text-white">
                {currentEvent.name || currentEvent.title}
              </span>.
            </p>
            <div className="mt-6 flex items-center justify-center space-x-3">
              <LoadingSpinner size="sm" />
              <span className="text-lg font-medium text-gray-300">Securing your spot...</span>
            </div>
            <p className="text-xs text-gray-500 mt-6">
              You will be redirected to the queue page automatically. Please don't close this window.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetailsPageNew;
