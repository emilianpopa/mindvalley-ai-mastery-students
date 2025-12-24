/**
 * Momence Integration Service
 *
 * Handles OAuth2 authentication and API interactions with Momence platform.
 * API Documentation: https://api.docs.momence.com/
 */

const crypto = require('crypto');

const MOMENCE_API_BASE = 'https://api.momence.com/api/v2';
const MOMENCE_AUTH_URL = 'https://api.momence.com/api/v2/auth';

class MomenceService {
  constructor(integration) {
    this.integration = integration;
    this.accessToken = integration?.access_token;
    this.refreshToken = integration?.refresh_token;
    this.tokenExpiresAt = integration?.token_expires_at;
  }

  /**
   * Generate OAuth2 authorization URL
   * @param {string} clientId - Momence API client ID
   * @param {string} redirectUri - Callback URL after authorization
   * @param {string} state - CSRF protection state parameter
   * @returns {string} Authorization URL
   */
  static getAuthorizationUrl(clientId, redirectUri, state) {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state: state
    });

    return `${MOMENCE_AUTH_URL}/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   * @param {string} code - Authorization code from OAuth callback
   * @param {string} clientId - Momence API client ID
   * @param {string} clientSecret - Momence API client secret
   * @param {string} redirectUri - Callback URL (must match authorization request)
   * @returns {Object} Token response
   */
  static async exchangeCodeForToken(code, clientId, clientSecret, redirectUri) {
    const response = await fetch(`${MOMENCE_AUTH_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Token exchange failed: ${error.error_description || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Refresh access token
   * @returns {Object} New token response
   */
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const clientId = this.integration.client_id;
    const clientSecret = this.integration.client_secret;

    const response = await fetch(`${MOMENCE_AUTH_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: clientId,
        client_secret: clientSecret
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Token refresh failed: ${error.error_description || response.statusText}`);
    }

    const tokens = await response.json();
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token || this.refreshToken;
    this.tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    return tokens;
  }

  /**
   * Make authenticated API request
   * @param {string} endpoint - API endpoint path
   * @param {Object} options - Fetch options
   * @returns {Object} API response
   */
  async request(endpoint, options = {}) {
    // Check if token needs refresh
    if (this.tokenExpiresAt && new Date() >= new Date(this.tokenExpiresAt)) {
      await this.refreshAccessToken();
    }

    const url = `${MOMENCE_API_BASE}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (response.status === 401) {
      // Token expired, try refresh
      await this.refreshAccessToken();
      // Retry request
      return this.request(endpoint, options);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Momence API error: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  // ============================================
  // MEMBER MANAGEMENT
  // ============================================

  /**
   * Get all members (clients) from Momence
   * @param {Object} params - Query parameters
   * @returns {Array} List of members
   */
  async getMembers(params = {}) {
    const queryParams = new URLSearchParams(params);
    return this.request(`/host/members?${queryParams.toString()}`);
  }

  /**
   * Get single member by ID
   * @param {string} memberId - Momence member ID
   * @returns {Object} Member details
   */
  async getMember(memberId) {
    return this.request(`/host/members/${memberId}`);
  }

  /**
   * Create new member in Momence
   * @param {Object} memberData - Member data
   * @returns {Object} Created member
   */
  async createMember(memberData) {
    return this.request('/host/members', {
      method: 'POST',
      body: JSON.stringify(memberData)
    });
  }

  /**
   * Update member name
   * @param {string} memberId - Momence member ID
   * @param {Object} nameData - Name data { firstName, lastName }
   * @returns {Object} Updated member
   */
  async updateMemberName(memberId, nameData) {
    return this.request(`/host/members/${memberId}/name`, {
      method: 'PUT',
      body: JSON.stringify(nameData)
    });
  }

  /**
   * Update member email
   * @param {string} memberId - Momence member ID
   * @param {string} email - New email address
   * @returns {Object} Updated member
   */
  async updateMemberEmail(memberId, email) {
    return this.request(`/host/members/${memberId}/email`, {
      method: 'PUT',
      body: JSON.stringify({ email })
    });
  }

  /**
   * Update member phone
   * @param {string} memberId - Momence member ID
   * @param {string} phoneNumber - New phone number
   * @returns {Object} Updated member
   */
  async updateMemberPhone(memberId, phoneNumber) {
    return this.request(`/host/members/${memberId}/phone-number`, {
      method: 'PUT',
      body: JSON.stringify({ phoneNumber })
    });
  }

  /**
   * Get member notes
   * @param {string} memberId - Momence member ID
   * @returns {Array} Member notes
   */
  async getMemberNotes(memberId) {
    return this.request(`/host/members/${memberId}/notes`);
  }

  // ============================================
  // SESSION / CLASS MANAGEMENT
  // ============================================

  /**
   * Get sessions (classes)
   * @param {Object} params - Query parameters
   * @returns {Array} List of sessions
   */
  async getSessions(params = {}) {
    const queryParams = new URLSearchParams(params);
    return this.request(`/host/sessions?${queryParams.toString()}`);
  }

  /**
   * Get session details
   * @param {string} sessionId - Session ID
   * @returns {Object} Session details
   */
  async getSession(sessionId) {
    return this.request(`/host/sessions/${sessionId}`);
  }

  /**
   * Get session bookings
   * @param {string} sessionId - Session ID
   * @returns {Array} List of bookings
   */
  async getSessionBookings(sessionId) {
    return this.request(`/host/sessions/${sessionId}/bookings`);
  }

  /**
   * Get member's session bookings
   * @param {string} memberId - Member ID
   * @returns {Array} List of session bookings
   */
  async getMemberSessions(memberId) {
    return this.request(`/host/members/${memberId}/sessions`);
  }

  /**
   * Book member into session for free
   * @param {string} sessionId - Session ID
   * @param {string} memberId - Member ID
   * @returns {Object} Booking result
   */
  async addMemberToSessionFree(sessionId, memberId) {
    return this.request(`/host/sessions/${sessionId}/bookings/free`, {
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
    return this.request(`/host/session-bookings/${bookingId}/check-in`, {
      method: 'POST'
    });
  }

  /**
   * Cancel a booking
   * @param {string} bookingId - Booking ID
   * @returns {Object} Cancellation result
   */
  async cancelBooking(bookingId) {
    return this.request(`/host/session-bookings/${bookingId}`, {
      method: 'DELETE'
    });
  }

  // ============================================
  // APPOINTMENT MANAGEMENT
  // ============================================

  /**
   * Get all appointment reservations
   * @param {Object} params - Query parameters
   * @returns {Array} List of appointment reservations
   */
  async getAppointmentReservations(params = {}) {
    const queryParams = new URLSearchParams(params);
    return this.request(`/host/appointments/reservations?${queryParams.toString()}`);
  }

  /**
   * Get member's appointments
   * @param {string} memberId - Member ID
   * @returns {Array} List of appointments
   */
  async getMemberAppointments(memberId) {
    return this.request(`/host/members/${memberId}/appointments`);
  }

  // ============================================
  // MEMBERSHIP MANAGEMENT
  // ============================================

  /**
   * Get available memberships
   * @returns {Array} List of memberships
   */
  async getMemberships() {
    return this.request('/host/memberships');
  }

  /**
   * Get member's active memberships/subscriptions
   * @param {string} memberId - Member ID
   * @returns {Array} List of active memberships
   */
  async getMemberActiveMemberships(memberId) {
    return this.request(`/host/members/${memberId}/bought-memberships/active`);
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
    const queryParams = new URLSearchParams(params);
    return this.request(`/host/sales?${queryParams.toString()}`);
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Test the connection to Momence API
   * @returns {Object} Profile info if successful
   */
  async testConnection() {
    return this.request('/auth/profile');
  }

  /**
   * Get current authenticated user/host info
   * @returns {Object} Profile information
   */
  async getProfile() {
    return this.request('/auth/profile');
  }

  /**
   * Logout / invalidate token
   * @returns {Object} Logout result
   */
  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
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
    external_id: momenceMember.id,
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
    external_id: momenceEvent.id,
    external_platform: 'momence',
    external_data: momenceEvent
  };
}

/**
 * Generate a secure state parameter for OAuth
 * @returns {string} Random state string
 */
function generateOAuthState() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  MomenceService,
  mapMomenceMemberToClient,
  mapClientToMomenceMember,
  mapMomenceEventToAppointment,
  generateOAuthState,
  MOMENCE_API_BASE,
  MOMENCE_AUTH_URL
};
