/**
 * Momence Integration Service
 *
 * Handles Legacy API authentication with Momence platform.
 * Uses hostId and token for authentication (query parameters).
 * API Documentation: https://api.docs.momence.com/
 */

const MOMENCE_API_BASE = 'https://api.momence.com/host';

class MomenceService {
  constructor(integration) {
    this.integration = integration;
    this.hostId = integration?.platform_host_id;
    this.token = integration?.access_token;
  }

  /**
   * Build URL with authentication params
   * @param {string} endpoint - API endpoint path
   * @param {Object} additionalParams - Additional query parameters
   * @returns {string} Full URL with auth params
   */
  buildUrl(endpoint, additionalParams = {}) {
    const url = new URL(`${MOMENCE_API_BASE}${endpoint}`);
    url.searchParams.set('hostId', this.hostId);
    url.searchParams.set('token', this.token);

    for (const [key, value] of Object.entries(additionalParams)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  }

  /**
   * Make authenticated API request
   * @param {string} endpoint - API endpoint path
   * @param {Object} options - Fetch options
   * @param {Object} queryParams - Additional query parameters
   * @returns {Object} API response
   */
  async request(endpoint, options = {}, queryParams = {}) {
    const url = this.buildUrl(endpoint, queryParams);

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
  // MEMBER MANAGEMENT
  // ============================================

  /**
   * Get all members (clients) from Momence
   * @param {Object} params - Query parameters (page, limit, search, etc.)
   * @returns {Array} List of members
   */
  async getMembers(params = {}) {
    return this.request('/members', {}, params);
  }

  /**
   * Get single member by ID
   * @param {string} memberId - Momence member ID
   * @returns {Object} Member details
   */
  async getMember(memberId) {
    return this.request(`/members/${memberId}`);
  }

  /**
   * Create new member in Momence
   * @param {Object} memberData - Member data
   * @returns {Object} Created member
   */
  async createMember(memberData) {
    return this.request('/members', {
      method: 'POST',
      body: JSON.stringify(memberData)
    });
  }

  /**
   * Update member
   * @param {string} memberId - Momence member ID
   * @param {Object} memberData - Updated member data
   * @returns {Object} Updated member
   */
  async updateMember(memberId, memberData) {
    return this.request(`/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify(memberData)
    });
  }

  /**
   * Get member notes
   * @param {string} memberId - Momence member ID
   * @returns {Array} Member notes
   */
  async getMemberNotes(memberId) {
    return this.request(`/members/${memberId}/notes`);
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
  // UTILITY METHODS
  // ============================================

  /**
   * Test the connection to Momence API
   * @returns {Object} Test result with member count
   */
  async testConnection() {
    // Try to fetch members to verify credentials work
    const result = await this.request('/members', {}, { limit: 1 });
    return {
      success: true,
      message: 'Connection successful',
      data: result
    };
  }
}

// ============================================
// DATA MAPPING UTILITIES
// ============================================

/**
 * Map Momence member to Expand Health client format
 * @param {Object} momenceMember - Momence member data
 * @returns {Object} Expand Health client format
 */
function mapMomenceMemberToClient(momenceMember) {
  return {
    first_name: momenceMember.firstName || momenceMember.first_name || '',
    last_name: momenceMember.lastName || momenceMember.last_name || '',
    email: momenceMember.email || '',
    phone: momenceMember.phoneNumber || momenceMember.phone || '',
    date_of_birth: momenceMember.dateOfBirth || momenceMember.dob || null,
    gender: momenceMember.gender || null,
    address: momenceMember.address || null,
    notes: momenceMember.notes || '',
    external_id: String(momenceMember.id),
    external_platform: 'momence',
    external_data: momenceMember
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
