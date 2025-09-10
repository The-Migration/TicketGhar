import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Clock, Users, Eye, Edit3, Trash2, Play, Pause, Square, AlertTriangle, Settings } from 'lucide-react';
import { useEvents } from '../contexts/EventContext';
import { ColorfulCard } from '../components/ui/colorful-card';
import RainbowButton from '../components/ui/rainbow-button';
import NeonText from '../components/ui/neon-text';
import LoadingSpinner from '../components/ui/loading-spinner';

const AdminEditEvent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentEvent, fetchEvent, updateEvent, deleteEvent, isLoading: contextLoading } = useEvents();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load event data when component mounts
  useEffect(() => {
    if (id) {
      fetchEvent(id);
    }
  }, [id, fetchEvent]);

  const handleStatusChange = async (newStatus: string) => {
    if (!currentEvent || !id) return;
    
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await updateEvent(id, { status: newStatus as any });
      setSuccess(`Event status updated to ${newStatus}`);
      // Refresh the event data
      await fetchEvent(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!currentEvent || !id) return;
    
    if (!window.confirm(`Are you sure you want to delete "${currentEvent.name || currentEvent.title}"? This action cannot be undone.`)) {
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await deleteEvent(id);
      navigate('/admin/events');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'sale_started': return 'text-blue-600 bg-blue-100';
      case 'sale_ended': return 'text-yellow-600 bg-yellow-100';
      case 'draft': return 'text-gray-600 bg-gray-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'completed': return 'text-purple-600 bg-purple-100';
      case 'sold_out': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="w-4 h-4" />;
      case 'sale_started': return <Play className="w-4 h-4" />;
      case 'sale_ended': return <Pause className="w-4 h-4" />;
      case 'draft': return <Edit3 className="w-4 h-4" />;
      case 'cancelled': return <Square className="w-4 h-4" />;
      case 'completed': return <Square className="w-4 h-4" />;
      case 'sold_out': return <AlertTriangle className="w-4 h-4" />;
      default: return <Pause className="w-4 h-4" />;
    }
  };

  if (contextLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-vibrant-purple-50 via-vibrant-blue-50 to-vibrant-pink-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!currentEvent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-vibrant-purple-50 via-vibrant-blue-50 to-vibrant-pink-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h2>
          <p className="text-gray-600 mb-4">The event you're looking for doesn't exist.</p>
          <RainbowButton onClick={() => navigate('/admin/events')} variant="rainbow">
            Back to Events
          </RainbowButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-vibrant-purple-50 via-vibrant-blue-50 to-vibrant-pink-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/admin/events')}
                className="mr-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <NeonText 
                  className="text-4xl font-bold" 
                  color="purple" 
                >
                  Event Management
                </NeonText>
                <p className="text-gray-600 text-lg mt-2">
                  {currentEvent.name || currentEvent.title}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${getStatusColor(currentEvent.status)}`}>
                {getStatusIcon(currentEvent.status)}
                <span className="ml-2 capitalize">{currentEvent.status}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <ColorfulCard className="p-6" colorScheme="blue" variant="glass">
              <div className="flex items-center mb-6">
                <Calendar className="w-6 h-6 text-vibrant-blue-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Event Details</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                  <p className="text-lg font-semibold text-gray-900">{currentEvent.name || currentEvent.title}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <p className="text-gray-900">{currentEvent.category}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-gray-900">{currentEvent.description}</p>
                </div>
              </div>
            </ColorfulCard>

            {/* Venue & Location */}
            <ColorfulCard className="p-6" colorScheme="emerald" variant="glass">
              <div className="flex items-center mb-6">
                <MapPin className="w-6 h-6 text-emerald-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Venue & Location</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                  <p className="text-gray-900">{currentEvent.venue}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <p className="text-gray-900">{currentEvent.address || currentEvent.location}</p>
                </div>
              </div>
            </ColorfulCard>

            {/* Date & Time */}
            <ColorfulCard className="p-6" colorScheme="orange" variant="glass">
              <div className="flex items-center mb-6">
                <Clock className="w-6 h-6 text-orange-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Date & Time</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time</label>
                  <p className="text-gray-900">
                    {new Date(currentEvent.startDate || currentEvent.date || '').toLocaleString()}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time</label>
                  <p className="text-gray-900">
                    {new Date(currentEvent.endDate).toLocaleString()}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                  <p className="text-gray-900">{currentEvent.timezone}</p>
                </div>
              </div>
            </ColorfulCard>

            {/* Ticket Information */}
            <ColorfulCard className="p-6" colorScheme="purple" variant="glass">
              <div className="flex items-center mb-6">
                <Users className="w-6 h-6 text-purple-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Ticket Information</h2>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Tickets</label>
                    <p className="text-2xl font-bold text-gray-900">{currentEvent.totalTickets || currentEvent.maxTickets}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Available Tickets</label>
                    <p className="text-2xl font-bold text-gray-900">{currentEvent.availableTickets}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ticket Price</label>
                  <p className="text-xl font-semibold text-gray-900">
                    {currentEvent.currency} {currentEvent.ticketPrice || currentEvent.price}
                  </p>
                </div>
              </div>
            </ColorfulCard>
          </div>

          {/* Management Panel */}
          <div className="space-y-6">
            {/* Status Management */}
            <ColorfulCard className="p-6" colorScheme="cyan" variant="glass">
              <div className="flex items-center mb-6">
                <Settings className="w-6 h-6 text-cyan-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Status Management</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Change Event Status</label>
                  <div className="space-y-2">
                    {['draft', 'active', 'sale_started', 'sale_ended', 'cancelled', 'completed', 'sold_out'].map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        disabled={isLoading || currentEvent.status === status}
                        className={`w-full px-4 py-2 rounded-lg text-left transition-colors ${
                          currentEvent.status === status
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center">
                          {getStatusIcon(status)}
                          <span className="ml-2 capitalize">{status.replace('_', ' ')}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </ColorfulCard>

            {/* Quick Actions */}
            <ColorfulCard className="p-6" colorScheme="pink" variant="glass">
              <div className="flex items-center mb-6">
                <Eye className="w-6 h-6 text-pink-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Quick Actions</h2>
              </div>
              
              <div className="space-y-4">
                <RainbowButton
                  onClick={() => navigate(`/events/${currentEvent.id}`)}
                  variant="rainbow"
                  className="w-full"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Public Page
                </RainbowButton>
                
                <RainbowButton
                  onClick={() => navigate('/admin/events/new')}
                  variant="rainbow"
                  className="w-full"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Create Similar Event
                </RainbowButton>
                
                <button
                  onClick={handleDeleteEvent}
                  disabled={isLoading}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Event
                </button>
              </div>
            </ColorfulCard>

            {/* Event Statistics */}
            <ColorfulCard className="p-6" colorScheme="emerald" variant="glass">
              <div className="flex items-center mb-6">
                <Users className="w-6 h-6 text-emerald-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Statistics</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tickets Sold</span>
                  <span className="font-semibold">
                    {(currentEvent.totalTickets || currentEvent.maxTickets || 0) - currentEvent.availableTickets}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Revenue</span>
                  <span className="font-semibold">
                    {currentEvent.currency} {((currentEvent.totalTickets || currentEvent.maxTickets || 0) - currentEvent.availableTickets) * parseFloat(currentEvent.ticketPrice || currentEvent.price?.toString() || '0')}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Created</span>
                  <span className="font-semibold">
                    {new Date(currentEvent.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </ColorfulCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminEditEvent;
