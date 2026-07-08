import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'

import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import CourseList from './pages/CourseList'
import CourseDetail from './pages/CourseDetail'
import MyLearning from './pages/MyLearning'
import LearnCourse from './pages/LearnCourse'
import InstructorDashboard from './pages/InstructorDashboard'
import InstructorAnalytics from './pages/InstructorAnalytics'
import NewCourse from './pages/NewCourse'
import ManageCourse from './pages/ManageCourse'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentCancelled from './pages/PaymentCancelled'

export default function App() {
  return (
    <div className="min-h-screen bg-paper font-body">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/courses" element={<CourseList />} />
        <Route path="/courses/:courseId" element={<CourseDetail />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-cancelled" element={<PaymentCancelled />} />

        <Route
          path="/my-learning"
          element={
            <ProtectedRoute requiredRole="student">
              <MyLearning />
            </ProtectedRoute>
          }
        />
        <Route
          path="/learn/:courseId"
          element={
            <ProtectedRoute>
              <LearnCourse />
            </ProtectedRoute>
          }
        />

        <Route
          path="/instructor/dashboard"
          element={
            <ProtectedRoute requiredRole="instructor">
              <InstructorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/analytics"
          element={
            <ProtectedRoute requiredRole="instructor">
              <InstructorAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/courses/new"
          element={
            <ProtectedRoute requiredRole="instructor">
              <NewCourse />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/courses/:courseId/manage"
          element={
            <ProtectedRoute requiredRole="instructor">
              <ManageCourse />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  )
}