import axios from 'axios';

const API_URL = '/api/auth';

export interface User {
  id: number;
  email: string;
  displayName?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  message?: string;
}

export interface RefreshResponse {
  user: User;
  accessToken: string;
}

/**
 * Register a new user
 */
export const register = async (
  email: string,
  password: string,
  displayName?: string
): Promise<AuthResponse> => {
  const response = await axios.post<AuthResponse>(`${API_URL}/register`, {
    email,
    password,
    displayName,
  });
  
  // Store tokens
  if (response.data.accessToken) {
    localStorage.setItem('accessToken', response.data.accessToken);
  }
  if (response.data.refreshToken) {
    localStorage.setItem('refreshToken', response.data.refreshToken);
  }
  
  return response.data;
};

/**
 * Login user
 */
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await axios.post<AuthResponse>(`${API_URL}/login`, {
    email,
    password,
  });
  
  // Store tokens
  if (response.data.accessToken) {
    localStorage.setItem('accessToken', response.data.accessToken);
  }
  if (response.data.refreshToken) {
    localStorage.setItem('refreshToken', response.data.refreshToken);
  }
  
  return response.data;
};

/**
 * Logout user
 */
export const logout = async (): Promise<void> => {
  const accessToken = localStorage.getItem('accessToken');
  
  if (accessToken) {
    try {
      await axios.post(
        `${API_URL}/logout`,
        {},
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
  
  // Clear tokens
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

/**
 * Refresh access token
 */
export const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (!refreshToken) {
    return null;
  }
  
  try {
    const response = await axios.post<RefreshResponse>(`${API_URL}/refresh`, {
      refreshToken,
    });
    
    localStorage.setItem('accessToken', response.data.accessToken);
    return response.data.accessToken;
  } catch (error) {
    console.error('Token refresh failed:', error);
    // Clear tokens if refresh fails
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return null;
  }
};

/**
 * Get current user
 */
export const getCurrentUser = async (): Promise<User | null> => {
  const accessToken = localStorage.getItem('accessToken');
  
  if (!accessToken) {
    return null;
  }
  
  try {
    const response = await axios.get<{ user: User }>(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    return response.data.user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

/**
 * Get stored access token
 */
export const getAccessToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('accessToken');
};
