import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Mail } from 'lucide-react';
import axios from 'axios';

const VerifyEmail = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      verifyEmail();
    }
  }, [token]);

  const verifyEmail = async () => {
    try {
      const response = await axios.get(`/api/auth/verify/${token}`);
      setSuccess(true);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Email verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
              <h2 className="mt-6 text-2xl font-bold text-gray-900">
                Verifying your email...
              </h2>
              <p className="mt-2 text-gray-600">
                Please wait while we verify your email address.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {success ? (
              <>
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="mt-6 text-2xl font-bold text-gray-900">
                  Email Verified Successfully!
                </h2>
                <p className="mt-2 text-gray-600">
                  Your email has been verified. You can now log in to your account.
                </p>
                <div className="mt-6">
                  <Link
                    to="/login"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Continue to Login
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="mt-6 text-2xl font-bold text-gray-900">
                  Verification Failed
                </h2>
                <p className="mt-2 text-red-600">
                  {error}
                </p>
                <p className="mt-2 text-gray-600">
                  The verification link may have expired or is invalid.
                </p>
                <div className="mt-6">
                  <Link
                    to="/register"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Back to Registration
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;