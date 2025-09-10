import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ColorfulCard } from '../components/ui/colorful-card';
import RainbowButton from '../components/ui/rainbow-button';
import NeonText from '../components/ui/neon-text';
import ColorfulBackground from '../components/ui/colorful-background';
import { LogIn, UserPlus, Calendar } from 'lucide-react';

const LandingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  return (
    <ColorfulBackground variant="rainbow">
      <div className="min-h-screen relative overflow-hidden">
      
      {/* Header */}
      <header className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Calendar className="w-8 h-8 text-vibrant-purple-500" />
            <NeonText className="text-2xl font-bold">TicketGhar</NeonText>
          </div>
          <div className="hidden md:flex space-x-6">
            <Link to="/home/events" className="text-gray-800 hover:text-vibrant-purple-600 transition-colors font-medium">
              Browse Events
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-120px)] px-4 py-12">
        <div className="w-full max-w-6xl">
          <div className="text-center mb-12">
            <NeonText className="text-5xl md:text-7xl font-bold mb-6">
              Welcome to TicketGhar
            </NeonText>
            <p className="text-xl md:text-2xl text-gray-800 font-medium mb-8 max-w-3xl mx-auto">
              Your gateway to amazing events. Discover, book, and enjoy the best experiences in your city.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Login Card */}
            <ColorfulCard 
              className={`p-8 transition-all duration-500 hover:scale-105 hover:shadow-2xl border-2 border-white/20 backdrop-blur-lg bg-white/10 animate-in fade-in-0 slide-in-from-left-4`}
              colorScheme="purple"
              variant="glass"
            >
              <CardHeader className="text-center pb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-vibrant-purple-400 to-vibrant-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-vibrant-purple-500/25">
                  <LogIn className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-800">Welcome Back</CardTitle>
                <CardDescription className="text-gray-700 font-medium">
                  Sign in to access your dashboard and manage your tickets
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <Link to="/login">
                      <RainbowButton className="w-full py-4 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300">
                        Sign In
                      </RainbowButton>
                    </Link>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-gray-700 text-sm font-medium">
                    Don't have an account?{' '}
                    <button 
                      onClick={() => setActiveTab('register')}
                      className="text-vibrant-purple-600 hover:text-vibrant-purple-700 font-semibold underline"
                    >
                      Create one here
                    </button>
                  </p>
                </div>
              </CardContent>
            </ColorfulCard>

            {/* Register Card */}
            <ColorfulCard 
              className={`p-8 transition-all duration-500 hover:scale-105 hover:shadow-2xl border-2 border-white/20 backdrop-blur-lg bg-white/10 animate-in fade-in-0 slide-in-from-right-4`}
              colorScheme="blue"
              variant="glass"
            >
              <CardHeader className="text-center pb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-vibrant-blue-400 to-vibrant-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-vibrant-blue-500/25">
                  <UserPlus className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-800">Join TicketGhar</CardTitle>
                <CardDescription className="text-gray-700 font-medium">
                  Create your account and start discovering amazing events
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-gray-800 font-semibold mb-4">Get Started</p>
                    <Link to="/register">
                      <RainbowButton className="w-full py-4 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300">
                        Create Account
                      </RainbowButton>
                    </Link>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-gray-700 text-sm font-medium">
                    Already have an account?{' '}
                    <button 
                      onClick={() => setActiveTab('login')}
                      className="text-vibrant-blue-600 hover:text-vibrant-blue-700 font-semibold underline"
                    >
                      Sign in here
                    </button>
                  </p>
                </div>
              </CardContent>
            </ColorfulCard>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-6 text-center">
        <p className="text-gray-600 font-medium">
          © 2024 TicketGhar. All rights reserved.
        </p>
      </footer>
      </div>
    </ColorfulBackground>
  );
};

export default LandingPage;
