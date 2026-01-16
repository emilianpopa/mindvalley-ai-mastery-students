/**
 * Momence Integration Service
 *
 * Handles Legacy API v1 authentication with Momence platform.
 * Uses hostId and token as query parameters.
 * Legacy API Base: https://momence.com/_api/primary/api/v1
 *
 * Available endpoints (discovered):
 * - GET /Events - List events
 * - GET /Videos - List on-demand videos
 * - GET /Customers?page=X&pageSize=Y - List customers with pagination
 */

const MOMENCE_API_BASE = 'https://momence.com/_api/primary/api/v1';

class MomenceService {
  constructor(integration) {
    this.integration = integration;
    this.hostId = integration?.platform_host_id;
    this.token = integration?.access_token;
  }

  /**
   * Build URL with query parameters
   * @param {string} endpoint - API endpoint path
   * @param {Object} queryParams - Query parameters
   * @returns {string} Full URL
   */
  buildUrl(endpoint, queryParams = {}) {
    const url = new URL(`${MOMENCE_API_BASE}${endpoint}`);

    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  }

  /**
   * Make authenticated API request
   * Tries Bearer token first, falls back to query params for Legacy API
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
   * Get events from Momence
   * Uses Legacy API v1 /Events endpoint
   * @returns {Array} List of events
   */
  async getEvents() {
    return this.request('/Events');
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
  MOMENCE_API_BASE
};
