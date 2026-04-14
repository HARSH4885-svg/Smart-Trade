import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, Chrome, Phone, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

const Signup = () => {
  const [method, setMethod] = useState('email'); // 'email' or 'phone'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);

  const { signup, signInWithGoogle, sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const getPasswordStrength = (pass) => {
    if (pass.length === 0) return { label: '', color: 'bg-border' };
    if (pass.length < 6) return { label: 'Weak', color: 'bg-danger' };
    if (pass.length < 10) return { label: 'Medium', color: 'bg-warning' };
    return { label: 'Strong', color: 'bg-success' };
  };

  const strength = getPasswordStrength(formData.password);

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    const result = await signup(formData.name, formData.email, formData.password);
    setLoading(false);
    if (result.success) {
      toast.success('Account created successfully!');
      navigate('/');
    } else {
      toast.error(result.message);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    const result = await signInWithGoogle();
    setLoading(false);
    if (result.success) {
      toast.success('Signed in with Google');
      navigate('/');
    } else {
      toast.error(result.message);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phoneNumber.startsWith('+')) {
      toast.error('Phone number must include country code (e.g. +1)');
      return;
    }
    setLoading(true);
    const result = await sendOtp(phoneNumber, 'recaptcha-container-signup');
    setLoading(false);
    if (result.success) {
      setShowOtp(true);
      toast.success('OTP sent to your phone');
    } else {
      toast.error(result.message);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await verifyOtp(otp);
    setLoading(false);
    if (result.success) {
      toast.success('Phone verified!');
      navigate('/');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div id="recaptcha-container-signup"></div>
      <div className="card w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
            <UserPlus size={32} />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Create account</h2>
          <p className="text-text-secondary mt-2">Start your trading journey today</p>
        </div>

        <div className="flex p-1 bg-surface rounded-xl border border-border">
          <button 
            onClick={() => setMethod('email')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-bold transition-all ${method === 'email' ? 'bg-background shadow-sm text-primary' : 'text-text-secondary'}`}
          >
            <Mail size={16} />
            <span>Email</span>
          </button>
          <button 
            onClick={() => setMethod('phone')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-bold transition-all ${method === 'phone' ? 'bg-background shadow-sm text-primary' : 'text-text-secondary'}`}
          >
            <Phone size={16} />
            <span>Phone</span>
          </button>
        </div>

        {method === 'email' ? (
          <form className="space-y-4" onSubmit={handleEmailSignup}>
            <div className="space-y-1">
              <label className="text-xs font-black text-text-secondary uppercase tracking-widest ml-1">Full Name</label>
              <input
                type="text"
                required
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-text-secondary uppercase tracking-widest ml-1">Email Address</label>
              <input
                type="email"
                required
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="name@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-text-secondary uppercase tracking-widest ml-1">Password</label>
              <input
                type="password"
                required
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              {formData.password && (
                <div className="flex items-center space-x-2 mt-1">
                  <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                    <div className={`h-full ${strength.color} transition-all duration-500`} style={{ width: strength.label === 'Weak' ? '33%' : strength.label === 'Medium' ? '66%' : '100%' }}></div>
                  </div>
                  <span className="text-xs font-bold uppercase text-text-secondary">{strength.label}</span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-text-secondary uppercase tracking-widest ml-1">Confirm Password</label>
              <input
                type="password"
                required
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 disabled:opacity-50 mt-4">
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            {!showOtp ? (
              <form className="space-y-6" onSubmit={handleSendOtp}>
                <div className="space-y-2">
                  <label className="text-xs font-black text-text-secondary uppercase tracking-widest ml-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="+1234567890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                  <p className="text-[10px] text-text-secondary ml-1 italic">Include country code (e.g. +1 for USA)</p>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 disabled:opacity-50">
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            ) : (
              <form className="space-y-6" onSubmit={handleVerifyOtp}>
                <div className="space-y-2">
                  <label className="text-xs font-black text-text-secondary uppercase tracking-widest ml-1">Enter OTP</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-center tracking-[1em] font-black"
                    placeholder="000000"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 disabled:opacity-50">
                  {loading ? 'Verifying...' : 'Verify & Sign Up'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowOtp(false)}
                  className="w-full text-xs font-bold text-text-secondary hover:text-primary transition-colors"
                >
                  Change Phone Number
                </button>
              </form>
            )}
          </div>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-text-secondary font-bold">Or continue with</span></div>
        </div>

        <button 
          onClick={handleGoogleSignup}
          disabled={loading}
          className="w-full bg-surface border border-border rounded-xl py-4 flex items-center justify-center space-x-3 hover:bg-background transition-all group disabled:opacity-50"
        >
          <Chrome size={20} className="text-primary group-hover:scale-110 transition-transform" />
          <span className="text-sm font-black uppercase tracking-widest">Google Account</span>
        </button>

        <p className="text-center text-text-secondary text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-bold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
