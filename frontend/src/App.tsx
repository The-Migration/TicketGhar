import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { EventProvider } from './contexts/EventContext';
import { OrderProvider } from './contexts/OrderContext';
import { QueueProvider } from './contexts/QueueContext';
import { PurchaseProvider } from './contexts/PurchaseContext';

// Layout Components
import Layout from './components/Layout/Layout';
import AdminLayout from './components/Layout/AdminLayout';

// Page Components
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import EventsPage from './pages/EventsPage';
import EventDetailsPage from './pages/EventDetailsPage';
import EventDetailsPageNew from './pages/EventDetailsPageNew';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminEvents from './pages/AdminEvents';
import AdminCreateEvent from './pages/AdminCreateEvent';
import AdminEditEvent from './pages/AdminEditEvent';
import AdminUsers from './pages/AdminUsers';
import AdminOrders from './pages/AdminOrders';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminQueue from './pages/AdminQueue';
import OrderTicketsPage from './pages/OrderTicketsPage';
import TicketDetailPage from './pages/TicketDetailPage';
import PurchasePage from './pages/PurchasePage';
import QueuePage from './pages/QueuePage';
import QueueStatusPage from './pages/QueueStatusPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import MyTicketsPage from './pages/MyTicketsPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

// Protected Route Component
import ProtectedRoute from './components/Auth/ProtectedRoute';
import AdminRoute from './components/Auth/AdminRoute';
import RedirectHandler from './components/Auth/RedirectHandler';

function App() {
  return (
    <AuthProvider>
      <EventProvider>
        <OrderProvider>
          <QueueProvider>
            <PurchaseProvider>
              <Router>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={
                    <RedirectHandler>
                      <LandingPage />
                    </RedirectHandler>
                  } />
                  <Route path="/home" element={<Layout />}>
                    <Route index element={<HomePage />} />
                    <Route path="events" element={<EventsPage />} />
                    <Route path="events/:id" element={<EventDetailsPageNew />} />
                    <Route path="queue/:eventId" element={<QueuePage />} />
                  </Route>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  
                  {/* Direct Events Route */}
                  <Route path="/events" element={<Layout />}>
                    <Route index element={<EventsPage />} />
                    <Route path=":id" element={<EventDetailsPageNew />} />
                  </Route>

                  {/* Queue and Checkout Routes */}
                  <Route path="/queue/:eventId" element={<Layout />}>
                    <Route index element={
                      <ProtectedRoute>
                        <QueueStatusPage />
                      </ProtectedRoute>
                    } />
                  </Route>
                  <Route path="/checkout/:eventId" element={<Layout />}>
                    <Route index element={
                      <ProtectedRoute>
                        <CheckoutPage />
                      </ProtectedRoute>
                    } />
                  </Route>
                  <Route path="/order-confirmation/:eventId" element={<Layout />}>
                    <Route index element={
                      <ProtectedRoute>
                        <OrderConfirmationPage />
                      </ProtectedRoute>
                    } />
                  </Route>
                  <Route path="/ticket/:id" element={
                    <ProtectedRoute>
                      <TicketDetailPage />
                    </ProtectedRoute>
                  } />

                  {/* User Protected Routes */}
                  <Route path="/user" element={<Layout />}>
                    <Route path="dashboard" element={
                      <ProtectedRoute>
                        <UserDashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="profile" element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    } />
                    <Route path="tickets" element={
                      <ProtectedRoute>
                        <MyTicketsPage />
                      </ProtectedRoute>
                    } />
                    <Route path="orders/:id" element={
                      <ProtectedRoute>
                        <OrderTicketsPage />
                      </ProtectedRoute>
                    } />
                    <Route path="purchase/:sessionId" element={
                      <ProtectedRoute>
                        <PurchasePage />
                      </ProtectedRoute>
                    } />
                  </Route>

                  {/* Admin Routes */}
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={
                      <AdminRoute>
                        <AdminDashboard />
                      </AdminRoute>
                    } />
                    <Route path="events" element={
                      <AdminRoute>
                        <AdminEvents />
                      </AdminRoute>
                    } />
                    <Route path="events/new" element={
                      <AdminRoute>
                        <AdminCreateEvent />
                      </AdminRoute>
                    } />
                    <Route path="events/:id/edit" element={
                      <AdminRoute>
                        <AdminEditEvent />
                      </AdminRoute>
                    } />
                    <Route path="users" element={
                      <AdminRoute>
                        <AdminUsers />
                      </AdminRoute>
                    } />
                    <Route path="orders" element={
                      <AdminRoute>
                        <AdminOrders />
                      </AdminRoute>
                    } />
                    <Route path="analytics" element={
                      <AdminRoute>
                        <AdminAnalytics />
                      </AdminRoute>
                    } />
                    <Route path="queue" element={
                      <AdminRoute>
                        <AdminQueue />
                      </AdminRoute>
                    } />
                  </Route>

                  {/* Catch all route */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Router>
            </PurchaseProvider>
          </QueueProvider>
        </OrderProvider>
      </EventProvider>
    </AuthProvider>
  );
}

export default App;