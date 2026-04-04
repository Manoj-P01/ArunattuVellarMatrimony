export function initLogger() {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const timestamp = new Date().toISOString();
    const endpoint = typeof args[0] === "string" ? args[0] : (args[0] && args[0].url) || "Unknown URL";
    const method = (args[1] && args[1].method) || "GET";
    
    console.log(`[Frontend Request] ${timestamp} | METHOD: ${method} | Endpoint: ${endpoint}`);
    
    try {
      const response = await originalFetch(...args);
      console.log(`[Frontend Response] ${timestamp} | Status: ${response.status} | Endpoint: ${endpoint}`);
      return response;
    } catch (e) {
      console.error(`[Frontend Error] ${timestamp} | Endpoint: ${endpoint} | Error:`, e);
      throw e;
    }
  };
}
