import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface QueueEntry {
  id: string;
  userId: string;
  eventId: string;
  position: number;
  status: 'waiting' | 'active' | 'expired' | 'completed';
  expiresAt: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  event: {
    id: string;
    title: string;
    date: string;
  };
}

interface QueueContextType {
  queueEntries: QueueEntry[];
  currentPosition: number | null;
  estimatedWaitTime: number | null;
  isLoading: boolean;
  error: string | null;
  joinQueue: (eventId: string) => Promise<void>;
  leaveQueue: (eventId: string) => Promise<void>;
  fetchQueueStatus: (eventId: string) => Promise<void>;
  clearError: () => void;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (context === undefined) {
    throw new Error('useQueue must be used within a QueueProvider');
  }
  return context;
};

interface QueueProviderProps {
  children: ReactNode;
}

export const QueueProvider: React.FC<QueueProviderProps> = ({ children }) => {
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [currentPosition, setCurrentPosition] = useState<number | null>(null);
  const [estimatedWaitTime, setEstimatedWaitTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinQueue = useCallback(async (eventId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/queue/events/${eventId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ eventId }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentPosition(data.position);
        setEstimatedWaitTime(data.estimatedWaitTime);
        // Refresh queue status
        await fetchQueueStatus(eventId);
      } else {
        const errorData = await response.json();
        
        // Handle specific error types with user-friendly messages
        if (errorData.errorType === 'PURCHASE_LIMIT_REACHED') {
          throw new Error('You have already reached the maximum ticket purchase limit for this event. You cannot purchase more tickets as you have reached the limit set by the admin.');
        }
        
        throw new Error(errorData.message || 'Failed to join queue');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const leaveQueue = useCallback(async (eventId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/queue/events/${eventId}/leave`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ eventId }),
      });

      if (response.ok) {
        setCurrentPosition(null);
        setEstimatedWaitTime(null);
        // Refresh queue status - call directly to avoid circular dependency
        // await fetchQueueStatus(eventId);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to leave queue');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchQueueStatus = useCallback(async (eventId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/queue/events/${eventId}/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('QueueContext: fetchQueueStatus response data:', data);
        setQueueEntries(data.queueEntries || []);
        // Backend returns queueEntry object, extract position from it
        const position = data.queueEntry?.position;
        const waitTime = data.queueEntry?.estimatedWaitSeconds;
        console.log('QueueContext: extracted position:', position, 'waitTime:', waitTime);
        setCurrentPosition(position);
        setEstimatedWaitTime(waitTime ? Math.floor(waitTime / 60) : null);
        console.log('QueueContext: set currentPosition to:', position);
      } else {
        // If no queue status endpoint exists, simulate queue position
        const simulatedPosition = Math.floor(Math.random() * 1000) + 1;
        setCurrentPosition(simulatedPosition);
        setEstimatedWaitTime(Math.floor(simulatedPosition / 10) + 1);
      }
    } catch (err) {
      console.log('QueueContext: fetchQueueStatus error:', err);
      // Simulate queue position if backend is not available
      const simulatedPosition = Math.floor(Math.random() * 1000) + 1;
      console.log('QueueContext: simulating position:', simulatedPosition);
      setCurrentPosition(simulatedPosition);
      setEstimatedWaitTime(Math.floor(simulatedPosition / 10) + 1);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = () => {
    setError(null);
  };

  const value: QueueContextType = {
    queueEntries,
    currentPosition,
    estimatedWaitTime,
    isLoading,
    error,
    joinQueue,
    leaveQueue,
    fetchQueueStatus,
    clearError,
  };

  return (
    <QueueContext.Provider value={value}>
      {children}
    </QueueContext.Provider>
  );
};
