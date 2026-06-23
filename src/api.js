const API_BASE = '/api';

async function request(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('登录已过期');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || '请求失败');
  }
  return data;
}

const api = {
  // 认证
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/auth/me'),

  // 帖子
  getPosts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/posts?${qs}`);
  },
  getPost: (id) => request(`/posts/${id}`),
  createPost: (formData) => {
    const token = localStorage.getItem('token');
    return fetch(`${API_BASE}/posts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then((r) => r.json());
  },
  addComment: (postId, content) =>
    request(`/posts/${postId}/comment`, { method: 'POST', body: JSON.stringify({ content }) }),
  toggleLike: (postId) => request(`/posts/${postId}/like`, { method: 'POST' }),
  toggleFavorite: (postId) => request(`/posts/${postId}/favorite`, { method: 'POST' }),

  // 用户
  getUser: (id) => request(`/users/${id}`),
  updateProfile: (formData) => {
    const token = localStorage.getItem('token');
    return fetch(`${API_BASE}/users/profile`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then((r) => r.json());
  },
  changePassword: (body) =>
    request('/users/password', { method: 'PUT', body: JSON.stringify(body) }),
  toggleFollow: (userId) => request(`/users/${userId}/follow`, { method: 'POST' }),
  getUserFavorites: (userId) => request(`/users/${userId}/favorites`),
  searchUsers: (q) => request(`/users/search/users?q=${encodeURIComponent(q)}`),

  // 私聊
  getConversations: () => request('/messages/conversations'),
  getMessagesWith: (userId) => request(`/messages/with/${userId}`),
  sendMessage: (body) => request('/messages/send', { method: 'POST', body: JSON.stringify(body) }),
  getUnreadCount: () => request('/messages/unread/count'),

  // 管理后台
  getDashboard: () => request('/admin/dashboard'),
  getAdminUsers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/users?${qs}`);
  },
  getAdminUserDetail: (id) => request(`/admin/users/${id}`),
  banUser: (id, body) => request(`/admin/users/${id}/ban`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  getAdminPosts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/posts?${qs}`);
  },
  getAdminPostStats: (id) => request(`/admin/posts/${id}/stats`),
  deletePost: (id) => request(`/admin/posts/${id}`, { method: 'DELETE' }),
  togglePin: (id) => request(`/admin/posts/${id}/pin`, { method: 'PUT' }),
  getAdminGroupMessages: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/group-messages?${qs}`);
  },
  deleteGroupMessage: (id) => request(`/admin/group-messages/${id}`, { method: 'DELETE' }),
  getActivityLog: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/activity-log?${qs}`);
  },
};

export default api;
