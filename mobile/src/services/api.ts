import AsyncStorage from '@react-native-async-storage/async-storage';

// Local LAN IP connects physical Android phone (Expo Go), emulator & web directly to backend
export const API_URL = 'http://192.168.1.17:5000/api/v1';

async function request(endpoint: string, options: RequestInit = {}, token?: string | null) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  let activeToken = token;
  if (!activeToken) {
    try {
      activeToken = await AsyncStorage.getItem('@peerbridge_token');
    } catch (e) {
      // silent
    }
  }

  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }

  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });
    const data = await res.json();

    // If token expired / unauthorized, attempt auto-refresh
    if (
      res.status === 401 ||
      res.status === 403 ||
      (!data.success && typeof data.message === 'string' && data.message.toLowerCase().includes('token'))
    ) {
      const savedRefreshToken = await AsyncStorage.getItem('@peerbridge_refresh_token');
      if (savedRefreshToken && endpoint !== '/auth/refresh-token') {
        try {
          const refreshRes = await fetch(`${API_URL}/auth/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: savedRefreshToken })
          });
          const refreshData = await refreshRes.json();
          if (refreshData && refreshData.success && refreshData.data?.token) {
            await AsyncStorage.setItem('@peerbridge_token', refreshData.data.token);
            headers['Authorization'] = `Bearer ${refreshData.data.token}`;
            const retryRes = await fetch(`${API_URL}${endpoint}`, {
              ...options,
              headers
            });
            return await retryRes.json();
          }
        } catch (rfErr) {
          console.warn('Auto refresh error:', rfErr);
        }
      }
    }

    return data;
  } catch (error) {
    console.warn(`[API Error] Request failed on ${endpoint}:`, error);
    return { success: false, message: 'Network request failed. Please check your internet connection or server status.' };
  }
}

export const api = {
  // ==========================================
  // Authentication Endpoints
  // ==========================================

  // 1. Google OAuth Endpoints
  googleVerifyIntent: (idToken: string, autoRegister?: boolean) =>
    request('/auth/google/verify-intent', {
      method: 'POST',
      body: JSON.stringify({ idToken, autoRegister })
    }),

  googleCompleteRegister: (payload: {
    registrationId: string;
    name?: string;
    college: string;
    department: string;
    yearOfStudy: number;
    role: string;
    agreeTerms: boolean;
  }) =>
    request('/auth/google/complete-register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // Legacy fallback support for quick login
  googleSignIn: (payload: { idToken?: string; email?: string; name?: string; avatar?: string }) =>
    request('/auth/google/verify-intent', {
      method: 'POST',
      body: JSON.stringify({ idToken: payload.idToken })
    }),

  // 2. Email & Password Registration with OTP
  register: (payload: {
    name: string;
    email: string;
    password: string;
    confirmPassword?: string;
    agreeTerms?: boolean;
    [key: string]: any;
  }) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        confirmPassword: payload.confirmPassword || payload.password,
        agreeTerms: payload.agreeTerms !== undefined ? payload.agreeTerms : true
      })
    }),

  verifyOtp: (
    payloadOrEmail: { registrationId?: string; email: string; otpCode: string } | string,
    otpCode?: string
  ) => {
    const payload =
      typeof payloadOrEmail === 'string'
        ? { email: payloadOrEmail, otpCode: otpCode || '' }
        : payloadOrEmail;
    return request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  sendOtp: (email: string, intent: 'login' | 'register' = 'login') =>
    request('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({
        email,
        purpose: intent === 'register' ? 'email_verification' : 'password_reset'
      })
    }),

  resendOtp: (email: string, purpose: 'email_verification' | 'password_reset' = 'email_verification') =>
    request('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email, purpose })
    }),

  // 3. Email & Password Login
  login: (email: string, password: string) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  // 4. Forgot & Reset Password
  forgotPassword: (email: string) =>
    request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    }),

  verifyResetOtp: (email: string, otpCode: string) =>
    request('/auth/verify-reset-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otpCode })
    }),

  resetPassword: (payload: {
    email: string;
    resetAuthorizationToken: string;
    newPassword: string;
    confirmPassword: string;
  }) =>
    request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // 5. Session Management
  refreshToken: (refreshToken: string) =>
    request('/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    }),

  logout: (refreshToken?: string) =>
    request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    }),

  getProfile: (token: string) => request('/auth/me', {}, token),

  updateProfile: (token: string, payload: any) =>
    request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload)
    }, token),

  // ==========================================
  // PeerBridge Academic Subjects
  // ==========================================
  getSubjects: (category?: string, search?: string) => {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.append('category', category);
    if (search && search.trim()) params.append('search', search.trim());
    return request(`/subjects?${params.toString()}`);
  },

  getSubjectCategories: () => request('/subjects/categories'),

  // ==========================================
  // PeerBridge Academic Doubts & Questions
  // ==========================================
  createDoubt: (token: string, payload: {
    title: string;
    subject: string;
    topic?: string;
    question: string;
    codeSnippet?: string;
    codeLanguage?: string;
    attachments?: string[];
    videoUrl?: string;
    videoDuration?: number;
    videoThumbnail?: string;
    tags?: string[];
  }) =>
    request('/doubts', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, token),

  getDoubts: (params?: {
    subject?: string;
    status?: string;
    search?: string;
    tag?: string;
    sort?: string;
    authorId?: string;
    page?: number;
    limit?: number;
    excludeIds?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.authorId) query.append('authorId', params.authorId);
    if (params?.subject && params.subject !== 'All') query.append('subject', params.subject);
    if (params?.status && params.status !== 'All') query.append('status', params.status);
    if (params?.search && params.search.trim()) query.append('search', params.search.trim());
    if (params?.tag) query.append('tag', params.tag);
    if (params?.sort) query.append('sort', params.sort);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.excludeIds) query.append('excludeIds', params.excludeIds);
    return request(`/doubts?${query.toString()}`);
  },

  getMyDoubts: (token: string) => request('/doubts/my', {}, token),

  getDoubt: (id: string) => request(`/doubts/${id}`),

  updateDoubt: (token: string, id: string, payload: any) =>
    request(`/doubts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }, token),

  resolveDoubt: (token: string, id: string) =>
    request(`/doubts/${id}/resolve`, {
      method: 'PATCH'
    }, token),

  deleteDoubt: (token: string, id: string) =>
    request(`/doubts/${id}`, {
      method: 'DELETE'
    }, token),

  upvoteDoubt: (token: string, id: string) =>
    request(`/doubts/${id}/upvote`, {
      method: 'POST'
    }, token),

  // ==========================================
  // PeerBridge Volunteer ("I Can Help") Workflow
  // ==========================================
  volunteerForDoubt: (token: string, doubtId: string, introMessage?: string) =>
    request(`/volunteers/apply/${doubtId}`, {
      method: 'POST',
      body: JSON.stringify({ introMessage })
    }, token),

  getDoubtVolunteers: (token: string, doubtId: string) =>
    request(`/volunteers/doubt/${doubtId}`, {}, token),

  updateVolunteerStatus: (token: string, id: string, status: 'ACCEPTED' | 'DECLINED') =>
    request(`/volunteers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }, token),

  withdrawVolunteer: (token: string, id: string) =>
    request(`/volunteers/${id}`, {
      method: 'DELETE'
    }, token),

  // ==========================================
  // PeerBridge Discussion & Answers
  // ==========================================
  getAnswers: (doubtId: string) => request(`/answers/doubt/${doubtId}`),

  postAnswer: (token: string, doubtId: string, payload: {
    content: string;
    codeSnippet?: string;
    codeLanguage?: string;
  }) =>
    request(`/answers/doubt/${doubtId}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }, token),

  acceptAnswer: (token: string, answerId: string) =>
    request(`/answers/${answerId}/accept`, {
      method: 'PATCH'
    }, token),

  voteAnswerHelpful: (token: string, answerId: string) =>
    request(`/answers/${answerId}/helpful`, {
      method: 'POST'
    }, token),

  deleteAnswer: (token: string, answerId: string) =>
    request(`/answers/${answerId}`, {
      method: 'DELETE'
    }, token),

  // ==========================================
  // PeerBridge Student Follow & Social Graph
  // ==========================================
  followUser: (token: string, targetUserId: string) =>
    request(`/follow/users/${targetUserId}/follow`, {
      method: 'POST'
    }, token),

  unfollowUser: (token: string, targetUserId: string) =>
    request(`/follow/users/${targetUserId}/unfollow`, {
      method: 'DELETE'
    }, token),

  sendFollowRequest: (token: string, targetUserId: string) =>
    request(`/follow/users/${targetUserId}/request`, {
      method: 'POST'
    }, token),

  cancelFollowRequest: (token: string, targetUserId: string) =>
    request(`/follow/users/${targetUserId}/cancel-request`, {
      method: 'DELETE'
    }, token),

  getPendingFollowRequests: (token: string) =>
    request('/follow/requests/pending', {}, token),

  acceptFollowRequest: (token: string, requestId: string) =>
    request(`/follow/requests/${requestId}/accept`, {
      method: 'PATCH'
    }, token),

  declineFollowRequest: (token: string, requestId: string) =>
    request(`/follow/requests/${requestId}/decline`, {
      method: 'PATCH'
    }, token),

  getPeerProfile: (userId: string, currentUserId?: string) => {
    const params = currentUserId ? `?currentUserId=${currentUserId}` : '';
    return request(`/follow/users/${userId}/profile${params}`);
  },

  getConnectedPeers: (token: string) =>
    request('/follow/connected-peers', {}, token),

  getFollowStatus: (targetUserId: string, currentUserId?: string) => {
    const params = currentUserId ? `?currentUserId=${currentUserId}` : '';
    return request(`/follow/users/${targetUserId}/status${params}`);
  },

  getFollowers: (userId: string) => request(`/follow/users/${userId}/followers`),

  getFollowing: (userId: string) => request(`/follow/users/${userId}/following`),

  // Activity & Notifications
  getNotifications: (token: string) => request('/notifications', {}, token),

  markNotificationRead: (token: string, id: string) =>
    request(`/notifications/${id}/read`, {
      method: 'PATCH'
    }, token),

  markAllNotificationsRead: (token: string) =>
    request('/notifications/read-all', {
      method: 'PATCH'
    }, token),


  // ==========================================
  // Platform App Endpoints
  // ==========================================

  // Tutors & Mentors
  getTutors: (subject?: string, search?: string) => {
    const params = new URLSearchParams();
    if (subject && subject !== 'All') params.append('subject', subject);
    if (search) params.append('search', search);
    return request(`/tutors?${params.toString()}`);
  },

  getTutor: (id: string) => request(`/tutors/${id}`),

  // Sessions
  getSessions: (token: string) => request('/sessions/my', {}, token),

  bookSession: (token: string, payload: any) =>
    request('/sessions/book', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, token),

  completeSession: (token: string, id: string, rating: number, reviewText: string) =>
    request(`/sessions/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ rating, reviewText })
    }, token),

  // Chat
  getConversations: (token: string) => request('/chat', {}, token),
  getMessages: (token: string, userId: string) => request(`/chat/${userId}`, {}, token),

  sendMessage: (token: string, payload: any) =>
    request('/chat/send', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, token),

  // Wallet & Credits
  getWallet: (token: string) => request('/credits/wallet', {}, token),

  // Practice Quizzes & AI Study
  getQuizzes: () => request('/quizzes'),

  getQuiz: (id: string) => request(`/quizzes/${id}`),

  submitQuiz: (token: string | null, id: string, answers: Record<string, string>) =>
    request(`/quizzes/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers })
    }, token),

  // ==========================================
  // Cloudinary Image Uploads
  // ==========================================
  uploadAvatar: (token: string, base64Image: string) =>
    request('/upload/avatar', {
      method: 'POST',
      body: JSON.stringify({ image: base64Image })
    }, token),

  uploadProjectImage: (token: string, base64Image: string) =>
    request('/upload/project-image', {
      method: 'POST',
      body: JSON.stringify({ image: base64Image })
    }, token),

  uploadImage: (token: string, base64Image: string, folder?: string) =>
    request('/upload/image', {
      method: 'POST',
      body: JSON.stringify({ image: base64Image, folder })
    }, token),

  uploadVideo: (token: string, base64Video: string, fileSize?: number, folder?: string) =>
    request(
      '/upload/video',
      {
        method: 'POST',
        body: JSON.stringify({ video: base64Video, fileSize, folder })
      },
      token
    ),

  // ==========================================
  // Instagram-style Stories (Follow-only visibility, likes, comments)
  // ==========================================
  getStoriesFeed: (token?: string | null) => request('/stories/feed', {}, token),

  createStory: (
    token: string | null,
    data: { mediaUrl?: string; caption?: string; background?: string; mediaType?: string }
  ) =>
    request(
      '/stories',
      {
        method: 'POST',
        body: JSON.stringify(data)
      },
      token
    ),

  likeStory: (token: string | null, storyId: string) =>
    request(`/stories/${storyId}/like`, { method: 'POST' }, token),

  commentStory: (token: string | null, storyId: string, text: string) =>
    request(
      `/stories/${storyId}/comment`,
      {
        method: 'POST',
        body: JSON.stringify({ text })
      },
      token
    ),

  viewStory: (token: string | null, storyId: string) =>
    request(`/stories/${storyId}/view`, { method: 'POST' }, token),

  deleteStory: (token: string | null, storyId: string) =>
    request(`/stories/${storyId}`, { method: 'DELETE' }, token)
};

