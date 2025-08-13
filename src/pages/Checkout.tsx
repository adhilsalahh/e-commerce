import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, MapPin, User, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import axios from 'axios';

interface Address {
  id: number;
  name: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

const Checkout: React.FC = () => {
  const { user } = useAuth();
  const { items, getTotalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (items.length === 0) {
      navigate('/cart');
      return;
    }

    fetchAddresses();
  }, [user, items, navigate]);

  const fetchAddresses = async () => {
    try {
      const response = await axios.get('/api/users/profile');
      setAddresses(response.data.addresses || []);
      const defaultAddress = response.data.addresses?.find((addr: Address) => addr.isDefault);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;

    try {
      const response = await axios.post('/api/coupons/validate', {
        code: couponCode,
        amount: subtotal
      });

      if (response.data.valid) {
        setDiscount(response.data.discount);
        setCouponApplied(true);
        alert('Coupon applied successfully!');
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Invalid coupon code');
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      alert('Please select a shipping address');
      return;
    }

    try {
      setLoading(true);

      const orderData = {
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.discountPrice || item.price,
          color: item.color,
          size: item.size
        })),
        shippingAddress: selectedAddress,
        paymentMethod,
        subtotal,
        tax: tax,
        shipping: shippingCost,
        discount,
        total: finalTotal,
        couponCode: couponApplied ? couponCode : undefined
      };

      const response = await axios.post('/api/orders', orderData);
      
      clearCart();
      alert('Order placed successfully!');
      navigate(`/orders/${response.data.orderId}`);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (!user || items.length === 0) {
    return null;
  }

  const subtotal = getTotalPrice();
  const tax = subtotal * 0.08; // 8% tax
  const shippingCost = subtotal > 50 ? 0 : 9.99;
  const finalTotal = subtotal + tax + shippingCost - discount;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start xl:gap-x-16">
          <div className="lg:col-span-7">
            {/* Shipping Address */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <div className="flex items-center mb-4">
                <MapPin className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Shipping Address</h2>
              </div>

              {addresses.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-600 mb-4">No addresses found. Please add an address first.</p>
                  <button
                    onClick={() => navigate('/profile')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Add Address
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className={`border rounded-lg p-4 cursor-pointer ${
                        selectedAddress?.id === address.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onClick={() => setSelectedAddress(address)}
                    >
                      <div className="flex items-start">
                        <input
                          type="radio"
                          checked={selectedAddress?.id === address.id}
                          onChange={() => setSelectedAddress(address)}
                          className="mt-1 mr-3"
                        />
                        <div>
                          <p className="font-medium text-gray-900">{address.name}</p>
                          <p className="text-gray-600">
                            {address.street}, {address.city}, {address.state} {address.zipCode}
                          </p>
                          {address.isDefault && (
                            <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mt-1">
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <div className="flex items-center mb-4">
                <CreditCard className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Payment Method</h2>
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="credit_card"
                    value="credit_card"
                    checked={paymentMethod === 'credit_card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <label htmlFor="credit_card" className="flex items-center">
                    <CreditCard className="h-5 w-5 text-gray-400 mr-2" />
                    Credit Card
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="paypal"
                    value="paypal"
                    checked={paymentMethod === 'paypal'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <label htmlFor="paypal" className="flex items-center">
                    <User className="h-5 w-5 text-gray-400 mr-2" />
                    PayPal
                  </label>
                </div>
              </div>
            </div>

            {/* Coupon Code */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Coupon Code</h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Enter coupon code"
                  disabled={couponApplied}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
                <button
                  onClick={applyCoupon}
                  disabled={couponApplied || !couponCode.trim()}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {couponApplied ? 'Applied' : 'Apply'}
                </button>
              </div>
              {couponApplied && (
                <p className="text-green-600 text-sm mt-2">
                  Coupon applied! You saved ${discount.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="mt-16 lg:mt-0 lg:col-span-5">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h2>

              {/* Order Items */}
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-16 h-16 object-cover rounded-md"
                    />
                    <div className="ml-4 flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{item.title}</h3>
                      {item.color && <p className="text-sm text-gray-500">Color: {item.color}</p>}
                      {item.size && <p className="text-sm text-gray-500">Size: {item.size}</p>}
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      ${((item.discountPrice || item.price) * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pricing Breakdown */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex justify-between">
                  <span className="text-base text-gray-900">Subtotal</span>
                  <span className="text-base font-medium text-gray-900">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-base text-gray-900">Shipping</span>
                  <span className="text-base font-medium text-gray-900">
                    {shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-base text-gray-900">Tax</span>
                  <span className="text-base font-medium text-gray-900">
                    ${tax.toFixed(2)}
                  </span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className="text-base">Discount</span>
                    <span className="text-base font-medium">
                      -${discount.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-medium text-gray-900">Total</span>
                    <span className="text-lg font-medium text-gray-900">
                      ${finalTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading || !selectedAddress}
                className="mt-6 w-full bg-blue-600 border border-transparent rounded-md shadow-sm py-3 px-4 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Lock className="h-5 w-5 mr-2" />
                    Place Order
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                Your payment information is secure and encrypted
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;