import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Timer
} from 'lucide-react';
import { ColorfulCard } from './ui/colorful-card';
import RainbowButton from './ui/rainbow-button';
import LoadingSpinner from './ui/loading-spinner';

interface QueueManagerProps {
  eventId: string;
  eventTitle: string;
  maxConcurrentUsers: number;
  sessionDuration: number;
  queueEnabled: boolean;
  onJoinQueue: () => void;
  onLeaveQueue: () => void;
  isInQueue: boolean;
  queuePosition?: number;
  queueStatus?: 'waiting' | 'active' | 'completed' | 'expired' | 'cancelled';
  estimatedWaitTime?: number;
  sessionTimeRemaining?: number;
}

const QueueManager: React.FC<QueueManagerProps> = ({
  eventId,
  eventTitle,
  maxConcurrentUsers,
  sessionDuration,
  queueEnabled,
  onJoinQueue,
  onLeaveQueue,
  isInQueue,
  queuePosition,
  queueStatus,
  estimatedWaitTime,
  sessionTimeRemaining
}) => {
  const [isJoining, setIsJoining] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Update time remaining every second
  useEffect(() => {
    if (!sessionTimeRemaining || queueStatus !== 'active') return;

    const interval = setInterval(() => {
      const minutes = Math.floor(sessionTimeRemaining / 60);
      const seconds = sessionTimeRemaining % 60;
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      
      if (sessionTimeRemaining <= 0) {
        clearInterval(interval);
        setTimeRemaining('Session Expired');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionTimeRemaining, queueStatus]);

  const handleJoinQueue = async () => {
    setIsJoining(true);
    try {
      await onJoinQueue();
    } finally {
      setIsJoining(false);
    }
  };

  const getStatusMessage = () => {
    if (!isInQueue) return '';
    
    switch (queueStatus) {
      case 'waiting':
        return `You are #${queuePosition} in line. Estimated wait: ${estimatedWaitTime} minutes`;
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
    if (!isInQueue) return 'blue';
    
    switch (queueStatus) {
      case 'waiting': return 'orange';
      case 'active': return 'emerald';
      case 'completed': return 'purple';
      case 'expired': return 'red';
      case 'cancelled': return 'gray';
      default: return 'blue';
    }
  };

  if (!queueEnabled) {
    return (
      <ColorfulCard className="p-6" colorScheme="blue" variant="glass">
        <div className="text-center">
          <CheckCircle className="w-12 h-12 text-vibrant-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Tickets Available</h3>
          <p className="text-gray-600 mb-4">
            No queue required. You can purchase tickets directly.
          </p>
          <RainbowButton variant="rainbow" size="lg">
            Buy Tickets Now
          </RainbowButton>
        </div>
      </ColorfulCard>
    );
  }

  if (!isInQueue) {
    return (
      <ColorfulCard className="p-6" colorScheme="orange" variant="glass">
        <div className="text-center">
          <Users className="w-12 h-12 text-vibrant-orange-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Join Purchase Queue</h3>
          <p className="text-gray-600 mb-4">
            Due to high demand, tickets are sold through a queue system. 
            Only {maxConcurrentUsers} users can purchase simultaneously.
          </p>
          <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{maxConcurrentUsers}</div>
                <div className="text-gray-600">Concurrent Users</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{sessionDuration}m</div>
                <div className="text-gray-600">Session Time</div>
              </div>
            </div>
          </div>
          <RainbowButton 
            variant="rainbow" 
            size="lg"
            onClick={handleJoinQueue}
            disabled={isJoining}
          >
            {isJoining ? (
              <LoadingSpinner size="sm" />
            ) : (
              'Join Queue'
            )}
          </RainbowButton>
        </div>
      </ColorfulCard>
    );
  }

  return (
    <ColorfulCard className="p-6" colorScheme={getStatusColor() as any} variant="glass">
      <div className="text-center">
        <div className="mb-4">
          {queueStatus === 'waiting' && (
            <div className="w-16 h-16 bg-vibrant-orange-100 rounded-full flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 text-vibrant-orange-600" />
            </div>
          )}
          {queueStatus === 'active' && (
            <div className="w-16 h-16 bg-vibrant-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-vibrant-emerald-600" />
            </div>
          )}
          {queueStatus === 'completed' && (
            <div className="w-16 h-16 bg-vibrant-purple-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-vibrant-purple-600" />
            </div>
          )}
          {queueStatus === 'expired' && (
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          )}
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {queueStatus === 'waiting' && `Position #${queuePosition}`}
          {queueStatus === 'active' && 'Your Turn!'}
          {queueStatus === 'completed' && 'Purchase Complete!'}
          {queueStatus === 'expired' && 'Session Expired'}
        </h3>

        <p className="text-gray-600 mb-4">
          {getStatusMessage()}
        </p>

        {queueStatus === 'waiting' && (
          <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 mb-4">
            <div className="flex items-center justify-center space-x-4">
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">{queuePosition}</div>
                <div className="text-xs text-gray-600">Position</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">{estimatedWaitTime}m</div>
                <div className="text-xs text-gray-600">Est. Wait</div>
              </div>
            </div>
          </div>
        )}

        {queueStatus === 'active' && timeRemaining && (
          <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 mb-4">
            <div className="flex items-center justify-center space-x-2">
              <Timer className="w-5 h-5 text-vibrant-emerald-600" />
              <span className="text-lg font-bold text-gray-900">{timeRemaining}</span>
              <span className="text-sm text-gray-600">remaining</span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          {queueStatus === 'waiting' && (
            <>
              <RainbowButton 
                variant="aurora" 
                size="sm"
                onClick={() => window.location.reload()}
              >
                Refresh
              </RainbowButton>
              <RainbowButton 
                variant="sunset" 
                size="sm"
                onClick={onLeaveQueue}
              >
                Leave Queue
              </RainbowButton>
            </>
          )}

          {queueStatus === 'active' && (
            <RainbowButton 
              variant="rainbow" 
              size="lg"
              onClick={() => window.location.href = `/purchase/session-${eventId}`}
              animated
            >
              Start Purchase
            </RainbowButton>
          )}

          {queueStatus === 'completed' && (
            <RainbowButton 
              variant="rainbow" 
              size="lg"
              onClick={() => window.location.href = '/user/dashboard'}
            >
              View Tickets
            </RainbowButton>
          )}

          {queueStatus === 'expired' && (
            <RainbowButton 
              variant="rainbow" 
              size="lg"
              onClick={handleJoinQueue}
              disabled={isJoining}
            >
              {isJoining ? (
                <LoadingSpinner size="sm" />
              ) : (
                'Join Queue Again'
              )}
            </RainbowButton>
          )}
        </div>
      </div>
    </ColorfulCard>
  );
};

export default QueueManager;
