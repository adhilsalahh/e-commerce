import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Percent, DollarSign, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axios from 'axios';

interface Coupon {
  id: number;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minAmount: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

const couponSchema = yup.object({
  code: yup.string().required('Coupon code is required').min(3, 'Code must be at least 3 characters'),
  type: yup.string().oneOf(['percentage', 'fixed']).required('Type is required'),
  value: yup.number().positive('Value must be positive').required('Value is required'),
  minAmount: yup.number().min(0, 'Minimum amount cannot be negative').required('Minimum amount is required'),
  maxDiscount: yup.number().positive('Max discount must be positive').nullable(),
  usageLimit: yup.number().positive('Usage limit must be positive').nullable(),
  expiresAt: yup.string().nullable()
});

type CouponFormData = yup.InferType<typeof couponSchema>;

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<CouponFormData>({
    resolver: yupResolver(couponSchema)
  });

  const watchType = watch('type');

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const response = await axios.get('/api/coupons');
      setCoupons(response.data.coupons);
    } catch (error) {
      console.error('Error fetching coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CouponFormData) => {
    try {
      const formattedData = {
        ...data,
        code: data.code.toUpperCase(),
        minAmount: data.minAmount || 0,
        maxDiscount: data.maxDiscount || null,
        usageLimit: data.usageLimit || null,
        expiresAt: data.expiresAt || null
      };

      if (editingCoupon) {
        await axios.put(`/api/coupons/${editingCoupon.id}`, {
          ...formattedData,
          isActive: editingCoupon.isActive
        });
        alert('Coupon updated successfully!');
      } else {
        await axios.post('/api/coupons', formattedData);
        alert('Coupon created successfully!');
      }
      setShowForm(false);
      setEditingCoupon(null);
      reset();
      fetchCoupons();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save coupon');
    }
  };

  const editCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setValue('code', coupon.code);
    setValue('type', coupon.type);
    setValue('value', coupon.value);
    setValue('minAmount', coupon.minAmount);
    setValue('maxDiscount', coupon.maxDiscount || null);
    setValue('usageLimit', coupon.usageLimit || null);
    setValue('expiresAt', coupon.expiresAt ? coupon.expiresAt.split('T')[0] : '');
    setShowForm(true);
  };

  const toggleCouponStatus = async (couponId: number, isActive: boolean) => {
    try {
      const coupon = coupons.find(c => c.id === couponId);
      if (!coupon) return;

      await axios.put(`/api/coupons/${couponId}`, {
        ...coupon,
        isActive: !isActive
      });
      fetchCoupons();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update coupon status');
    }
  };

  const deleteCoupon = async (couponId: number) => {
    if (confirm('Are you sure you want to delete this coupon? This action cannot be undone.')) {
      try {
        await axios.delete(`/api/coupons/${couponId}`);
        alert('Coupon deleted successfully!');
        fetchCoupons();
      } catch (error: any) {
        alert(error.response?.data?.message || 'Failed to delete coupon');
      }
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingCoupon(null);
    reset();
  };

  const getStatusColor = (coupon: Coupon) => {
    if (!coupon.isActive) return 'bg-gray-100 text-gray-800';
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return 'bg-red-100 text-red-800';
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (coupon: Coupon) => {
    if (!coupon.isActive) return 'Inactive';
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return 'Expired';
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return 'Used Up';
    return 'Active';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-8"></div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="h-16 bg-gray-300 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Coupons</h1>
              <p className="text-gray-600">Create and manage discount coupons</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Coupon
            </button>
          </div>
        </div>

        {/* Coupon Form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm p-6 mb-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingCoupon ? 'Edit Coupon' : 'Add New Coupon'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coupon Code
                  </label>
                  <input
                    {...register('code')}
                    type="text"
                    className={`w-full px-3 py-2 border ${
                      errors.code ? 'border-red-300' : 'border-gray-300'
                    } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase`}
                    placeholder="SAVE20"
                  />
                  {errors.code && (
                    <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Type
                  </label>
                  <select
                    {...register('type')}
                    className={`w-full px-3 py-2 border ${
                      errors.type ? 'border-red-300' : 'border-gray-300'
                    } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  >
                    <option value="">Select type</option>
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                  {errors.type && (
                    <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {watchType === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}
                  </label>
                  <input
                    {...register('value')}
                    type="number"
                    step="0.01"
                    className={`w-full px-3 py-2 border ${
                      errors.value ? 'border-red-300' : 'border-gray-300'
                    } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder={watchType === 'percentage' ? '20' : '10.00'}
                  />
                  {errors.value && (
                    <p className="mt-1 text-sm text-red-600">{errors.value.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Order Amount ($)
                  </label>
                  <input
                    {...register('minAmount')}
                    type="number"
                    step="0.01"
                    className={`w-full px-3 py-2 border ${
                      errors.minAmount ? 'border-red-300' : 'border-gray-300'
                    } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="0.00"
                  />
                  {errors.minAmount && (
                    <p className="mt-1 text-sm text-red-600">{errors.minAmount.message}</p>
                  )}
                </div>

                {watchType === 'percentage' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum Discount ($) - Optional
                    </label>
                    <input
                      {...register('maxDiscount')}
                      type="number"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="50.00"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Usage Limit - Optional
                  </label>
                  <input
                    {...register('usageLimit')}
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date - Optional
                  </label>
                  <input
                    {...register('expiresAt')}
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={cancelForm}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Coupons List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Coupons ({coupons.length})
            </h2>
          </div>

          {coupons.length === 0 ? (
            <div className="text-center py-12">
              <Percent className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No coupons</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first coupon.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Discount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {coupons.map((coupon, index) => (
                    <motion.tr
                      key={coupon.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="bg-blue-100 p-2 rounded-lg mr-3">
                            {coupon.type === 'percentage' ? (
                              <Percent className="h-4 w-4 text-blue-600" />
                            ) : (
                              <DollarSign className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {coupon.code}
                            </div>
                            <div className="text-sm text-gray-500">
                              Min: ${coupon.minAmount}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {coupon.type === 'percentage' ? `${coupon.value}%` : `$${coupon.value}`}
                        </div>
                        {coupon.maxDiscount && (
                          <div className="text-sm text-gray-500">
                            Max: ${coupon.maxDiscount}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {coupon.usedCount}
                        {coupon.usageLimit && ` / ${coupon.usageLimit}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(coupon)}`}>
                          {getStatusText(coupon)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {coupon.expiresAt ? (
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(coupon.expiresAt).toLocaleDateString()}
                          </div>
                        ) : (
                          'Never'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => toggleCouponStatus(coupon.id, coupon.isActive)}
                            className={`px-2 py-1 text-xs rounded ${
                              coupon.isActive 
                                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {coupon.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => editCoupon(coupon)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteCoupon(coupon.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCoupons;