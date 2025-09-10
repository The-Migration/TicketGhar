import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Clock, 
  Play, 
  Pause, 
  Settings,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Timer,
  UserCheck,
  UserX,
  BarChart3,
  Filter
} from 'lucide-react';
import { ColorfulCard } from '../components/ui/colorful-card';
import RainbowButton from '../components/ui/rainbow-button';
import NeonText from '../components/ui/neon-text';

interface QueueEntry {
  id: string;
  userId: string;
  eventId: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  event?: {
    title: string;
    date: string;
    venue: string;
  };
  position: number;
  status: 'waiting' | 'active' | 'completed' | 'expired' | 'cancelled';
  joinedAt: string;
  startedAt?: string;
  expiresAt?: string;
  completedAt?: string;
  sessionId?: string;
}

interface QueueSettings {
  maxConcurrentUsers: number;
  sessionDuration: number; // in minutes
  queueEnabled: boolean;
  autoStart: boolean;
}

const AdminQueue: React.FC = () => {
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [queueSettings, setQueueSettings] = useState<QueueSettings>({
    maxConcurrentUsers: 50,
    sessionDuration: 8,
    queueEnabled: true,
    autoStart: true
  });

  // Mock data - in real app, this would come from API
  useEffect(() => {
    const mockQueueEntries: QueueEntry[] = [
      {
        id: '1',
        userId: '2',
        eventId: '1',
        user: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com'
        },
        event: {
          title: 'Summer Music Festival 2024',
          date: '2024-07-15T18:00:00.000Z',
          venue: 'Central Park'
        },
        position: 1,
        status: 'active',
        joinedAt: '2025-09-07T10:00:00.000Z',
        startedAt: '2025-09-07T10:05:00.000Z',
        expiresAt: '2025-09-07T10:13:00.000Z',
        sessionId: 'sess_123456'
      },
      {
        id: '2',
        userId: '3',
        eventId: '1',
        user: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com'
        },
        event: {
          title: 'Summer Music Festival 2024',
          date: '2024-07-15T18:00:00.000Z',
          venue: 'Central Park'
        },
        position: 2,
        status: 'active',
        joinedAt: '2025-09-07T10:01:00.000Z',
        startedAt: '2025-09-07T10:05:00.000Z',
        expiresAt: '2025-09-07T10:13:00.000Z',
        sessionId: 'sess_123457'
      },
      {
        id: '3',
        userId: '4',
        eventId: '1',
        user: {
          firstName: 'Bob',
          lastName: 'Wilson',
          email: 'bob.wilson@example.com'
        },
        event: {
          title: 'Summer Music Festival 2024',
          date: '2024-07-15T18:00:00.000Z',
          venue: 'Central Park'
        },
        position: 3,
        status: 'waiting',
        joinedAt: '2025-09-07T10:02:00.000Z'
      },
      {
        id: '4',
        userId: '5',
        eventId: '1',
        user: {
          firstName: 'Alice',
          lastName: 'Johnson',
          email: 'alice.johnson@example.com'
        },
        event: {
          title: 'Summer Music Festival 2024',
          date: '2024-07-15T18:00:00.000Z',
          venue: 'Central Park'
        },
        position: 4,
        status: 'waiting',
        joinedAt: '2025-09-07T10:03:00.000Z'
      },
      {
        id: '5',
        userId: '6',
        eventId: '1',
        user: {
          firstName: 'Charlie',
          lastName: 'Brown',
          email: 'charlie.brown@example.com'
        },
        event: {
          title: 'Summer Music Festival 2024',
          date: '2024-07-15T18:00:00.000Z',
          venue: 'Central Park'
        },
        position: 5,
        status: 'completed',
        joinedAt: '2025-09-07T09:55:00.000Z',
        startedAt: '2025-09-07T09:57:00.000Z',
        completedAt: '2025-09-07T10:05:00.000Z',
        sessionId: 'sess_123455'
      }
    ];

    setTimeout(() => {
      setQueueEntries(mockQueueEntries);
      setIsLoading(false);
    }, 1000);
  }, []);

  const filteredEntries = queueEntries.filter(entry => {
    const matchesEvent = selectedEvent === 'all' || entry.eventId === selectedEvent;
    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
    return matchesEvent && matchesStatus;
  });

  const handleStartQueue = () => {
    // Start the queue system
    console.log('Starting queue system...');
  };

  const handlePauseQueue = () => {
    // Pause the queue system
    console.log('Pausing queue system...');
  };

  const handleAdvanceQueue = () => {
    // Manually advance the queue
    console.log('Advancing queue...');
  };

  const handleRemoveUser = (entryId: string) => {
    setQueueEntries(prev => prev.filter(entry => entry.id !== entryId));
  };

  const handleExtendSession = (entryId: string) => {
    // Extend user's session time
    console.log('Extending session for:', entryId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'waiting': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <UserCheck className="w-4 h-4" />;
      case 'waiting': return <Clock className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'expired': return <UserX className="w-4 h-4" />;
      case 'cancelled': return <UserX className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getTimeRemaining = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const stats = {
    total: queueEntries.length,
    active: queueEntries.filter(e => e.status === 'active').length,
    waiting: queueEntries.filter(e => e.status === 'waiting').length,
    completed: queueEntries.filter(e => e.status === 'completed').length,
    expired: queueEntries.filter(e => e.status === 'expired').length,
    averageWaitTime: 0, // Would calculate from actual data
    completionRate: 0 // Would calculate from actual data
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-vibrant-purple-50 via-vibrant-blue-50 to-vibrant-pink-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <NeonText 
            className="text-4xl font-bold mb-2" 
            color="purple" 
          >
            Queue Management
          </NeonText>
          <p className="text-gray-600 text-lg">
            Manage ticket purchase queues and concurrent user sessions
          </p>
        </div>

        {/* Queue Controls */}
        <div className="mb-8">
          <ColorfulCard className="p-6" colorScheme="blue" variant="glass">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <RainbowButton 
                  variant="rainbow" 
                  size="lg"
                  onClick={handleStartQueue}
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Queue
                </RainbowButton>
                <RainbowButton 
                  variant="aurora" 
                  size="lg"
                  onClick={handlePauseQueue}
                >
                  <Pause className="w-5 h-5 mr-2" />
                  Pause Queue
                </RainbowButton>
                <RainbowButton 
                  variant="sunset" 
                  size="lg"
                  onClick={handleAdvanceQueue}
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Advance Queue
                </RainbowButton>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Max Concurrent</p>
                  <p className="text-2xl font-bold text-gray-900">{queueSettings.maxConcurrentUsers}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Session Duration</p>
                  <p className="text-2xl font-bold text-gray-900">{queueSettings.sessionDuration}m</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Queue Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    queueSettings.queueEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {queueSettings.queueEnabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </ColorfulCard>
        </div>

        {/* Queue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <ColorfulCard className="p-6" colorScheme="blue" variant="glass">
            <div className="text-center">
              <Users className="w-8 h-8 text-vibrant-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">Total in Queue</p>
            </div>
          </ColorfulCard>

          <ColorfulCard className="p-6" colorScheme="emerald" variant="glass">
            <div className="text-center">
              <UserCheck className="w-8 h-8 text-vibrant-emerald-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              <p className="text-sm text-gray-600">Active Sessions</p>
            </div>
          </ColorfulCard>

          <ColorfulCard className="p-6" colorScheme="orange" variant="glass">
            <div className="text-center">
              <Clock className="w-8 h-8 text-vibrant-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.waiting}</p>
              <p className="text-sm text-gray-600">Waiting</p>
            </div>
          </ColorfulCard>

          <ColorfulCard className="p-6" colorScheme="purple" variant="glass">
            <div className="text-center">
              <CheckCircle className="w-8 h-8 text-vibrant-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
          </ColorfulCard>

          <ColorfulCard className="p-6" colorScheme="pink" variant="glass">
            <div className="text-center">
              <UserX className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.expired}</p>
              <p className="text-sm text-gray-600">Expired</p>
            </div>
          </ColorfulCard>

          <ColorfulCard className="p-6" colorScheme="cyan" variant="glass">
            <div className="text-center">
              <Timer className="w-8 h-8 text-vibrant-cyan-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.averageWaitTime}m</p>
              <p className="text-sm text-gray-600">Avg Wait Time</p>
            </div>
          </ColorfulCard>
        </div>

        {/* Filters */}
        <ColorfulCard className="p-6 mb-8" colorScheme="blue" variant="glass">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event
              </label>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-vibrant-blue-500"
              >
                <option value="all">All Events</option>
                <option value="1">Summer Music Festival 2024</option>
                <option value="2">Tech Conference 2024</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-vibrant-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="waiting">Waiting</option>
                <option value="completed">Completed</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex items-end">
              <RainbowButton 
                variant="rainbow" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  setSelectedEvent('all');
                  setStatusFilter('all');
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset Filters
              </RainbowButton>
            </div>
          </div>
        </ColorfulCard>

        {/* Queue Entries */}
        <ColorfulCard className="p-6" colorScheme="emerald" variant="glass">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Queue Entries ({filteredEntries.length})
            </h2>
            <div className="flex items-center space-x-2">
              <RainbowButton variant="aurora" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Queue Settings
              </RainbowButton>
              <RainbowButton variant="sunset" size="sm">
                <BarChart3 className="w-4 h-4 mr-2" />
                Queue Analytics
              </RainbowButton>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vibrant-emerald-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading queue entries...</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No queue entries found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            entry.status === 'active' 
                              ? 'bg-green-100 text-green-800'
                              : entry.status === 'waiting'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {entry.position}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-vibrant-purple-100 flex items-center justify-center">
                              <span className="text-xs font-medium text-vibrant-purple-600">
                                {entry.user?.firstName[0]}{entry.user?.lastName[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {entry.user?.firstName} {entry.user?.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {entry.user?.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {entry.event?.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {entry.event?.venue}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(entry.event?.date || '').toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(entry.status)}
                          <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(entry.status)}`}>
                            {entry.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          <div>Joined: {new Date(entry.joinedAt).toLocaleTimeString()}</div>
                          {entry.startedAt && (
                            <div>Started: {new Date(entry.startedAt).toLocaleTimeString()}</div>
                          )}
                          {entry.expiresAt && entry.status === 'active' && (
                            <div className="flex items-center text-orange-600">
                              <Timer className="w-3 h-3 mr-1" />
                              {getTimeRemaining(entry.expiresAt)}
                            </div>
                          )}
                          {entry.completedAt && (
                            <div>Completed: {new Date(entry.completedAt).toLocaleTimeString()}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => console.log('View details:', entry.id)}
                            className="text-vibrant-blue-600 hover:text-vibrant-blue-900 p-1"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {entry.status === 'active' && (
                            <button
                              onClick={() => handleExtendSession(entry.id)}
                              className="text-green-600 hover:text-green-900 p-1"
                              title="Extend Session"
                            >
                              <Timer className="w-4 h-4" />
                            </button>
                          )}
                          {(entry.status === 'waiting' || entry.status === 'active') && (
                            <button
                              onClick={() => handleRemoveUser(entry.id)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Remove from Queue"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ColorfulCard>
      </div>
    </div>
  );
};

export default AdminQueue;
