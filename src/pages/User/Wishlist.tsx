import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';

interface WishlistItem {
  id: number;
  productId: number;
  title: string;
  price: number;
  discountPrice?: number;
  image: string;
  createdAt: string;
}

const Wishlist = () => {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { addToCart } = useCart();

  useEffect(() => {
    if (user) {
      fetchWishlist();
    }
  }, [user]);

  const fetchWishlist = async () => {
    try {
      const response = await axios.get('/api/users/wishlist');
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId: number) => {
    try {
      await axios.delete(`/api/users/wishlist/${productId}`);
      setItems(items.filter(item => item.productId !== productId));
    } catch (error) {
      alert('Failed to remove item from wishlist');
    }
  };

  const handleAddToCart = async (productId: number) => {
    try {
      await addToCart(productId);
      alert('Item added to cart successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to add item to cart');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow p-6">
                  <div className="bg-gray-300 h-48 rounded mb-4"></div>
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Wishlist</h1>
          <p className="text-gray-600">Items you've saved for later</p>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="mx-auto h-24 w-24 text-gray-400" />
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Your wishlist is empty</h2>
            <p className="mt-2 text-gray-600">
              Start browsing and add items you love to your wishlist
            </p>
            <Link
              to="/products"
              className="mt-6 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 text-sm text-gray-600">
              {items.length} item{items.length !== 1 ? 's' : ''} in your wishlist
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow group"
                >
                  <div className="relative">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    {item.discountPrice && (
                      <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded-full text-sm font-semibold">
                        Sale
                      </div>
                    )}
                    <button
                      onClick={() => removeFromWishlist(item.productId)}
                      className="absolute top-3 right-3 bg-white p-2 rounded-full shadow-md hover:bg-gray-50 text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h3>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        {item.discountPrice ? (
                          <div className="flex items-center space-x-2">
                            <span className="text-lg font-bold text-blue-600">${item.discountPrice}</span>
                            <span className="text-sm text-gray-400 line-through">${item.price}</span>
                          </div>
                        ) : (
                          <span className="text-lg font-bold text-gray-900">${item.price}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddToCart(item.productId)}
                        className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center"
                      >
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        Add to Cart
                      </button>
                      <Link
                        to={`/products/${item.productId}`}
                        className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </div>
                    
                    <div className="mt-3 text-xs text-gray-500">
                      Added {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Wishlist;