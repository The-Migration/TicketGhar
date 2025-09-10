import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvents } from '../contexts/EventContext';
import { 
  Calendar, 
  MapPin, 
  DollarSign, 
  Users, 
  Clock, 
  Image, 
  Tag,
  Save,
  ArrowLeft,
  Plus,
  Trash2
} from 'lucide-react';
import { ColorfulCard } from '../components/ui/colorful-card';
import RainbowButton from '../components/ui/rainbow-button';
import NeonText from '../components/ui/neon-text';
import InputWithIcon from '../components/ui/input-with-icon';
import LoadingSpinner from '../components/ui/loading-spinner';

interface TicketType {
  id: string;
  name: string;
  description: string;
  price: number;
  available: number;
  maxPerUser: number;
}

const AdminCreateEvent: React.FC = () => {
  const navigate = useNavigate();
  const { createEvent, fetchEvents } = useEvents();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    venue: '',
    address: '',
    startDate: '',
    endDate: '',
    ticketSaleStartTime: '',
    ticketSaleEndTime: '',
    totalTickets: '',
    ticketPrice: '',
    currency: 'USD',
    timezone: 'America/New_York',
    maxTicketsPerUser: '',
    concurrentUsers: '',
    status: 'draft' as const,
    imageUrl: '',
    category: '',
    tags: [] as string[],
    refundDeadline: '',
    refundPolicy: '',
    refundTerms: ''
  });

  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([
    {
      id: '1',
      name: 'General Admission',
      description: 'Standard access to the event',
      price: 0,
      available: 0,
      maxPerUser: 4
    }
  ]);

  const [newTag, setNewTag] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTicketTypeChange = (index: number, field: keyof TicketType, value: string | number) => {
    setTicketTypes(prev => prev.map((ticket, i) => 
      i === index ? { ...ticket, [field]: value } : ticket
    ));
  };

  const handleAddTicketType = () => {
    setTicketTypes(prev => [...prev, {
      id: Date.now().toString(),
      name: '',
      description: '',
      price: 0,
      available: 0,
      maxPerUser: 4
    }]);
  };

  const handleRemoveTicketType = (index: number) => {
    if (ticketTypes.length > 1) {
      setTicketTypes(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const eventData = {
        title: formData.name,
        description: formData.description,
        venue: formData.venue,
        address: formData.address,
        startDate: formData.startDate,
        endDate: formData.endDate,
        timezone: formData.timezone,
        coverImageUrl: formData.imageUrl,
        category: formData.category,
        tags: formData.tags.length > 0 ? formData.tags : [],
        currency: formData.currency,
        concurrentUsers: parseInt(formData.concurrentUsers) || 1,
        refundDeadline: formData.refundDeadline,
        refundPolicy: formData.refundPolicy,
        refundTerms: formData.refundTerms,
        ticketTypes: ticketTypes.map(ticket => ({
          name: ticket.name,
          description: ticket.description,
          price: ticket.price,
          quantityTotal: ticket.available,
          maxPerUser: ticket.maxPerUser,
          saleStartTime: formData.ticketSaleStartTime,
          saleEndTime: formData.ticketSaleEndTime
        }))
      };

      await createEvent(eventData);
      await fetchEvents(); // Refresh the events list
      navigate('/admin/events');
    } catch (err) {
      console.error('Event creation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-vibrant-purple-50 via-vibrant-blue-50 to-vibrant-pink-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <button
              onClick={() => navigate('/admin/events')}
              className="mr-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <NeonText 
              className="text-4xl font-bold" 
              color="purple" 
            >
              Create New Event
            </NeonText>
          </div>
          <p className="text-gray-600 text-lg">
            Create a new event and start selling tickets
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <ColorfulCard className="p-6" colorScheme="blue" variant="glass">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Calendar className="w-6 h-6 mr-2 text-vibrant-blue-600" />
              Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputWithIcon
                id="name"
                name="name"
                type="text"
                placeholder="Event Name"
                icon={<Calendar className="h-4 w-4 text-vibrant-blue-500" />}
                value={formData.name}
                onChange={handleInputChange}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-vibrant-blue-500"
                  required
                >
                  <option value="">Select Category</option>
                  <option value="Music">Music</option>
                  <option value="Sports">Sports</option>
                  <option value="Technology">Technology</option>
                  <option value="Art">Art</option>
                  <option value="Comedy">Comedy</option>
                  <option value="Education">Education</option>
                  <option value="Business">Business</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-vibrant-blue-500"
                  placeholder="Describe your event..."
                  required
                />
              </div>
            </div>
          </ColorfulCard>

          {/* Venue & Location */}
          <ColorfulCard className="p-6" colorScheme="emerald" variant="glass">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <MapPin className="w-6 h-6 mr-2 text-vibrant-emerald-600" />
              Venue & Location
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputWithIcon
                id="venue"
                name="venue"
                type="text"
                placeholder="Venue Name"
                icon={<MapPin className="h-4 w-4 text-vibrant-emerald-500" />}
                value={formData.venue}
                onChange={handleInputChange}
                required
              />

              <InputWithIcon
                id="address"
                name="address"
                type="text"
                placeholder="Full Address"
                icon={<MapPin className="h-4 w-4 text-vibrant-emerald-500" />}
                value={formData.address}
                onChange={handleInputChange}
                required
              />
            </div>
          </ColorfulCard>

          {/* Date & Time */}
          <ColorfulCard className="p-6" colorScheme="orange" variant="glass">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Clock className="w-6 h-6 mr-2 text-vibrant-orange-600" />
              Date & Time
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Event Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🎭 Event Start Date & Time
                </label>
                <p className="text-xs text-gray-500 mb-2">When your event actually begins</p>
                <InputWithIcon
                  id="startDate"
                  name="startDate"
                  type="datetime-local"
                  placeholder="Event Start Date"
                  icon={<Clock className="h-4 w-4 text-vibrant-orange-500" />}
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Event End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🏁 Event End Date & Time
                </label>
                <p className="text-xs text-gray-500 mb-2">When your event actually ends</p>
                <InputWithIcon
                  id="endDate"
                  name="endDate"
                  type="datetime-local"
                  placeholder="Event End Date"
                  icon={<Clock className="h-4 w-4 text-vibrant-orange-500" />}
                  value={formData.endDate}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Ticket Sale Start */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🎫 Ticket Sales Start
                </label>
                <p className="text-xs text-gray-500 mb-2">When people can start buying tickets</p>
                <InputWithIcon
                  id="ticketSaleStartTime"
                  name="ticketSaleStartTime"
                  type="datetime-local"
                  placeholder="Ticket Sale Start"
                  icon={<Clock className="h-4 w-4 text-vibrant-orange-500" />}
                  value={formData.ticketSaleStartTime}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Ticket Sale End */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🚫 Ticket Sales End
                </label>
                <p className="text-xs text-gray-500 mb-2">When ticket sales stop (usually before event starts)</p>
                <InputWithIcon
                  id="ticketSaleEndTime"
                  name="ticketSaleEndTime"
                  type="datetime-local"
                  placeholder="Ticket Sale End"
                  icon={<Clock className="h-4 w-4 text-vibrant-orange-500" />}
                  value={formData.ticketSaleEndTime}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
          </ColorfulCard>

          {/* Event Settings */}
          <ColorfulCard className="p-6" colorScheme="cyan" variant="glass">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Users className="w-6 h-6 mr-2 text-cyan-600" />
              Event Settings
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  💰 Currency
                </label>
                <p className="text-xs text-gray-500 mb-2">Currency for ticket pricing</p>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="PKR">PKR - Pakistani Rupee</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  👥 Concurrent Users
                </label>
                <p className="text-xs text-gray-500 mb-2">Number of users who can buy tickets simultaneously from the queue</p>
                <InputWithIcon
                  id="concurrentUsers"
                  name="concurrentUsers"
                  type="number"
                  placeholder="1"
                  icon={<Users className="h-4 w-4 text-cyan-500" />}
                  value={formData.concurrentUsers}
                  onChange={handleInputChange}
                  min="1"
                  max="100"
                  required
                />
              </div>
            </div>
          </ColorfulCard>

          {/* Ticket Types */}
          <ColorfulCard className="p-6" colorScheme="purple" variant="glass">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Tag className="w-6 h-6 mr-2 text-vibrant-purple-600" />
                Ticket Types
              </h2>
              <button
                type="button"
                onClick={handleAddTicketType}
                className="flex items-center px-4 py-2 bg-vibrant-purple-600 text-white rounded-md hover:bg-vibrant-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Ticket Type
              </button>
            </div>
            
            <div className="space-y-6">
              {ticketTypes.map((ticket, index) => (
                <div key={ticket.id} className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Ticket Type {index + 1}
                    </h3>
                    {ticketTypes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTicketType(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputWithIcon
                      id={`ticket-name-${index}`}
                      type="text"
                      placeholder="Ticket Name"
                      icon={<Tag className="h-4 w-4 text-vibrant-purple-500" />}
                      value={ticket.name}
                      onChange={(e) => handleTicketTypeChange(index, 'name', e.target.value)}
                      required
                    />

                    <InputWithIcon
                      id={`ticket-price-${index}`}
                      type="number"
                      placeholder="Price"
                      icon={<DollarSign className="h-4 w-4 text-vibrant-purple-500" />}
                      value={ticket.price}
                      onChange={(e) => handleTicketTypeChange(index, 'price', parseFloat(e.target.value) || 0)}
                      required
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🎫 Available Tickets
                      </label>
                      <p className="text-xs text-gray-500 mb-2">Total number of tickets available for this type</p>
                      <InputWithIcon
                        id={`ticket-available-${index}`}
                        type="number"
                        placeholder="Available Tickets"
                        icon={<Users className="h-4 w-4 text-vibrant-purple-500" />}
                        value={ticket.available}
                        onChange={(e) => handleTicketTypeChange(index, 'available', parseInt(e.target.value) || 0)}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        👤 Max Per User
                      </label>
                      <p className="text-xs text-gray-500 mb-2">Maximum tickets one person can buy</p>
                      <InputWithIcon
                        id={`ticket-max-${index}`}
                        type="number"
                        placeholder="Max Per User"
                        icon={<Users className="h-4 w-4 text-vibrant-purple-500" />}
                        value={ticket.maxPerUser}
                        onChange={(e) => handleTicketTypeChange(index, 'maxPerUser', parseInt(e.target.value) || 0)}
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={ticket.description}
                        onChange={(e) => handleTicketTypeChange(index, 'description', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-vibrant-purple-500"
                        placeholder="Describe this ticket type..."
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ColorfulCard>

          {/* Tags */}
          <ColorfulCard className="p-6" colorScheme="cyan" variant="glass">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Tag className="w-6 h-6 mr-2 text-vibrant-cyan-600" />
              Tags
            </h2>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-vibrant-cyan-500"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-vibrant-cyan-600 text-white rounded-md hover:bg-vibrant-cyan-700 transition-colors"
                >
                  Add
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-vibrant-cyan-100 text-vibrant-cyan-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-2 text-vibrant-cyan-600 hover:text-vibrant-cyan-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </ColorfulCard>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Draft Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Draft Status
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>Events are created as <strong>Draft</strong> by default. After creating the event, you can edit it to change the status to <strong>Active</strong> when ready to publish.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/admin/events')}
              className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <RainbowButton
              type="submit"
              disabled={isLoading}
              variant="rainbow"
              size="lg"
              animated
            >
              {isLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Create Event
                </>
              )}
            </RainbowButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminCreateEvent;
