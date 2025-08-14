import nodemailer from 'nodemailer';

// Create transporter with fallback to console logging for development
const createTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  
  // If no email credentials are provided, use a test account or console logging
  if (!emailUser || !emailPass) {
    console.log('⚠️  No email credentials provided. Emails will be logged to console.');
    return nodemailer.createTransporter({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    });
  }

  // Configure for Gmail or other SMTP services
  return nodemailer.createTransporter({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: emailUser,
      pass: emailPass
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,   // 10 seconds
    socketTimeout: 10000      // 10 seconds
  });
};

const transporter = createTransporter();

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@ecommerce.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export const sendVerificationEmail = async (email, name, token) => {
  const verifyUrl = `${FRONTEND_URL}/verify-email/${token}`;
  
  const mailOptions = {
    from: FROM_EMAIL,
    to: email,
    subject: 'Verify Your Email Address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563EB;">Welcome to Our E-Commerce Store!</h2>
        <p>Hi ${name},</p>
        <p>Thank you for registering with us. Please click the button below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>If you didn't create an account with us, you can safely ignore this email.</p>
        <p>This verification link will expire in 24 hours.</p>
        <hr style="margin: 30px 0; border: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          If you're having trouble clicking the button, copy and paste this URL into your browser:<br>
          ${verifyUrl}
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    
    // If using console transport, log the email content
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('📧 Verification Email (Console Mode):');
      console.log('To:', email);
      console.log('Subject:', mailOptions.subject);
      console.log('Verification URL:', verifyUrl);
      console.log('---');
    } else {
      console.log('Verification email sent to:', email);
    }
  } catch (error) {
    console.error('Error sending verification email:', error);
    // Don't throw error in development to prevent registration failures
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
};

export const sendPasswordResetEmail = async (email, name, token) => {
  const resetUrl = `${FRONTEND_URL}/reset-password/${token}`;
  
  const mailOptions = {
    from: FROM_EMAIL,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563EB;">Password Reset Request</h2>
        <p>Hi ${name},</p>
        <p>You requested to reset your password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>If you didn't request this password reset, you can safely ignore this email.</p>
        <p>This reset link will expire in 1 hour.</p>
        <hr style="margin: 30px 0; border: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          If you're having trouble clicking the button, copy and paste this URL into your browser:<br>
          ${resetUrl}
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    
    // If using console transport, log the email content
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('📧 Password Reset Email (Console Mode):');
      console.log('To:', email);
      console.log('Subject:', mailOptions.subject);
      console.log('Reset URL:', resetUrl);
      console.log('---');
    } else {
      console.log('Password reset email sent to:', email);
    }
  } catch (error) {
    console.error('Error sending password reset email:', error);
    // Don't throw error in development to prevent functionality failures
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
};

export const sendOrderConfirmationEmail = async (email, name, orderNumber, items, total) => {
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.title}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.price}</td>
    </tr>
  `).join('');

  const mailOptions = {
    from: FROM_EMAIL,
    to: email,
    subject: `Order Confirmation - ${orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563EB;">Order Confirmation</h2>
        <p>Hi ${name},</p>
        <p>Thank you for your order! Your order <strong>${orderNumber}</strong> has been confirmed.</p>
        
        <h3>Order Details:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
            <tr style="background-color: #f8f9fa; font-weight: bold;">
              <td colspan="2" style="padding: 12px; text-align: right;">Total:</td>
              <td style="padding: 12px; text-align: right;">$${total}</td>
            </tr>
          </tbody>
        </table>
        
        <p>We'll send you another email when your order ships.</p>
        <p>Thank you for shopping with us!</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    
    // If using console transport, log the email content
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('📧 Order Confirmation Email (Console Mode):');
      console.log('To:', email);
      console.log('Subject:', mailOptions.subject);
      console.log('Order:', orderNumber);
      console.log('Total:', `$${total}`);
      console.log('---');
    } else {
      console.log('Order confirmation email sent to:', email);
    }
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    // Don't throw error to prevent order processing failures
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
};

export const sendOrderStatusUpdateEmail = async (email, name, orderNumber, status, trackingNumber) => {
  const statusMessages = {
    pending: 'Your order is being processed',
    confirmed: 'Your order has been confirmed',
    shipped: 'Your order has been shipped',
    out_for_delivery: 'Your order is out for delivery',
    delivered: 'Your order has been delivered',
    cancelled: 'Your order has been cancelled'
  };

  const mailOptions = {
    from: FROM_EMAIL,
    to: email,
    subject: `Order Update - ${orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563EB;">Order Status Update</h2>
        <p>Hi ${name},</p>
        <p>Your order <strong>${orderNumber}</strong> status has been updated:</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0; color: #2563EB;">Status: ${status.replace('_', ' ').toUpperCase()}</h3>
          <p style="margin: 10px 0 0 0;">${statusMessages[status]}</p>
          ${trackingNumber ? `<p><strong>Tracking Number:</strong> ${trackingNumber}</p>` : ''}
        </div>
        
        <p>You can track your order anytime by logging into your account.</p>
        <p>Thank you for shopping with us!</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    
    // If using console transport, log the email content
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('📧 Order Status Update Email (Console Mode):');
      console.log('To:', email);
      console.log('Subject:', mailOptions.subject);
      console.log('Order:', orderNumber);
      console.log('Status:', status);
      if (trackingNumber) console.log('Tracking:', trackingNumber);
      console.log('---');
    } else {
      console.log('Order status update email sent to:', email);
    }
  } catch (error) {
    console.error('Error sending order status update email:', error);
    // Don't throw error to prevent status update failures
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
};