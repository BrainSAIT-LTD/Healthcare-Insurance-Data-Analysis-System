/**
 * Data Store Utility
 * 
 * This utility provides functions to store and retrieve analysis data
 * to maintain state between API calls.
 */

/**
 * Store data to KV store or memory
 * @param {string} key - Unique key for the data
 * @param {object} data - Data to store
 * @param {object} env - Environment with KV bindings
 */
export async function storeData(key, data, env) {
  try {
    // If KV store is available, use it
    if (env && env.HEALTH_INSURANCE_DATA) {
      await env.HEALTH_INSURANCE_DATA.put(`data:${key}`, JSON.stringify(data), {
        expirationTtl: 3600 // 1 hour expiration
      });
      return { success: true };
    }
    
    // Otherwise, we'll use a memory store
    // This is only for development and won't persist across requests in production
    if (!globalThis.__dataStore) {
      globalThis.__dataStore = {};
    }
    
    globalThis.__dataStore[key] = {
      data,
      timestamp: Date.now()
    };
    
    return { success: true };
  } catch (error) {
    console.error('Error storing data:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieve data from KV store or memory
 * @param {string} key - Unique key for the data
 * @param {object} env - Environment with KV bindings
 */
export async function retrieveData(key, env) {
  try {
    // If KV store is available, use it
    if (env && env.HEALTH_INSURANCE_DATA) {
      const storedData = await env.HEALTH_INSURANCE_DATA.get(`data:${key}`, { type: 'json' });
      if (storedData) {
        return { success: true, data: storedData };
      }
      return { success: false, error: 'Data not found' };
    }
    
    // Otherwise, check the memory store
    if (globalThis.__dataStore && globalThis.__dataStore[key]) {
      // Check if data is still valid (less than 1 hour old)
      const entry = globalThis.__dataStore[key];
      const now = Date.now();
      const age = now - entry.timestamp;
      
      if (age < 3600000) { // 1 hour in milliseconds
        return { success: true, data: entry.data };
      } else {
        // Data is too old, clean it up
        delete globalThis.__dataStore[key];
      }
    }
    
    return { success: false, error: 'Data not found' };
  } catch (error) {
    console.error('Error retrieving data:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate a unique session ID
 */
export function generateSessionId() {
  return 'session_' + ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}
