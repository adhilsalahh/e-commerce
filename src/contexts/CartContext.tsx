import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface CartItem {
  id: string;
  product_id: string;
  title: string;
  price: number;
  discount_price?: number;
  quantity: number;
  color?: string;
  size?: string;
  images: string[];
  stock: number;
}

interface CartState {
  items: CartItem[];
  loading: boolean;
}

interface CartContextType extends CartState {
  addToCart: (product: any, quantity?: number, color?: string, size?: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  getTotalPrice: () => number;
  getTotalItems: () => number;
}

type CartAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ITEMS'; payload: CartItem[] }
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'UPDATE_ITEM'; payload: { id: string; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'CLEAR_CART' };

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ITEMS':
      return { ...state, items: action.payload, loading: false };
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.payload] };
    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
      };
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload)
      };
    case 'CLEAR_CART':
      return { ...state, items: [] };
    default:
      return state;
  }
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    loading: false
  });

  // Load cart items when user logs in
  useEffect(() => {
    if (user) {
      loadCartItems();
    } else {
      dispatch({ type: 'CLEAR_CART' });
    }
  }, [user]);

  const loadCartItems = async () => {
    if (!user) return;

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          product_id,
          quantity,
          color,
          size,
          products (
            title,
            price,
            discount_price,
            images,
            stock
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const cartItems: CartItem[] = data?.map(item => ({
        id: item.id,
        product_id: item.product_id,
        title: item.products.title,
        price: item.products.price,
        discount_price: item.products.discount_price,
        quantity: item.quantity,
        color: item.color,
        size: item.size,
        images: item.products.images || [],
        stock: item.products.stock
      })) || [];

      dispatch({ type: 'SET_ITEMS', payload: cartItems });
    } catch (error) {
      console.error('Error loading cart items:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const addToCart = async (product: any, quantity = 1, color?: string, size?: string) => {
    if (!user) {
      throw new Error('Please log in to add items to cart');
    }

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      // Check if item already exists in cart
      const { data: existingItem, error: checkError } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .eq('color', color || '')
        .eq('size', size || '')
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingItem) {
        // Update existing item
        const newQuantity = existingItem.quantity + quantity;
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: newQuantity })
          .eq('id', existingItem.id);

        if (updateError) throw updateError;

        dispatch({
          type: 'UPDATE_ITEM',
          payload: { id: existingItem.id, quantity: newQuantity }
        });
      } else {
        // Add new item
        const { data: newItem, error: insertError } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: product.id,
            quantity,
            color,
            size
          })
          .select()
          .single();

        if (insertError) throw insertError;

        const cartItem: CartItem = {
          id: newItem.id,
          product_id: product.id,
          title: product.title,
          price: product.price,
          discount_price: product.discount_price,
          quantity,
          color,
          size,
          images: product.images || [],
          stock: product.stock
        };

        dispatch({ type: 'ADD_ITEM', payload: cartItem });
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (!user) return;

    if (quantity <= 0) {
      await removeItem(itemId);
      return;
    }

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId);

      if (error) throw error;

      dispatch({ type: 'UPDATE_ITEM', payload: { id: itemId, quantity } });
    } catch (error) {
      console.error('Error updating quantity:', error);
      throw error;
    }
  };

  const removeItem = async (itemId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      dispatch({ type: 'REMOVE_ITEM', payload: itemId });
    } catch (error) {
      console.error('Error removing item:', error);
      throw error;
    }
  };

  const clearCart = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      dispatch({ type: 'CLEAR_CART' });
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  };

  const getTotalPrice = () => {
    return state.items.reduce((total, item) => {
      const price = item.discount_price || item.price;
      return total + (price * item.quantity);
    }, 0);
  };

  const getTotalItems = () => {
    return state.items.reduce((total, item) => total + item.quantity, 0);
  };

  const value: CartContextType = {
    ...state,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    getTotalPrice,
    getTotalItems
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};