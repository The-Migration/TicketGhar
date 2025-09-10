import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PurchaseSession {
  id: string;
  userId: string;
  eventId: string;
  status: 'active' | 'expired' | 'completed' | 'cancelled';
  expiresAt: string;
  createdAt: string;
  event: {
    id: string;
    title: string;
    date: string;
    location: string;
  };
  selectedTickets: Array<{
    ticketTypeId: string;
    ticketType: {
      id: string;
      name: string;
      description: string;
      price: number;
      available: number;
    };
    quantity: number;
  }>;
  totalAmount: number;
}

interface PurchaseContextType {
  currentSession: PurchaseSession | null;
  isLoading: boolean;
  error: string | null;
  createPurchaseSession: (eventId: string) => Promise<void>;
  updateTicketSelection: (ticketTypeId: string, quantity: number) => Promise<void>;
  completePurchase: (paymentData: any) => Promise<any>;
  cancelPurchase: () => Promise<void>;
  clearError: () => void;
}

const PurchaseContext = createContext<PurchaseContextType | undefined>(undefined);

export const usePurchase = () => {
  const context = useContext(PurchaseContext);
  if (context === undefined) {
    throw new Error('usePurchase must be used within a PurchaseProvider');
  }
  return context;
};

interface PurchaseProviderProps {
  children: ReactNode;
}

export const PurchaseProvider: React.FC<PurchaseProviderProps> = ({ children }) => {
  const [currentSession, setCurrentSession] = useState<PurchaseSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPurchaseSession = async (eventId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/purchase-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ eventId }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentSession(data);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create purchase session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const updateTicketSelection = async (ticketTypeId: string, quantity: number) => {
    if (!currentSession) return;

    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/purchase-sessions/${currentSession.id}/tickets`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ ticketTypeId, quantity }),
      });

      if (response.ok) {
        const updatedSession = await response.json();
        setCurrentSession(updatedSession);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update ticket selection');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const completePurchase = async (paymentData: any) => {
    if (!currentSession) return;

    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/purchase-sessions/${currentSession.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(paymentData),
      });

      if (response.ok) {
        const completedOrder = await response.json();
        setCurrentSession(null);
        return completedOrder;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to complete purchase');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const cancelPurchase = async () => {
    if (!currentSession) return;

    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/purchase-sessions/${currentSession.id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setCurrentSession(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel purchase');
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

  const value: PurchaseContextType = {
    currentSession,
    isLoading,
    error,
    createPurchaseSession,
    updateTicketSelection,
    completePurchase,
    cancelPurchase,
    clearError,
  };

  return (
    <PurchaseContext.Provider value={value}>
      {children}
    </PurchaseContext.Provider>
  );
};
