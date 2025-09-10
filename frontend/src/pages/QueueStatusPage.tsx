import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEvents } from '../contexts/EventContext';
import { useAuth } from '../contexts/AuthContext';
import { useQueue } from '../contexts/QueueContext';
import LoadingSpinner from '../components/ui/loading-spinner';

const QueueStatusPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { currentEvent, fetchEvent } = useEvents();
  const { user, isAuthenticated } = useAuth();
  const { currentPosition, estimatedWaitTime, leaveQueue, isLoading, fetchQueueStatus } = useQueue();
  
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (eventId) {
      fetchEvent(eventId);
      fetchQueueStatus(eventId);
      
      // Set up periodic queue status updates (every 10 seconds)
      const interval = setInterval(() => {
        fetchQueueStatus(eventId);
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [eventId, fetchEvent, fetchQueueStatus, isAuthenticated, navigate]);

  useEffect(() => {
    // Calculate progress based on current position
    console.log('QueueStatusPage: currentPosition =', currentPosition, 'type:', typeof currentPosition);
    const totalQueueSize = 15000; // This would come from backend
    const position = currentPosition || 1;
    
    if (position === 1) {
      setProgress(100); // At the front of the queue
    } else {
      const progress = ((totalQueueSize - position) / totalQueueSize) * 100;
      setProgress(Math.max(0, Math.min(100, progress)));
    }

    // Simulate queue progress updates (only if not at position 1)
    if (position > 1) {
      const interval = setInterval(() => {
        // Simulate moving up in queue
        const newPosition = Math.max(1, position - Math.floor(Math.random() * 3));
        const newProgress = ((totalQueueSize - newPosition) / totalQueueSize) * 100;
        setProgress(Math.min(100, newProgress));
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [currentPosition, eventId, navigate]);

  const handleLeaveQueue = async () => {
    if (eventId) {
      try {
        await leaveQueue(eventId);
        navigate('/');
      } catch (error) {
        console.error('Failed to leave queue:', error);
      }
    }
  };

  const formatWaitTime = (minutes: number) => {
    if (minutes < 1) return 'Less than 1 minute';
    if (minutes < 60) return `~${Math.round(minutes)} minutes`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `~${hours}h ${remainingMinutes}m`;
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
      {/* Main Content Area */}
      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-3xl text-center">
          {/* Event Header */}
          <div className="mb-8">
            <img 
              src={currentEvent.imageUrl || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1000&q=80'} 
              alt={currentEvent.title || currentEvent.name} 
              className="w-full h-48 object-cover rounded-lg shadow-2xl"
            />
            <h1 className="text-4xl font-extrabold text-white mt-6">
              You're in the queue for {currentEvent.title || currentEvent.name}!
            </h1>
            <p className="mt-2 text-lg text-gray-400">
              Your spot is saved. We're moving things along as fast as we can.
            </p>
          </div>

          {/* Processing State */}
          {isProcessing ? (
            <div className="bg-gray-800 rounded-lg p-8 shadow-lg">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <LoadingSpinner size="lg" />
                <span className="text-xl font-semibold text-white">Processing your turn...</span>
              </div>
              <p className="text-gray-400">You'll be redirected to checkout shortly!</p>
            </div>
          ) : (
            <>
              {/* Progress Section */}
              <div className="bg-gray-800 rounded-lg p-8 shadow-lg">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-indigo-400 font-semibold">
                    Your Spot: #{currentPosition || 1} of 15,000
                  </span>
                  <span className="text-gray-400 text-sm">
                    Est. time to purchase: {formatWaitTime(estimatedWaitTime || 8)}
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-gray-700 rounded-full h-4">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-4 rounded-full transition-all duration-1500 ease-in-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Your status updates automatically. No need to refresh!
                </p>
                <p className="text-xs text-blue-400 mt-2">
                  💡 Once you reach position #1, you'll have 8 minutes to complete your purchase
                </p>
              </div>

              {/* While You Wait Section */}
              <div className="mt-10">
                <h2 className="text-xl font-bold text-white mb-4">While you wait...</h2>
                <div className="bg-gray-800 rounded-lg p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center">
                    <img 
                      src="https://placehold.co/100x100/1DB954/ffffff?text=S" 
                      alt="Spotify Logo" 
                      className="w-16 h-16 rounded-md"
                    />
                    <div className="ml-4 text-left">
                      <p className="font-bold text-white">Get in the mood</p>
                      <p className="text-gray-400">
                        Listen to the official {currentEvent.title || currentEvent.name} playlist on Spotify.
                      </p>
                    </div>
                  </div>
                  <a 
                    href="#" 
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 w-full md:w-auto"
                  >
                    Listen Now
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 space-y-4">
                {/* Buy Now Button - Show when at position 1 */}
                {(() => {
                  console.log('Button condition check: currentPosition =', currentPosition, 'type:', typeof currentPosition, 'condition =', (currentPosition === 1 || currentPosition === null));
                  return (currentPosition === 1 || currentPosition === null);
                })() && (
                  <div className="mb-4">
                    <button 
                      onClick={async () => {
                        try {
                          // Check if user has an active purchase session from the queue system
                          const response = await fetch(`http://localhost:3001/api/queue/events/${eventId}/status`, {
                            method: 'GET',
                            headers: {
                              'Authorization': `Bearer ${localStorage.getItem('token')}`,
                              'Content-Type': 'application/json'
                            }
                          });
                          
                          if (response.ok) {
                            const data = await response.json();
                            const queueEntry = data.queueEntry;
                            
                            if (queueEntry && queueEntry.status === 'active') {
                              // User has an active purchase session from the queue system
                              console.log('User has active purchase session from queue system');
                              navigate(`/checkout/${eventId}`);
                            } else {
                              // For development: create a dummy session if no real one exists
                              console.log('No active purchase session, creating dummy for development');
                              const dummyPurchaseSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                              localStorage.setItem(`purchaseSession_${eventId}`, dummyPurchaseSessionId);
                              navigate(`/checkout/${eventId}`);
                            }
                          } else {
                            // Fallback for development
                            console.log('Queue status check failed, using dummy session for development');
                            const dummyPurchaseSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                            localStorage.setItem(`purchaseSession_${eventId}`, dummyPurchaseSessionId);
                            navigate(`/checkout/${eventId}`);
                          }
                        } catch (error) {
                          console.error('Error checking queue status:', error);
                          // Fallback for development
                          const dummyPurchaseSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                          localStorage.setItem(`purchaseSession_${eventId}`, dummyPurchaseSessionId);
                          navigate(`/checkout/${eventId}`);
                        }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-300 text-lg"
                    >
                      🎫 Buy Tickets Now
                    </button>
                    <p className="text-sm text-green-400 mt-2">
                      You're at the front of the queue! Click to proceed to checkout.
                    </p>
                  </div>
                )}
                
                {/* Leave Queue Button */}
                <button 
                  onClick={handleLeaveQueue}
                  className="text-gray-500 hover:text-red-400 text-sm transition-colors duration-300"
                >
                  Leave the Queue
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default QueueStatusPage;
