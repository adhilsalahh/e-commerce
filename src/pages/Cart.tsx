import React from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

const Cart: React.FC = () => {
  const { items, updateQuantity, removeItem, getTotalPrice, getTotalItems, loading } = useCart();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <ShoppingBag className="mx-auto h-24 w-24 text-gray-400" />
            <h2 className="mt-4 text-3xl font-bold text-gray-900">Your cart is empty</h2>
            <p className="mt-2 text-lg text-gray-600">
              Start shopping to add items to your cart
            </p>
            <Link
              to="/products"
              className="mt-6 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>
        
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start xl:gap-x-16">
          <div className="lg:col-span-7">
            <div className="bg-white shadow rounded-lg">
              <ul className="divide-y divide-gray-200">
                {items.map((item) => (
                  <li key={item.id} className="p-6">
                    <div className="flex items-center">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-20 h-20 object-cover rounded-md"
                      />
                      <div className="ml-6 flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              {item.title}
                            </h3>
                            {item.color && (
                              <p className="text-sm text-gray-500">Color: {item.color}</p>
                            )}
                            {item.size && (
                              <p className="text-sm text-gray-500">Size: {item.size}</p>
                            )}
                            <div className="mt-2">
                              {item.discountPrice ? (
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg font-medium text-gray-900">
                                    ${item.discountPrice}
                                  </span>
                                  <span className="text-sm text-gray-500 line-through">
                                    ${item.price}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-lg font-medium text-gray-900">
                                  ${item.price}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                        
                        <div className="mt-4 flex items-center">
                          <button
                            onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            className="p-1 rounded-md border border-gray-300 hover:bg-gray-50"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="mx-4 text-lg font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, Math.min(item.stock, item.quantity + 1))}
                            className="p-1 rounded-md border border-gray-300 hover:bg-gray-50"
                            disabled={item.quantity >= item.stock}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <span className="ml-4 text-sm text-gray-500">
                            {item.stock} available
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-16 lg:mt-0 lg:col-span-5">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-base text-gray-900">
                    Subtotal ({getTotalItems()} items)
                  </span>
                  <span className="text-base font-medium text-gray-900">
                    ${getTotalPrice().toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-base text-gray-900">Shipping</span>
                  <span className="text-base font-medium text-gray-900">
                    Free
                  </span>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between">
                    <span className="text-lg font-medium text-gray-900">Total</span>
                    <span className="text-lg font-medium text-gray-900">
                      ${getTotalPrice().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <Link
                to="/checkout"
                className="mt-6 w-full bg-blue-600 border border-transparent rounded-md shadow-sm py-3 px-4 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center"
              >
                Proceed to Checkout
              </Link>
              
              <Link
                to="/products"
                className="mt-4 w-full bg-white border border-gray-300 rounded-md shadow-sm py-3 px-4 text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;