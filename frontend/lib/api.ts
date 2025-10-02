const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api"

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// NEW FUNCTION: Safely retrieves the access token from local storage
export function getAccessToken(): string | null {
  try {
    return localStorage.getItem("accessToken")
  } catch {
    return null
  }
}

// NEW FUNCTION: Safely retrieves the refresh token from local storage
export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem("refreshToken")
  } catch {
    return null
  }
}

// NEW FUNCTION: Saves tokens to local storage
export function saveTokens(accessToken: string, refreshToken?: string): void {
  try {
    localStorage.setItem("accessToken", accessToken)
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken)
    }
  } catch (error) {
    console.error("Failed to save tokens:", error)
  }
}

// NEW FUNCTION: Clears all tokens from local storage
export function clearTokens(): void {
  try {
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
  } catch (error) {
    console.error("Failed to clear tokens:", error)
  }
}

// NEW FUNCTION: Refreshes the access token using the refresh token
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    return null
  }

  try {
    const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    })

    if (response.ok) {
      const data = await response.json()
      saveTokens(data.access, refreshToken)
      return data.access
    } else {
      // Refresh failed, clear tokens
      clearTokens()
      return null
    }
  } catch (error) {
    console.error("Token refresh failed:", error)
    clearTokens()
    return null
  }
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  let token = getAccessToken()

  // Always try to refresh if no token
  if (!token) {
    token = await refreshAccessToken()
    if (!token) {
      throw new ApiError("No valid token available", 401)
    }
  }

  // Prepare headers with token
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
    "Authorization": `Bearer ${token}`
  }

  try {
    let response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include'  // Include cookies if any
    })

    // Handle 401/403 with token refresh
    if ((response.status === 401 || response.status === 403) && token) {
      console.log('Token expired, attempting refresh...')
      const newToken = await refreshAccessToken()
      if (newToken) {
        console.log('Token refreshed, retrying request...')
        headers["Authorization"] = `Bearer ${newToken}`
        response = await fetch(url, {
          ...options,
          headers,
          credentials: 'include'
        })
      } else {
        console.log('Token refresh failed')
        clearTokens()
        throw new ApiError("Authentication failed", 401)
      }
    }

    if (!response.ok) {
      let message = "An error occurred"
      try {
        const errorData = await response.json()
        message = errorData.detail || errorData.message || "An error occurred"
        console.error('API Error:', errorData)
      } catch (e) {
        message = response.statusText
        console.error('API Error:', response.status, response.statusText)
      }

      if (response.status === 401 || response.status === 403) {
        clearTokens()
      }
      throw new ApiError(message, response.status)
    }

    const data = await response.json()
    return data as T
  } catch (error) {
    console.error('API Request failed:', error)
    throw error
  }
}

export function getAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  }
}
