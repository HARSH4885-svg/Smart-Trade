import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogIn, Mail, Phone, Chrome } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
  const [method, setMethod] = useState('email'); // 'email' or 'phone'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login, signInWithGoogle, sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } else {
      toast.error(result.message);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const result = await signInWithGoogle();
    setLoading(false);
    if (result.success) {
      toast.success('Signed in with Google');
      navigate(from, { replace: true });
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
    const result = await sendOtp(phoneNumber, 'recaptcha-container');
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
      navigate(from, { replace: true });
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div id="recaptcha-container"></div>
      <div className="card w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
            <LogIn size={32} />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
          <p className="text-text-secondary mt-2">Choose your preferred login method</p>
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
          <form className="space-y-6" onSubmit={handleEmailLogin}>
            <div className="space-y-2">
              <label className="text-xs font-black text-text-secondary uppercase tracking-widest ml-1">Email Address</label>
              <input
                type="email"
                required
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-text-secondary uppercase tracking-widest ml-1">Password</label>
              <input
                type="password"
                required
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 disabled:opacity-50">
              {loading ? 'Signing In...' : 'Sign In with Email'}
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
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
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
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-surface border border-border rounded-xl py-4 flex items-center justify-center space-x-3 hover:bg-background transition-all group disabled:opacity-50"
        >
          <Chrome size={20} className="text-primary group-hover:scale-110 transition-transform" />
          <span className="text-sm font-black uppercase tracking-widest">Google Account</span>
        </button>

        <p className="text-center text-text-secondary text-sm">
          Don't have an account?{' '}
          <Link to="/signup" className="text-primary font-bold hover:underline">
            Create one now
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
