
// Helper to interact with Google Apps Script or Remote API

// Get API URL from environment variables or Hardcoded for this instance
// We export this so storage.ts knows we have a valid connection
export const API_URL = "https://script.google.com/macros/s/AKfycbzN1gqMF_PBAxN5exwgRKmoUU5eLuXrt3yyJjTSHKoJAZ32g6xZJeLCE9x8jUEuOnBh/exec";

export const GAS = {
  run: async (functionName: string, ...args: any[]): Promise<any> => {
    // 1. Check if running in Web Mode with API URL configured
    if (API_URL) {
      try {
        // IMPORTANT: Use 'text/plain' to avoid CORS preflight (OPTIONS) requests
        // Google Apps Script Web Apps don't handle OPTIONS requests easily.
        // Simple POST requests with text/plain are accepted directly.
        const response = await fetch(API_URL, {
          redirect: "follow", 
          method: 'POST',
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify({
            action: functionName,
            payload: args[0] // Provide the first argument as payload
          })
        });

        const result = await response.json();
        
        if (result.status === 'error') {
          throw new Error(result.message);
        }
        
        return result.data;
      } catch (error) {
        console.error(`[API Error] ${functionName}:`, error);
        throw error;
      }
    }

    // 2. Check if we are in the standard GAS environment (Internal Frame)
    if ((window as any).google && (window as any).google.script) {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`GAS function ${functionName} timed out after 30s`));
        }, 30000);

        (window as any).google.script.run
          .withSuccessHandler((response: any) => {
            clearTimeout(timeoutId);
            resolve(response);
          })
          .withFailureHandler((error: any) => {
            clearTimeout(timeoutId);
            reject(error);
          })
          [functionName](...args);
      });
    }

    // 3. Fallback for local development (Mocking delay)
    console.warn(`[Dev Mode] No API URL or GAS environment found. Mocking: ${functionName}`, args);
    return new Promise(resolve => setTimeout(() => resolve(null), 600));
  }
};
