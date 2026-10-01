import type {
  AdminReportRow,
  AdminStats,
  Category,
  InterviewSession,
  Question,
  SessionSummary,
  User,
} from './types';

const TOKEN_KEY = 'mii_token';
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (options.body) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  /*const res = await fetch(`/api${path}`, { ...options, headers });*/
  const res = await fetch(`${API_BASE}/api${path}`, { ...options, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new ApiError(res.status, data.error || `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  // auth
  register: (body: { name: string; email: string; password: string; headline?: string }) =>
    request<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request<{ user: User }>('/auth/me'),

  // candidate
  categories: () => request<{ categories: Category[] }>('/categories'),
  levels: () => request<{ levels: string[] }>('/interviews/meta'),
  startInterview: (body: { categoryId: string; level: string }) =>
    request<{ session: InterviewSession }>('/interviews', { method: 'POST', body: JSON.stringify(body) }),
  mySessions: () => request<{ sessions: SessionSummary[] }>('/interviews/mine'),
  getSession: (id: string) => request<{ session: InterviewSession }>(`/interviews/${id}`),
  submitAnswer: (id: string, body: unknown) =>
    request<{ answer: unknown; progress: { answered: number; total: number; remaining: number } }>(
      `/interviews/${id}/answers`,
      { method: 'POST', body: JSON.stringify(body) }
    ),
  completeInterview: (id: string) =>
    request<{ report: InterviewSession['report']; session: InterviewSession }>(`/interviews/${id}/complete`, {
      method: 'POST',
    }),

  // admin
  adminStats: () => request<AdminStats>('/admin/stats'),
  adminCategories: () => request<{ categories: Category[] }>('/admin/categories'),
  createCategory: (body: Partial<Category>) =>
    request<{ category: Category }>('/admin/categories', { method: 'POST', body: JSON.stringify(body) }),
  updateCategory: (id: string, body: Partial<Category>) =>
    request<{ category: Category }>(`/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  archiveCategory: (id: string) =>
    request<{ category: Category }>(`/admin/categories/${id}`, { method: 'DELETE' }),
  adminQuestions: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ questions: Question[] }>(`/admin/questions${qs ? `?${qs}` : ''}`);
  },
  createQuestion: (body: unknown) =>
    request<{ question: Question }>('/admin/questions', { method: 'POST', body: JSON.stringify(body) }),
  updateQuestion: (id: string, body: unknown) =>
    request<{ question: Question }>(`/admin/questions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  archiveQuestion: (id: string) =>
    request<{ question: Question }>(`/admin/questions/${id}`, { method: 'DELETE' }),
  adminReports: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ reports: AdminReportRow[] }>(`/admin/reports${qs ? `?${qs}` : ''}`);
  },
  adminReport: (id: string) => request<{ session: any }>(`/admin/reports/${id}`),
};
