const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzLkH_vSbpObvC85M-t5TBukKIRqQxi0gH_ZjIc_O7xrjjBvz8QDuz4dEjkovODvoI93w/exec";

export interface User {
  username: string;
  name: string;
  allowedPages: string[];
  role?: string;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export async function loginUser(
  username: string, 
  password: string
): Promise<LoginResponse> {
  try {
    console.log('🔐 Attempting login for:', username);
    
    if (!APP_SCRIPT_URL) {
      return {
        success: false,
        error: 'Configuration error: API URL is not defined.'
      };
    }
    
    // Use JSONP for Google Apps Script (bypasses CORS)
    return await loginWithJSONP(username, password);
    
  } catch (error) {
    console.error('❌ Login error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred.'
    };
  }
}

// Use JSONP for Google Apps Script (bypasses CORS)
async function loginWithJSONP(username: string, password: string): Promise<LoginResponse> {
  return new Promise((resolve) => {
    const callbackName = `jsonp_callback_${Date.now()}_${Math.random().toString(36).substr(2)}`;
    
    // Create script element
    const script = document.createElement('script');
    const url = new URL(APP_SCRIPT_URL);
    url.searchParams.append('action', 'login');
    url.searchParams.append('username', username);
    url.searchParams.append('password', password);
    url.searchParams.append('callback', callbackName);
    
    script.src = url.toString();
    
    // Define callback function
    (window as any)[callbackName] = (data: any) => {
      // Clean up
      delete (window as any)[callbackName];
      document.head.removeChild(script);
      
      console.log('📦 JSONP Login Response:', data);
      
      if (!data.success) {
        resolve({
          success: false,
          error: data.error || 'Login failed'
        });
        return;
      }
      
      if (!data.user) {
        resolve({
          success: false,
          error: 'Invalid response from server'
        });
        return;
      }
      
      // Process allowedPages
      let processedAllowedPages: string[] = [];
      if (data.user.allowedPages && Array.isArray(data.user.allowedPages)) {
        processedAllowedPages = data.user.allowedPages
          .filter((page: any) => typeof page === 'string' && page.trim().length > 0)
          .map((page: string) => page.trim());
      }
      
      // If no pages provided, show error
      if (processedAllowedPages.length === 0) {
        console.warn('⚠️ No allowed pages received');
        resolve({
          success: false,
          error: 'No page access configured. Contact administrator.'
        });
        return;
      }
      
      const processedUser: User = {
        username: data.user.username,
        name: data.user.name,
        allowedPages: processedAllowedPages,
        role: data.user.role
      };
      
      console.log('✅ Processed user with allowedPages:', processedUser.allowedPages);
      
      resolve({
        success: true,
        user: processedUser
      });
    };
    
    // Handle script loading errors
    script.onerror = () => {
      delete (window as any)[callbackName];
      document.head.removeChild(script);
      resolve({
        success: false,
        error: 'Script loading failed'
      });
    };
    
    // Add script to document
    document.head.appendChild(script);
  });
}