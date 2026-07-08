import api from './api'

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (email, password) => {
    const form = new URLSearchParams()
    form.append('username', email)
    form.append('password', password)
    return api.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  },
  me: () => api.get('/auth/me'),
}

export const courseService = {
  list: (filters = {}) => api.get('/courses/', { params: filters }),
  get: (id) => api.get(`/courses/${id}`),
  myCourses: () => api.get('/courses/my-courses'),
  create: (data) => api.post('/courses/', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  remove: (id) => api.delete(`/courses/${id}`),
}

export const analyticsService = {
  myCoursesAnalytics: () => api.get('/courses/my-courses/analytics'),
}

export const sectionService = {
  listForCourse: (courseId) => api.get(`/sections/course/${courseId}`),
  create: (courseId, data) => api.post(`/sections/course/${courseId}`, data),
  remove: (id) => api.delete(`/sections/${id}`),
}

export const lectureService = {
  get: (id) => api.get(`/lectures/${id}`),
  addViaUrl: (sectionId, data) => api.post(`/lectures/section/${sectionId}`, data),
  addViaUpload: (sectionId, formData) =>
    api.post(`/lectures/section/${sectionId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  remove: (id) => api.delete(`/lectures/${id}`),
}

export const enrollmentService = {
  enroll: (courseId) => api.post('/enrollments/', { course_id: courseId }),
  myEnrollments: () => api.get('/enrollments/my-enrollments'),
  completeLecture: (enrollmentId, lectureId) =>
    api.post(`/enrollments/${enrollmentId}/complete-lecture`, { lecture_id: lectureId }),
}

export const reviewService = {
  listForCourse: (courseId) => api.get(`/reviews/course/${courseId}`),
  create: (data) => api.post('/reviews/', data),
}

export const paymentService = {
  createCheckoutSession: (courseId) =>
    api.post('/payments/create-checkout-session', null, { params: { course_id: courseId } }),
}

export const aiService = {
  askQuestion: (courseId, question) => api.post('/ai/qa/ask', { course_id: courseId, question }),
  nlSearch: (query) => api.post('/ai/search/', { query }),
  generateQuiz: (lectureId, numQuestions = 5) =>
    api.post('/ai/quiz/generate', { lecture_id: lectureId, num_questions: numQuestions }),
  getQuiz: (lectureId) => api.get(`/ai/quiz/lecture/${lectureId}`),
}