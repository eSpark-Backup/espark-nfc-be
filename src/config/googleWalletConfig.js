import { GoogleAuth } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Google Wallet Configuration
 * Handles authentication and configuration for Google Wallet API
 */

class GoogleWalletConfig {
  constructor() {
    this.issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
    this.classId = `${this.issuerId}.employee_card_class`;
    this.baseUrl = 'https://walletobjects.googleapis.com/walletobjects/v1';

    // Initialize Google Auth client
    this.credentials = null;
    this.httpClient = null;
  }

  /**
   * Initialize Google Auth client with service account credentials
   */
  async initialize() {
    try {
      const auth = new GoogleAuth({
        keyFile: path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS),
        scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
      });

      this.credentials = await auth.getClient();
      this.httpClient = await auth.getClient();

      console.log('✅ Google Wallet client initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Google Wallet client:', error.message);
      throw new Error(`Google Wallet initialization failed: ${error.message}`);
    }
  }

  /**
   * Get authenticated HTTP client
   */
  async getHttpClient() {
    if (!this.httpClient) {
      await this.initialize();
    }
    return this.httpClient;
  }

  /**
   * Get full class ID
   */
  getClassId() {
    return this.classId;
  }

  /**
   * Get issuer ID
   */
  getIssuerId() {
    return this.issuerId;
  }

  /**
   * Generate unique object ID for employee
   */
  generateObjectId(employeeId) {
    return `${this.issuerId}.employee_${employeeId}`;
  }

  /**
   * Get API endpoints
   */
  getEndpoints() {
    return {
      genericClass: `${this.baseUrl}/genericClass`,
      genericObject: `${this.baseUrl}/genericObject`,
    };
  }

  /**
   * Validate configuration
   */
  validateConfig() {
    const required = ['GOOGLE_WALLET_ISSUER_ID', 'GOOGLE_APPLICATION_CREDENTIALS'];

    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required Google Wallet environment variables: ${missing.join(', ')}`
      );
    }

    return true;
  }
}

// Export singleton instance
export const googleWalletConfig = new GoogleWalletConfig();
