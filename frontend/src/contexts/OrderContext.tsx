import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Order {
  id: string;
  userId: string;
  eventId: string;
  event: {
    id: string;
    title: string;
    name?: string;
    date: string;
    startDate?: string;
    location: string;
    venue?: string;
    address?: string;
    imageUrl?: string;
  };
  orderItems?: Array<{
    id: string;
    ticketTypeId: string;
    ticketType?: {
      id: string;
      name: string;
      price: number;
    };
    quantity: number;
    price: number;
    totalPrice?: number;
    tickets?: Array<{
      id: string;
      ticketTypeId: string;
      ticketType: {
        id: string;
        name: string;
        price: number;
      };
      quantity: number;
      totalPrice: number;
    }>;
  }>;
  tickets: Array<{
    id: string;
    ticketTypeId: string;
    ticketType: {
      id: string;
      name: string;
      price: number;
    };
    quantity: number;
    totalPrice: number;
  }>;
  totalAmount: number;
  currency?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  createdAt: string;
  updatedAt: string;
}

interface OrderContextType {
  orders: Order[];
  currentOrder: Order | null;
  isLoading: boolean;
  error: string | null;
  fetchOrders: () => Promise<void>;
  fetchOrder: (id: string) => Promise<void>;
  createOrder: (orderData: Partial<Order>) => Promise<void>;
  updateOrder: (id: string, orderData: Partial<Order>) => Promise<void>;
  cancelOrder: (id: string) => Promise<void>;
  clearError: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};

interface OrderProviderProps {
  children: ReactNode;
}

export const OrderProvider: React.FC<OrderProviderProps> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      console.log('OrderContext: Fetching orders with token:', token ? 'present' : 'missing');
      const response = await fetch('http://localhost:3001/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('OrderContext: fetchOrders response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('OrderContext: fetchOrders response data:', data);
        setOrders(data.orders || data);
        console.log('OrderContext: Orders set to state:', data.orders || data);
      } else {
        const errorData = await response.json();
        console.error('OrderContext: fetchOrders error response:', errorData);
        throw new Error(errorData.message || 'Failed to fetch orders');
      }
    } catch (err) {
      console.error('OrderContext: fetchOrders exception:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchOrder = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/orders/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('OrderContext: fetchOrder response data:', data);
        setCurrentOrder(data.order || data);
        console.log('OrderContext: Current order set to:', data.order || data);
      } else {
        throw new Error('Failed to fetch order');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createOrder = async (orderData: Partial<Order>) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      console.log('OrderContext: Creating order with token:', token ? 'present' : 'missing');
      console.log('OrderContext: Order data:', orderData);
      
      const response = await fetch('http://localhost:3001/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      });

      console.log('OrderContext: Response status:', response.status);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('OrderContext: Response data:', responseData);
        const newOrder = responseData.order || responseData;
        setOrders(prev => [...prev, newOrder]);
        setCurrentOrder(newOrder);
        console.log('OrderContext: Order added to state');
      } else {
        const errorData = await response.json();
        console.error('OrderContext: Error response:', errorData);
        throw new Error(errorData.message || 'Failed to create order');
      }
    } catch (err) {
      console.error('OrderContext: Exception:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrder = async (id: string, orderData: Partial<Order>) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const updatedOrder = await response.json();
        setOrders(prev => prev.map(order => order.id === id ? updatedOrder : order));
        if (currentOrder?.id === id) {
          setCurrentOrder(updatedOrder);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update order');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const cancelOrder = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/orders/${id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const cancelledOrder = await response.json();
        setOrders(prev => prev.map(order => order.id === id ? cancelledOrder : order));
        if (currentOrder?.id === id) {
          setCurrentOrder(cancelledOrder);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel order');
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

  const value: OrderContextType = {
    orders,
    currentOrder,
    isLoading,
    error,
    fetchOrders,
    fetchOrder,
    createOrder,
    updateOrder,
    cancelOrder,
    clearError,
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};
