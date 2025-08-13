import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Filter, Grid, List, Heart, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  discountPrice?: number;
  images: string[];
  categoryName: string;
  colors: string[];
  stock: number;
}

interface Category {
  id: number;
  name: string;
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { addToCart } = useCart();

  // Filter states
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sort: searchParams.get('sort') || 'createdAt',
    order: searchParams.get('order') || 'DESC'
  });

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [filters, pagination.currentPage]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/products/categories/all');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: '12',
        ...filters
      });

      // Remove empty filters
      Object.keys(filters).forEach(key => {
        if (!filters[key as keyof typeof filters]) {
          params.delete(key);
        }
      });

      const response = await axios.get(`/api/products?${params}`);
      setProducts(response.data.products);
      setPagination({
        currentPage: response.data.pagination.currentPage,
        totalPages: response.data.pagination.totalPages,
        totalItems: response.data.pagination.totalItems
      });

      // Update URL
      setSearchParams(params);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleAddToCart = async (productId: number) => {
    if (!user) {
      alert('Please login to add items to cart');
      return;
    }

    try {
      await addToCart(productId);
      alert('Item added to cart successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to add item to cart');
    }
  };

  const handleAddToWishlist = async (productId: number) => {
    if (!user) {
      alert('Please login to add items to wishlist');
      return;
    }

    try {
      await axios.post('/api/users/wishlist', { productId });
      alert('Item added to wishlist!');
    } catch (error) {
      alert('Failed to add item to wishlist');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Products</h1>
            <p className="text-gray-600">Showing {pagination.totalItems} products</p>
          </div>
          
          {/* Search and View Controls */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
            
            <div className="flex border border-gray-300 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <div className={`${showFilters ? 'block' : 'hidden'} lg:block w-full lg:w-64 flex-shrink-0`}>
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
              {/* Category Filter */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Category</h3>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Price Range</h3>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Sort Options */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Sort By</h3>
                <select
                  value={`${filters.sort}-${filters.order}`}
                  onChange={(e) => {
                    const [sort, order] = e.target.value.split('-');
                    handleFilterChange('sort', sort);
                    handleFilterChange('order', order);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="createdAt-DESC">Newest First</option>
                  <option value="price-ASC">Price: Low to High</option>
                  <option value="price-DESC">Price: High to Low</option>
                  <option value="title-ASC">Name: A to Z</option>
                </select>
              </div>

              {/* Clear Filters */}
              <button
                onClick={() => {
                  setFilters({
                    search: '',
                    category: '',
                    minPrice: '',
                    maxPrice: '',
                    sort: 'createdAt',
                    order: 'DESC'
                  });
                  setSearchParams({});
                }}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Products Grid/List */}
          <div className="flex-1">
            {loading ? (
              <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-6`}>
                {[...Array(9)].map((_, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                    <div className="bg-gray-300 h-48 rounded mb-4"></div>
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded w-2/3 mb-4"></div>
                    <div className="h-6 bg-gray-300 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-xl text-gray-600">No products found matching your criteria.</p>
              </div>
            ) : (
              <>
                <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-6`}>
                  {products.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow ${
                        viewMode === 'list' ? 'flex gap-6' : ''
                      }`}
                    >
                      <div className={`relative ${viewMode === 'list' ? 'w-64 flex-shrink-0' : ''}`}>
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className={`object-cover rounded-t-lg ${
                            viewMode === 'list' ? 'w-full h-full rounded-l-lg rounded-t-none' : 'w-full h-48'
                          }`}
                        />
                        {product.discountPrice && (
                          <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded-full text-sm font-semibold">
                            Sale
                          </div>
                        )}
                        {user && (
                          <button
                            onClick={() => handleAddToWishlist(product.id)}
                            className="absolute top-3 right-3 bg-white p-2 rounded-full shadow-md hover:bg-gray-50"
                          >
                            <Heart className="h-4 w-4 text-gray-600" />
                          </button>
                        )}
                      </div>
                      
                      <div className="p-6 flex-1">
                        <div className="text-sm text-blue-600 mb-2">{product.categoryName}</div>
                        <h3 className="font-semibold text-gray-900 mb-2 hover:text-blue-600">
                          <Link to={`/products/${product.id}`}>{product.title}</Link>
                        </h3>
                        {viewMode === 'list' && (
                          <p className="text-gray-600 mb-4 line-clamp-2">{product.description}</p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div>
                            {product.discountPrice ? (
                              <div className="flex items-center space-x-2">
                                <span className="text-lg font-bold text-blue-600">${product.discountPrice}</span>
                                <span className="text-sm text-gray-400 line-through">${product.price}</span>
                              </div>
                            ) : (
                              <span className="text-lg font-bold text-gray-900">${product.price}</span>
                            )}
                            {product.colors && product.colors.length > 0 && (
                              <div className="flex space-x-1 mt-2">
                                {product.colors.slice(0, 3).map(color => (
                                  <div
                                    key={color}
                                    className="w-4 h-4 rounded-full border border-gray-300"
                                    style={{ backgroundColor: color.toLowerCase() }}
                                    title={color}
                                  ></div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            <Link
                              to={`/products/${product.id}`}
                              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors text-sm"
                            >
                              View
                            </Link>
                            {user && product.stock > 0 && (
                              <button
                                onClick={() => handleAddToCart(product.id)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
                              >
                                <ShoppingCart className="h-4 w-4" />
                                Add
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {product.stock === 0 && (
                          <div className="mt-2 text-red-600 text-sm font-medium">Out of Stock</div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex justify-center items-center space-x-2 mt-12">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                      disabled={pagination.currentPage === 1}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    {[...Array(pagination.totalPages)].map((_, index) => (
                      <button
                        key={index + 1}
                        onClick={() => setPagination(prev => ({ ...prev, currentPage: index + 1 }))}
                        className={`px-4 py-2 border rounded-md ${
                          pagination.currentPage === index + 1
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {index + 1}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                      disabled={pagination.currentPage === pagination.totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;