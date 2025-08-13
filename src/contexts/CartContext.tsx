import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

interface CartItem {
  id: number;
  productId: number;
  title: string;
  price: number;
  discountPrice?: number;
  quantity: number;
  color?: string;
  size?: string;
  image: string;
  stock: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (productId: number, quantity?: number, color?: string, size?: string) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
  loading: boolean;
  fetchCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchCart();
    } else {
      setItems([]);
    }
  }, [user]);

  const fetchCart = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await axios.get('/api/users/cart');
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId: number, quantity = 1, color?: string, size?: string) => {
    if (!user) {
      throw new Error('Please login to add items to cart');
    }

    try {
      await axios.post('/api/users/cart', {
        productId,
        quantity,
        color,
        size
      });
      await fetchCart();
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to add item to cart');
    }
  };

  const updateQuantity = async (itemId: number, quantity: number) => {
    try {
      await axios.put(`/api/users/cart/${itemId}`, { quantity });
      await fetchCart();
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update cart');
    }
  };

  const removeItem = async (itemId: number) => {
    try {
      await axios.delete(`/api/users/cart/${itemId}`);
      await fetchCart();
    } catch (error) {
      throw new Error('Failed to remove item from cart');
    }
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => {
      const price = item.discountPrice || item.price;
      return total + (price * item.quantity);
    }, 0);
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const value = {
    items,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    getTotalPrice,
    getTotalItems,
    loading,
    fetchCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
</boltContext>