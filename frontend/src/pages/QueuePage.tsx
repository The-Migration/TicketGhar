import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Clock, 
  Timer, 
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Calendar,
  MapPin,
  Ticket,
  Loader2
} from 'lucide-react';
import { ColorfulCard } from '../components/ui/colorful-card';
import RainbowButton from '../components/ui/rainbow-button';
import NeonText from '../components/ui/neon-text';
import LoadingSpinner from '../components/ui/loading-spinner';

interface QueuePosition {
  id: string;
  userId: string;
  eventId: string;
  position: number;
  status: 'waiting' | 'active' | 'completed' | 'expired' | 'cancelled';
  joinedAt: string;
  startedAt?: string;
  expiresAt?: string;
  estimatedWaitTime: number; // in minutes
  sessionId?: string;
}

interface Event {
  id: string;
  name: string; // API uses 'name' not 'title'
  title?: string; // Keep for backward compatibility
  description: string;
  startDate: string; // API uses 'startDate' not 'date'
  date?: string; // Keep for backward compatibility
  endDate: string;
  venue: string;
  address: string;
  imageUrl?: string;
  maxConcurrentUsers: number;
  sessionDuration: number;
  queueEnabled: boolean;
}

const QueuePage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [queuePosition, setQueuePosition] = useState<QueuePosition | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoiningQueue, setIsJoiningQueue] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [estimatedWaitTime, setEstimatedWaitTime] = useState<string>('');

  // Mock data - in real app, this would come from API
  useEffect(() => {
    const mockEvent: Event = {
      id: eventId || '1',
      name: 'Summer Music Festival 2024',
      title: 'Summer Music Festival 2024', // Keep for backward compatibility
      description: 'An amazing outdoor music festival featuring top artists from around the world.',
      startDate: '2024-07-15T18:00:00.000Z',
      date: '2024-07-15T18:00:00.000Z', // Keep for backward compatibility
      endDate: '2024-07-17T23:00:00.000Z',
      venue: 'Central Park',
      address: 'Central Park, New York, NY',
      imageUrl: 'https://example.com/festival.jpg',
      maxConcurrentUsers: 50,
      sessionDuration: 8,
      queueEnabled: true
    };

    const mockQueuePosition: QueuePosition = {
      id: '1',
      userId: '2',
      eventId: eventId || '1',
      position: 3,
      status: 'waiting',
      joinedAt: '2025-09-07T10:00:00.000Z',
      estimatedWaitTime: 12
    };

    setTimeout(() => {
      setEvent(mockEvent);
      setQueuePosition(mockQueuePosition);
      setIsLoading(false);
    }, 1500);
  }, [eventId]);

  // Update time remaining every second
  useEffect(() => {
    if (!queuePosition || queuePosition.status !== 'active') return;

    const interval = setInterval(() => {
      if (queuePosition.expiresAt) {
        const now = new Date();
        const expiry = new Date(queuePosition.expiresAt);
        const diff = expiry.getTime() - now.getTime();
        
        if (diff <= 0) {
          setTimeRemaining('Session Expired');
          clearInterval(interval);
          return;
        }
        
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [queuePosition]);

  // Update estimated wait time
  useEffect(() => {
    if (!queuePosition || queuePosition.status !== 'waiting') return;

    const interval = setInterval(() => {
      const estimatedMinutes = Math.max(0, queuePosition.estimatedWaitTime - 1);
      setEstimatedWaitTime(`${estimatedMinutes} minutes`);
      setQueuePosition(prev => prev ? { ...prev, estimatedWaitTime: estimatedMinutes } : null);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [queuePosition]);

  const handleJoinQueue = async () => {
    setIsJoiningQueue(true);
    try {
      // API call to join queue
      await new Promise(resolve => setTimeout(resolve, 2000)); // Mock API call
      // Update queue position
      setQueuePosition(prev => prev ? { ...prev, position: 1, status: 'waiting' } : null);
    } catch (error) {
      console.error('Failed to join queue:', error);
    } finally {
      setIsJoiningQueue(false);
    }
  };

  const handleLeaveQueue = async () => {
    try {
      // API call to leave queue
      navigate(`/events/${eventId}`);
    } catch (error) {
      console.error('Failed to leave queue:', error);
    }
  };

  const handleStartPurchase = () => {
    if (queuePosition?.sessionId) {
      navigate(`/purchase/${queuePosition.sessionId}`);
    }
  };

  const getStatusMessage = () => {
    if (!queuePosition) return '';
    
    switch (queuePosition.status) {
      case 'waiting':
        return `You are #${queuePosition.position} in line. Estimated wait time: ${estimatedWaitTime}`;
      case 'active':
        return 'Your turn! You can now purchase tickets.';
      case 'completed':
        return 'You have completed your purchase.';
      case 'expired':
        return 'Your session has expired. Please join the queue again.';
      case 'cancelled':
        return 'You have left the queue.';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    if (!queuePosition) return 'blue';
    
    switch (queuePosition.status) {
      case 'waiting': return 'orange';
      case 'active': return 'emerald';
      case 'completed': return 'purple';
      case 'expired': return 'red';
      case 'cancelled': return 'gray';
      default: return 'blue';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-vibrant-purple-50 via-vibrant-blue-50 to-vibrant-pink-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 text-lg">Loading queue information...</p>
        </div>
      </div>
    );
  }

  if (!event || !queuePosition) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-vibrant-purple-50 via-vibrant-blue-50 to-vibrant-pink-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Queue information not found</p>
          <button
            onClick={() => navigate(`/events/${eventId}`)}
            className="mt-4 text-vibrant-purple-600 hover:text-vibrant-purple-800"
          >
            Back to Event
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-vibrant-purple-50 via-vibrant-blue-50 to-vibrant-pink-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <NeonText 
            className="text-4xl font-bold mb-2" 
            color="purple" 
          >
            Ticket Purchase Queue
          </NeonText>
          <p className="text-gray-600 text-lg">
            {event.title || event.name}
          </p>
        </div>

        {/* Event Info */}
        <ColorfulCard className="p-6 mb-8" colorScheme="blue" variant="glass">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {event.imageUrl && (
              <img 
                src={event.imageUrl} 
                alt={event.title || event.name}
                className="w-32 h-32 object-cover rounded-lg"
              />
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{event.title || event.name}</h2>
              <p className="text-gray-600 mb-4">{event.description}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-vibrant-blue-600" />
                  <span>{new Date(event.date || event.startDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-vibrant-blue-600" />
                  <span>{event.venue}</span>
                </div>
                <div className="flex items-center">
                  <Ticket className="w-4 h-4 mr-2 text-vibrant-blue-600" />
                  <span>{event.maxConcurrentUsers} concurrent users</span>
                </div>
              </div>
            </div>
          </div>
        </ColorfulCard>

        {/* Queue Status */}
        <ColorfulCard className="p-8 mb-8" colorScheme={getStatusColor() as any} variant="glass">
          <div className="text-center">
            <div className="mb-6">
              {queuePosition.status === 'waiting' && (
                <div className="w-24 h-24 bg-vibrant-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-12 h-12 text-vibrant-orange-600" />
                </div>
              )}
              {queuePosition.status === 'active' && (
                <div className="w-24 h-24 bg-vibrant-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-12 h-12 text-vibrant-emerald-600" />
                </div>
              )}
              {queuePosition.status === 'completed' && (
                <div className="w-24 h-24 bg-vibrant-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-12 h-12 text-vibrant-purple-600" />
                </div>
              )}
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {queuePosition.status === 'waiting' && `Position #${queuePosition.position}`}
              {queuePosition.status === 'active' && 'Your Turn!'}
              {queuePosition.status === 'completed' && 'Purchase Complete!'}
              {queuePosition.status === 'expired' && 'Session Expired'}
            </h3>

            <p className="text-lg text-gray-600 mb-6">
              {getStatusMessage()}
            </p>

            {queuePosition.status === 'waiting' && (
              <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center space-x-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{queuePosition.position}</div>
                    <div className="text-sm text-gray-600">Position in Queue</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{estimatedWaitTime}</div>
                    <div className="text-sm text-gray-600">Estimated Wait</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{event.sessionDuration}m</div>
                    <div className="text-sm text-gray-600">Session Time</div>
                  </div>
                </div>
              </div>
            )}

            {queuePosition.status === 'active' && timeRemaining && (
              <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center space-x-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{timeRemaining}</div>
                    <div className="text-sm text-gray-600">Time Remaining</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{event.sessionDuration}m</div>
                    <div className="text-sm text-gray-600">Total Session</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {queuePosition.status === 'waiting' && (
                <>
                  <RainbowButton 
                    variant="aurora" 
                    size="lg"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Refresh Status
                  </RainbowButton>
                  <RainbowButton 
                    variant="sunset" 
                    size="lg"
                    onClick={handleLeaveQueue}
                  >
                    Leave Queue
                  </RainbowButton>
                </>
              )}

              {queuePosition.status === 'active' && (
                <RainbowButton 
                  variant="rainbow" 
                  size="lg"
                  onClick={handleStartPurchase}
                  animated
                >
                  <Ticket className="w-5 h-5 mr-2" />
                  Start Purchase
                </RainbowButton>
              )}

              {queuePosition.status === 'completed' && (
                <RainbowButton 
                  variant="rainbow" 
                  size="lg"
                  onClick={() => navigate('/user/dashboard')}
                >
                  View My Tickets
                </RainbowButton>
              )}

              {queuePosition.status === 'expired' && (
                <RainbowButton 
                  variant="rainbow" 
                  size="lg"
                  onClick={handleJoinQueue}
                  disabled={isJoiningQueue}
                >
                  {isJoiningQueue ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    'Join Queue Again'
                  )}
                </RainbowButton>
              )}
            </div>
          </div>
        </ColorfulCard>

        {/* Queue Information */}
        <ColorfulCard className="p-6" colorScheme="cyan" variant="glass">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">How the Queue Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Queue System</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Only {event.maxConcurrentUsers} users can purchase tickets simultaneously</li>
                <li>• Each user gets {event.sessionDuration} minutes to complete their purchase</li>
                <li>• Your position in the queue is based on when you joined</li>
                <li>• You'll be notified when it's your turn</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Tips for Success</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Keep this page open while waiting</li>
                <li>• Have your payment method ready</li>
                <li>• Know which tickets you want to buy</li>
                <li>• Don't refresh the page unnecessarily</li>
              </ul>
            </div>
          </div>
        </ColorfulCard>
      </div>
    </div>
  );
};

export default QueuePage;