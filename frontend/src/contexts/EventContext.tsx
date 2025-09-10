import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface TicketType {
  id?: string;
  name: string;
  description: string;
  price: number;
  available?: number;
  quantityTotal?: number;
  maxPerUser?: number;
  saleStartTime?: string;
  saleEndTime?: string;
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
  address: string; // API uses 'address' not 'location'
  location?: string; // Keep for backward compatibility
  imageUrl?: string;
  totalTickets: number; // API uses 'totalTickets' not 'maxTickets'
  maxTickets?: number; // Keep for backward compatibility
  availableTickets: number;
  ticketPrice: string; // API uses 'ticketPrice' as string
  price?: number; // Keep for backward compatibility
  currency: string;
  category: string;
  status: 'active' | 'inactive' | 'cancelled' | 'sold_out' | 'completed';
  refundDeadline: string;
  timezone: string;
  ticketTypes?: TicketType[];
  createdAt: string;
  updatedAt: string;
}

interface EventContextType {
  events: Event[];
  currentEvent: Event | null;
  isLoading: boolean;
  error: string | null;
  fetchEvents: () => Promise<void>;
  fetchEvent: (id: string) => Promise<void>;
  createEvent: (eventData: Partial<Event>) => Promise<void>;
  updateEvent: (id: string, eventData: Partial<Event>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  clearError: () => void;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export const useEvents = () => {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
};

interface EventProviderProps {
  children: ReactNode;
}

export const EventProvider: React.FC<EventProviderProps> = ({ children }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/events', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Handle both array and object with events property
        const eventsArray = Array.isArray(data) ? data : (data.events || []);
        setEvents(Array.isArray(eventsArray) ? eventsArray : []);
      } else {
        throw new Error('Failed to fetch events');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      // Set empty array on error to prevent filter issues
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchEvent = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/events/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentEvent(data.event || data);
      } else {
        throw new Error('Failed to fetch event');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createEvent = async (eventData: Partial<Event>) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(eventData),
      });

      if (response.ok) {
        const responseData = await response.json();
        const newEvent = responseData.event || responseData; // Handle both formats
        setEvents(prev => [...prev, newEvent]);
      } else {
        const errorData = await response.json();
        console.error('Event creation failed:', errorData);
        throw new Error(errorData.message || 'Failed to create event');
      }
    } catch (err) {
      console.error('Event creation error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const updateEvent = async (id: string, eventData: Partial<Event>) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/events/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(eventData),
      });

      if (response.ok) {
        const updatedEvent = await response.json();
        setEvents(prev => prev.map(event => event.id === id ? updatedEvent : event));
        if (currentEvent?.id === id) {
          setCurrentEvent(updatedEvent);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update event');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEvent = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/events/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setEvents(prev => prev.filter(event => event.id !== id));
        if (currentEvent?.id === id) {
          setCurrentEvent(null);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete event');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: EventContextType = {
    events,
    currentEvent,
    isLoading,
    error,
    fetchEvents,
    fetchEvent,
    createEvent,
    updateEvent,
    deleteEvent,
    clearError,
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
};
