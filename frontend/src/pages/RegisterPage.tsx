import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Separator } from '../components/ui/separator';
import ColorfulInput from '../components/ui/colorful-input';
import RainbowButton from '../components/ui/rainbow-button';
import LoadingSpinner from '../components/ui/loading-spinner';
import ColorfulBackground from '../components/ui/colorful-background';
import NeonText from '../components/ui/neon-text';
import { Mail, Lock, User, AlertCircle, Eye, EyeOff, UserPlus } from 'lucide-react';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { register, verifyEmail } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (step === 'register') {
      // Validation
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }

      setIsLoading(true);

      try {
        await register({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
        });
        // Move to OTP verification step
        setStep('verify');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Registration failed');
      } finally {
        setIsLoading(false);
      }
    } else if (step === 'verify') {
      // OTP verification
      if (!otp || otp.length !== 6) {
        setError('Please enter a valid 6-digit OTP');
        return;
      }

      setIsLoading(true);

      try {
        await verifyEmail(formData.email, otp);
        // Redirect to user dashboard after successful verification
        navigate('/user/dashboard');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'OTP verification failed');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <ColorfulBackground variant="aurora">
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center animate-fade-in">
            <div className="mx-auto h-20 w-20 bg-gradient-to-r from-vibrant-blue-500 to-vibrant-purple-500 rounded-full flex items-center justify-center mb-6 shadow-glow animate-float">
              <UserPlus className="h-10 w-10 text-white" />
            </div>
            <NeonText color="blue" size="2xl" className="mb-2 animate-slide-in">
              {step === 'register' ? 'Create your account' : 'Verify your email'}
            </NeonText>
            <p className="text-lg text-gray-600 animate-slide-in animation-delay-200">
              {step === 'register' 
                ? 'Join TicketGhar and start your journey'
                : `We've sent a 6-digit code to ${formData.email}`
              }
            </p>
          </div>
          
          {/* Registration Form */}
          <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm animate-scale-in animation-delay-300">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl text-center text-gray-900">
                {step === 'register' ? 'Sign up' : 'Enter verification code'}
              </CardTitle>
              <CardDescription className="text-center text-gray-600">
                {step === 'register' 
                  ? 'Create your account to get started'
                  : 'Check your email and enter the code below'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="flex items-center space-x-2 text-sm text-vibrant-pink-600 bg-vibrant-pink-50 p-4 rounded-lg border border-vibrant-pink-200 animate-fade-in">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                
                {step === 'register' ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <ColorfulInput
                        icon={<User className="h-4 w-4" />}
                        label="First Name"
                        name="firstName"
                        type="text"
                        placeholder="First name"
                        value={formData.firstName}
                        onChange={handleChange}
                        colorScheme="emerald"
                        required
                        className="h-12 text-base"
                      />
                      
                      <ColorfulInput
                        icon={<User className="h-4 w-4" />}
                        label="Last Name"
                        name="lastName"
                        type="text"
                        placeholder="Last name"
                        value={formData.lastName}
                        onChange={handleChange}
                        colorScheme="cyan"
                        required
                        className="h-12 text-base"
                      />
                    </div>
                    
                    <ColorfulInput
                      icon={<Mail className="h-4 w-4" />}
                      label="Email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleChange}
                      colorScheme="blue"
                      required
                      className="h-12 text-base"
                    />
                    
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                        Password
                      </Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-vibrant-orange-400" />
                        </div>
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create a password"
                          value={formData.password}
                          onChange={handleChange}
                          className="flex h-12 w-full rounded-md border-2 border-input bg-transparent px-3 py-1 pl-10 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus:border-vibrant-orange-500 focus:ring-vibrant-orange-500/20 focus:ring-2 focus:ring-offset-0"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-vibrant-orange-500 transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">
                        Confirm Password
                      </Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-vibrant-pink-400" />
                        </div>
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm your password"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          className="flex h-12 w-full rounded-md border-2 border-input bg-transparent px-3 py-1 pl-10 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus:border-vibrant-pink-500 focus:ring-vibrant-pink-500/20 focus:ring-2 focus:ring-offset-0"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-vibrant-pink-500 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="otp" className="text-sm font-semibold text-gray-700">
                        Verification Code
                      </Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-4 w-4 text-vibrant-blue-400" />
                        </div>
                        <input
                          id="otp"
                          name="otp"
                          type="text"
                          placeholder="Enter 6-digit code"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          maxLength={6}
                          className="flex h-12 w-full rounded-md border-2 border-input bg-transparent px-3 py-1 pl-10 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus:border-vibrant-blue-500 focus:ring-vibrant-blue-500/20 focus:ring-2 focus:ring-offset-0 text-center text-2xl tracking-widest"
                          required
                        />
                      </div>
                      <p className="text-sm text-gray-500 text-center">
                        Didn't receive the code? Check your spam folder or{' '}
                        <button
                          type="button"
                          className="text-vibrant-blue-600 hover:underline"
                          onClick={() => {
                            // Resend OTP logic here
                            console.log('Resend OTP');
                          }}
                        >
                          resend
                        </button>
                      </p>
                    </div>
                  </>
                )}

                {step === 'register' && (
                  <div className="flex items-center space-x-2">
                    <Checkbox id="agree-terms" required />
                    <Label htmlFor="agree-terms" className="text-sm text-gray-700">
                      I agree to the{' '}
                      <Button variant="link" className="px-0 text-sm h-auto text-vibrant-blue-600 hover:text-vibrant-blue-500">
                        Terms of Service
                      </Button>{' '}
                      and{' '}
                      <Button variant="link" className="px-0 text-sm h-auto text-vibrant-blue-600 hover:text-vibrant-blue-500">
                        Privacy Policy
                      </Button>
                    </Label>
                  </div>
                )}

                <div className="flex gap-3">
                  {step === 'verify' && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep('register')}
                      className="flex-1 h-12 border-2 border-gray-300 hover:border-gray-400"
                    >
                      Back
                    </Button>
                  )}
                  
                  <RainbowButton 
                    type="submit" 
                    variant="aurora"
                    size="lg"
                    className={`${step === 'verify' ? 'flex-1' : 'w-full'} h-12 text-lg font-semibold`}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        {step === 'register' ? 'Creating account...' : 'Verifying...'}
                      </>
                    ) : (
                      step === 'register' ? 'Create account' : 'Verify email'
                    )}
                  </RainbowButton>
                </div>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-gray-500 font-medium">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="w-full h-12 border-2 border-vibrant-blue-200 hover:border-vibrant-blue-300 hover:bg-vibrant-blue-50 transition-all duration-200"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full h-12 border-2 border-vibrant-blue-200 hover:border-vibrant-blue-300 hover:bg-vibrant-blue-50 transition-all duration-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sign in link */}
          <div className="text-center animate-fade-in animation-delay-500">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-vibrant-blue-600 hover:text-vibrant-blue-500 transition-colors duration-200 hover:underline"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </ColorfulBackground>
  );
};

export default RegisterPage;