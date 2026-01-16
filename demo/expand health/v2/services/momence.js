/**
 * Momence Integration Service
 *
 * Supports two API versions:
 *
 * 1. Legacy API v1 (hostId + token authentication):
 *    Base: https://momence.com/_api/primary/api/v1
 *    Endpoints: /Events, /Videos, /Customers (pagination)
 *    Auth: Query params hostId and token
 *
 * 2. V2 API (OAuth2 Bearer token authentication):
 *    Base: https://api.momence.com/api/v2
 *    Endpoints: /host/appointments/reservations, /host/sessions, etc.
 *    Auth: Bearer token in Authorization header
 *    Requires OAuth2 setup in Momence dashboard
 */

const MOMENCE_LEGACY_API_BASE = 'https://momence.com/_api/primary/api/v1';
const MOMENCE_V2_API_BASE = 'https://api.momence.com/api/v2';

class MomenceService {
  constructor(integration) {
    this.integration = integration;
    this.hostId = integration?.platform_host_id;
    this.token = integration?.access_token;
    // V2 API credentials (OAuth2)
    this.v2AccessToken = integration?.v2_access_token;
    this.v2RefreshToken = integration?.v2_refresh_token;
  }

  /**
   * Build URL with query parameters for Legacy API
   * @param {string} endpoint - API endpoint path
   * @param {Object} queryParams - Query parameters
   * @returns {string} Full URL
   */
  buildUrl(endpoint, queryParams = {}) {
    const url = new URL(`${MOMENCE_LEGACY_API_BASE}${endpoint}`);

    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  }

  /**
   * Build URL for V2 API
   * @param {string} endpoint - API endpoint path
   * @param {Object} queryParams - Query parameters
   * @returns {string} Full URL
   */
  buildV2Url(endpoint, queryParams = {}) {
    const url = new URL(`${MOMENCE_V2_API_BASE}${endpoint}`);

    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  }

  /**
   * Make authenticated API request to Legacy API v1
   * Uses hostId and token as query parameters
   * @param {string} endpoint - API endpoint path
   * @param {Object} options - Fetch options
   * @param {Object} queryParams - Query parameters
   * @returns {Object} API response
   */
  async request(endpoint, options = {}, queryParams = {}) {
    // Add hostId and token to query params for Legacy API compatibility
    const authParams = {
      hostId: this.hostId,
      token: this.token,
      ...queryParams
    };
    const url = this.buildUrl(endpoint, authParams);

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Momence API error: ${error.message || error.error || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Make authenticated API request to V2 API
   * Uses Bearer token in Authorization header
   * @param {string} endpoint - API endpoint path
   * @param {Object} options - Fetch options
   * @param {Object} queryParams - Query parameters
   * @returns {Object} API response
   */
  async requestV2(endpoint, options = {}, queryParams = {}) {
    if (!this.v2AccessToken) {
      throw new Error('V2 API requires OAuth2 access token. Please configure V2 credentials in integration settings.');
    }

    const url = this.buildV2Url(endpoint, queryParams);

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.v2AccessToken}`,
      ...options.headers
    };

    console.log(`[Momence V2 API] Requesting ${endpoint}`);

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.log(`[Momence V2 API] Error:`, error);
      throw new Error(`Momence V2 API error: ${error.message || error.error || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Check if V2 API is available (has credentials)
   */
  hasV2Credentials() {
    return !!this.v2AccessToken;
  }

  // ============================================
  // CUSTOMER/MEMBER MANAGEMENT (Legacy API v1)
  // ============================================

  /**
   * Get all customers (clients) from Momence
   * Uses Legacy API v1 /Customers endpoint with pagination
   * @param {Object} params - Query parameters (page, pageSize)
   * @returns {Object} { payload: Array, pagination: { page, pageSize, totalCount } }
   */
  async getCustomers(params = {}) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 100;
    return this.request('/Customers', {}, { page, pageSize });
  }

  /**
   * Get all customers with automatic pagination
   * Fetches all pages and returns combined results
   * @param {number} maxRecords - Maximum records to fetch (default: all)
   * @returns {Array} List of all customers
   */
  async getAllCustomers(maxRecords = Infinity) {
    const allCustomers = [];
    let page = 1;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore && allCustomers.length < maxRecords) {
      const result = await this.getCustomers({ page, pageSize });

      // DEBUG: Log the raw response structure
      console.log(`[Momence API] Page ${page} response type:`, typeof result);
      console.log(`[Momence API] Page ${page} is array:`, Array.isArray(result));
      console.log(`[Momence API] Page ${page} keys:`, result ? Object.keys(result) : 'null');
      if (result && !Array.isArray(result)) {
        console.log(`[Momence API] payload exists:`, !!result.payload);
        console.log(`[Momence API] pagination:`, result.pagination);
      }

      // Handle both response formats:
      // 1. { payload: [...], pagination: {...} } - expected format
      // 2. Direct array of customers
      // 3. { customers: [...] } or other formats
      let customers = [];
      let totalCount = 0;

      if (Array.isArray(result)) {
        // Direct array response
        customers = result;
        totalCount = result.length;
        console.log(`[Momence API] Direct array format, ${customers.length} customers`);
      } else if (result && result.payload && Array.isArray(result.payload)) {
        // Expected format with payload
        customers = result.payload;
        totalCount = result.pagination?.totalCount || result.payload.length;
        console.log(`[Momence API] Payload format, ${customers.length} customers, total: ${totalCount}`);
      } else if (result && result.customers && Array.isArray(result.customers)) {
        // Alternative format with 'customers' key
        customers = result.customers;
        totalCount = result.totalCount || result.customers.length;
        console.log(`[Momence API] Customers format, ${customers.length} customers`);
      } else if (result && result.data && Array.isArray(result.data)) {
        // Alternative format with 'data' key
        customers = result.data;
        totalCount = result.total || result.data.length;
        console.log(`[Momence API] Data format, ${customers.length} customers`);
      } else {
        console.log(`[Momence API] Unknown response format:`, JSON.stringify(result).substring(0, 500));
      }

      if (customers.length > 0) {
        allCustomers.push(...customers);
        hasMore = allCustomers.length < totalCount && allCustomers.length < maxRecords;
        page++;
      } else {
        hasMore = false;
      }
    }

    console.log(`[Momence API] Total customers fetched: ${allCustomers.length}`);
    return allCustomers.slice(0, maxRecords);
  }

  /**
   * Alias for getCustomers to maintain compatibility
   * @param {Object} filters - Filter parameters
   * @returns {Object} Customers response
   */
  async getMembers(filters = {}) {
    return this.getCustomers(filters);
  }

  // ============================================
  // SESSION / CLASS MANAGEMENT
  // ============================================

  /**
   * Get sessions (classes)
   * @param {Object} params - Query parameters (from, to, etc.)
   * @returns {Array} List of sessions
   */
  async getSessions(params = {}) {
    return this.request('/sessions', {}, params);
  }

  /**
   * Get session details
   * @param {string} sessionId - Session ID
   * @returns {Object} Session details
   */
  async getSession(sessionId) {
    return this.request(`/sessions/${sessionId}`);
  }

  /**
   * Get session bookings
   * @param {string} sessionId - Session ID
   * @returns {Array} List of bookings
   */
  async getSessionBookings(sessionId) {
    return this.request(`/sessions/${sessionId}/bookings`);
  }

  /**
   * Get member's session bookings
   * @param {string} memberId - Member ID
   * @param {Object} params - Query parameters
   * @returns {Array} List of session bookings
   */
  async getMemberSessions(memberId, params = {}) {
    return this.request(`/members/${memberId}/sessions`, {}, params);
  }

  /**
   * Book member into session for free
   * @param {string} sessionId - Session ID
   * @param {string} memberId - Member ID
   * @returns {Object} Booking result
   */
  async addMemberToSessionFree(sessionId, memberId) {
    return this.request(`/sessions/${sessionId}/bookings/free`, {
      method: 'POST',
      body: JSON.stringify({ memberId })
    });
  }

  /**
   * Check in a booking
   * @param {string} bookingId - Booking ID
   * @returns {Object} Check-in result
   */
  async checkInBooking(bookingId) {
    return this.request(`/session-bookings/${bookingId}/check-in`, {
      method: 'POST'
    });
  }

  /**
   * Cancel a booking
   * @param {string} bookingId - Booking ID
   * @returns {Object} Cancellation result
   */
  async cancelBooking(bookingId) {
    return this.request(`/session-bookings/${bookingId}`, {
      method: 'DELETE'
    });
  }

  // ============================================
  // APPOINTMENT MANAGEMENT
  // ============================================

  /**
   * Get all appointment reservations
   * @param {Object} params - Query parameters (from, to, etc.)
   * @returns {Array} List of appointment reservations
   */
  async getAppointmentReservations(params = {}) {
    return this.request('/appointments/reservations', {}, params);
  }

  /**
   * Get member's appointments
   * @param {string} memberId - Member ID
   * @param {Object} params - Query parameters
   * @returns {Array} List of appointments
   */
  async getMemberAppointments(memberId, params = {}) {
    return this.request(`/members/${memberId}/appointments`, {}, params);
  }

  // ============================================
  // MEMBERSHIP MANAGEMENT
  // ============================================

  /**
   * Get available memberships
   * @returns {Array} List of memberships
   */
  async getMemberships() {
    return this.request('/memberships');
  }

  /**
   * Get member's active memberships/subscriptions
   * @param {string} memberId - Member ID
   * @returns {Array} List of active memberships
   */
  async getMemberActiveMemberships(memberId) {
    return this.request(`/members/${memberId}/bought-memberships/active`);
  }

  // ============================================
  // SALES & REPORTS
  // ============================================

  /**
   * Get sales data
   * @param {Object} params - Query parameters (date range, etc.)
   * @returns {Array} List of sales
   */
  async getSales(params = {}) {
    return this.request('/sales', {}, params);
  }

  // ============================================
  // EVENTS MANAGEMENT (Legacy API v1)
  // ============================================

  /**
   * Get events (classes/sessions) from Momence
   * Uses Legacy API v1 /Events endpoint
   * @returns {Array} List of events
   */
  async getEvents() {
    const result = await this.request('/Events');

    // DEBUG: Log the raw response structure
    console.log(`[Momence API] /Events response type:`, typeof result);
    console.log(`[Momence API] /Events is array:`, Array.isArray(result));
    console.log(`[Momence API] /Events keys:`, result ? Object.keys(result) : 'null');

    // Handle multiple response formats
    let events = [];
    if (Array.isArray(result)) {
      events = result;
    } else if (result && result.payload && Array.isArray(result.payload)) {
      events = result.payload;
    } else if (result && result.events && Array.isArray(result.events)) {
      events = result.events;
    } else if (result && result.data && Array.isArray(result.data)) {
      events = result.data;
    } else {
      console.log(`[Momence API] /Events unknown format:`, JSON.stringify(result).substring(0, 500));
    }

    console.log(`[Momence API] /Events returned ${events.length} events`);
    return events;
  }

  /**
   * Get all appointments (1-on-1 bookings) from Momence
   * Tries V2 API first if credentials available, then falls back to Legacy API v1
   * @param {Object} params - Query parameters (from, to dates)
   * @returns {Array} List of appointment reservations
   */
  async getAllAppointments(params = {}) {
    const now = new Date();
    // Use wider date range - 1 year back, 1 year forward
    const from = params.from || new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const to = params.to || new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log(`[Momence API] Fetching appointments from ${from} to ${to}`);

    // Try V2 API first if we have credentials
    if (this.hasV2Credentials()) {
      console.log(`[Momence API] Trying V2 API for appointments...`);
      try {
        const result = await this.requestV2('/host/appointments/reservations', {}, { from, to });
        console.log(`[Momence V2 API] Response type:`, typeof result);
        console.log(`[Momence V2 API] Is array:`, Array.isArray(result));

        let appointments = this.parseArrayResponse(result, ['reservations', 'appointments', 'data', 'payload']);
        if (appointments.length > 0) {
          console.log(`[Momence V2 API] Found ${appointments.length} appointments`);
          return appointments;
        }
      } catch (v2Err) {
        console.log(`[Momence V2 API] Appointments endpoint failed:`, v2Err.message);
      }
    } else {
      console.log(`[Momence API] No V2 credentials available, using Legacy API`);
    }

    // Fallback to Legacy API v1 - try multiple endpoint + parameter combinations
    const endpointsToTry = [
      { path: '/Appointments', params: { from, to } },
      { path: '/Appointments', params: { startDate: from, endDate: to } },
      { path: '/Appointments', params: {} }, // Try without date params
      { path: '/appointments', params: { from, to } },
      { path: '/AppointmentReservations', params: { from, to } },
      { path: '/appointments/reservations', params: { from, to } },
      { path: '/Reservations', params: { from, to } },
      { path: '/Bookings', params: { from, to } },
      { path: '/AppointmentBookings', params: { from, to } },
      { path: '/appointment-bookings', params: { from, to } },
      { path: '/Appointments', params: { page: 1, pageSize: 100 } },
      { path: '/Reservations', params: { page: 1, pageSize: 100 } },
      { path: '/Schedule', params: { from, to } },
      { path: '/schedule', params: { from, to } },
    ];

    for (const { path, params: queryParams } of endpointsToTry) {
      try {
        console.log(`[Momence Legacy API] Trying endpoint: ${path} with params:`, queryParams);
        const result = await this.request(path, {}, queryParams);

        console.log(`[Momence Legacy API] ${path} response type:`, typeof result);
        console.log(`[Momence Legacy API] ${path} is array:`, Array.isArray(result));
        if (result && typeof result === 'object') {
          console.log(`[Momence Legacy API] ${path} keys:`, Object.keys(result));
          // Log first 500 chars of response to see structure
          console.log(`[Momence Legacy API] ${path} sample:`, JSON.stringify(result).substring(0, 500));
        }

        // Parse response
        let appointments = this.parseArrayResponse(result, ['appointments', 'reservations', 'bookings', 'payload', 'data', 'schedule', 'items']);

        if (appointments.length > 0) {
          console.log(`[Momence Legacy API] ${path} returned ${appointments.length} appointments`);
          // Log first appointment structure
          if (appointments[0]) {
            console.log(`[Momence Legacy API] First appointment keys:`, Object.keys(appointments[0]));
          }
          return appointments;
        } else {
          console.log(`[Momence Legacy API] ${path} returned 0 appointments`);
        }
      } catch (err) {
        console.log(`[Momence Legacy API] ${path} failed:`, err.message);
      }
    }

    console.log(`[Momence API] No appointments found from any endpoint`);
    console.log(`[Momence API] NOTE: Appointments may require V2 API with OAuth2 credentials.`);
    console.log(`[Momence API] Set up V2 API at: https://momence.com/dashboard/profile?host-redirect=public-api-clients`);
    return [];
  }

  /**
   * Get all sessions (class bookings) from Momence
   * Tries V2 API first if credentials available, then falls back to Legacy API v1
   * @param {Object} params - Query parameters (from, to dates)
   * @returns {Array} List of sessions
   */
  async getAllSessions(params = {}) {
    const now = new Date();
    const from = params.from || new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const to = params.to || new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log(`[Momence API] Fetching sessions from ${from} to ${to}`);

    // Try V2 API first if we have credentials
    if (this.hasV2Credentials()) {
      console.log(`[Momence API] Trying V2 API for sessions...`);
      try {
        // V2 API endpoint for sessions
        const result = await this.requestV2('/host/sessions', {}, { from, to });
        console.log(`[Momence V2 API] Sessions response type:`, typeof result);

        let sessions = this.parseArrayResponse(result, ['sessions', 'data', 'payload']);
        if (sessions.length > 0) {
          console.log(`[Momence V2 API] Found ${sessions.length} sessions`);
          return sessions;
        }
      } catch (v2Err) {
        console.log(`[Momence V2 API] Sessions endpoint failed:`, v2Err.message);
      }
    }

    // Fallback to Legacy API v1
    const endpointsToTry = [
      '/Sessions',
      '/sessions',
      '/Classes',
      '/classes',
      '/SessionBookings',
      '/session-bookings'
    ];

    for (const endpoint of endpointsToTry) {
      try {
        console.log(`[Momence Legacy API] Trying endpoint: ${endpoint}`);
        const result = await this.request(endpoint, {}, { from, to });

        console.log(`[Momence Legacy API] ${endpoint} response type:`, typeof result);
        console.log(`[Momence Legacy API] ${endpoint} is array:`, Array.isArray(result));
        if (result && typeof result === 'object') {
          console.log(`[Momence Legacy API] ${endpoint} keys:`, Object.keys(result));
        }

        // Parse response
        let sessions = this.parseArrayResponse(result, ['sessions', 'classes', 'bookings', 'payload', 'data']);

        if (sessions.length > 0) {
          console.log(`[Momence Legacy API] ${endpoint} returned ${sessions.length} sessions`);
          return sessions;
        }
      } catch (err) {
        console.log(`[Momence Legacy API] ${endpoint} failed:`, err.message);
      }
    }

    console.log(`[Momence API] No sessions found from any endpoint`);
    return [];
  }

  /**
   * Helper to parse array response from various formats
   */
  parseArrayResponse(result, possibleKeys) {
    if (Array.isArray(result)) {
      return result;
    }

    if (result && typeof result === 'object') {
      // Try each possible key
      for (const key of possibleKeys) {
        if (result[key] && Array.isArray(result[key])) {
          return result[key];
        }
      }
    }

    return [];
  }

  /**
   * Get on-demand videos from Momence
   * Uses Legacy API v1 /Videos endpoint
   * @returns {Array} List of videos
   */
  async getVideos() {
    return this.request('/Videos');
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Test the connection to Momence API
   * @returns {Object} Test result
   */
  async testConnection() {
    // Hit the Events endpoint (shown in Momence Legacy API docs)
    // URL: https://momence.com/_api/primary/api/v1/Events?hostId=X&token=Y
    const result = await this.request('/Events');
    return {
      success: true,
      message: 'Connection successful',
      eventCount: Array.isArray(result) ? result.length : 0
    };
  }
}

// ============================================
// DATA MAPPING UTILITIES
// ============================================

/**
 * Map Momence customer to Expand Health client format
 * Legacy API v1 customer fields:
 * - memberId: unique customer ID
 * - email, firstName, lastName, phoneNumber
 * - firstSeen, lastSeen: timestamps
 * - activeSubscriptions: array of membership packages
 * - customerFields: custom fields array
 * - addresses: array of addresses
 *
 * @param {Object} momenceCustomer - Momence customer data from /Customers endpoint
 * @returns {Object} Expand Health client format
 */
function mapMomenceMemberToClient(momenceCustomer) {
  // Build notes from active subscriptions
  let notes = '';
  if (momenceCustomer.activeSubscriptions && momenceCustomer.activeSubscriptions.length > 0) {
    const subscriptions = momenceCustomer.activeSubscriptions
      .map(sub => `${sub.membership?.name || 'Unknown'} (${sub.classesLeft || 0}/${sub.totalClasses || 0} left)`)
      .join(', ');
    notes = `Active memberships: ${subscriptions}`;
  }

  // Extract address if available
  let address = null;
  if (momenceCustomer.addresses && momenceCustomer.addresses.length > 0) {
    const addr = momenceCustomer.addresses[0];
    address = [addr.street, addr.city, addr.state, addr.zip, addr.country]
      .filter(Boolean)
      .join(', ');
  }

  return {
    first_name: momenceCustomer.firstName || '',
    last_name: momenceCustomer.lastName || '',
    email: momenceCustomer.email || '',
    phone: momenceCustomer.phoneNumber || '',
    date_of_birth: null, // Not available in Legacy API
    gender: null, // Not available in Legacy API
    address: address,
    notes: notes,
    external_id: String(momenceCustomer.memberId),
    external_platform: 'momence',
    external_data: momenceCustomer
  };
}

/**
 * Map Expand Health client to Momence member format
 * @param {Object} client - Expand Health client data
 * @returns {Object} Momence member format
 */
function mapClientToMomenceMember(client) {
  return {
    firstName: client.first_name,
    lastName: client.last_name,
    email: client.email,
    phoneNumber: client.phone || undefined
  };
}

/**
 * Map Momence session/appointment to Expand appointment format
 * @param {Object} momenceEvent - Momence session or appointment
 * @param {string} type - 'session' or 'appointment'
 * @returns {Object} Expand appointment format
 */
function mapMomenceEventToAppointment(momenceEvent, type = 'session') {
  return {
    title: momenceEvent.name || momenceEvent.title || 'Untitled',
    start_time: momenceEvent.startTime || momenceEvent.start_time,
    end_time: momenceEvent.endTime || momenceEvent.end_time,
    status: momenceEvent.status || 'scheduled',
    location: momenceEvent.location?.name || momenceEvent.location || null,
    notes: momenceEvent.description || momenceEvent.notes || '',
    appointment_type: type,
    external_id: String(momenceEvent.id),
    external_platform: 'momence',
    external_data: momenceEvent
  };
}

module.exports = {
  MomenceService,
  mapMomenceMemberToClient,
  mapClientToMomenceMember,
  mapMomenceEventToAppointment,
  MOMENCE_LEGACY_API_BASE,
  MOMENCE_V2_API_BASE
};
