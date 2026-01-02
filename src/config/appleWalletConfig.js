import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Apple Wallet Configuration
 * Handles authentication and configuration for Apple PassKit
 */

class AppleWalletConfig {
  constructor() {
    this.passTypeId = process.env.APPLE_PASS_TYPE_ID;
    this.teamId = process.env.APPLE_TEAM_ID;
    this.certificatePath = process.env.APPLE_CERTIFICATE_PATH;
    this.keyPath = process.env.APPLE_KEY_PATH;
    this.wwdrCertificatePath = process.env.APPLE_WWDR_CERTIFICATE_PATH;

    this.certificateData = null;
    this.keyData = null;
    this.wwdrCertificateData = null;
  }

  /**
   * Initialize Apple Wallet configuration by loading certificates
   */
  async initialize() {
    try {
      // Validate configuration first
      this.validateConfig();

      // Resolve paths relative to project root
      const projectRoot = process.cwd();

      const certPath = path.resolve(projectRoot, this.certificatePath);
      const keyPathResolved = path.resolve(projectRoot, this.keyPath);
      const wwdrPath = path.resolve(projectRoot, this.wwdrCertificatePath);

      // Check if files exist
      if (!fs.existsSync(certPath)) {
        throw new Error(`Certificate file not found: ${certPath}`);
      }
      if (!fs.existsSync(keyPathResolved)) {
        throw new Error(`Private key file not found: ${keyPathResolved}`);
      }
      if (!fs.existsSync(wwdrPath)) {
        throw new Error(`WWDR certificate file not found: ${wwdrPath}`);
      }

      // Load certificate files
      this.certificateData = fs.readFileSync(certPath, 'utf8');
      this.keyData = fs.readFileSync(keyPathResolved, 'utf8');
      this.wwdrCertificateData = fs.readFileSync(wwdrPath, 'utf8');

      console.log('✅ Apple Wallet certificates loaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Apple Wallet:', error.message);
      throw new Error(`Apple Wallet initialization failed: ${error.message}`);
    }
  }

  /**
   * Get certificate data for pass signing
   */
  getCertificates() {
    if (!this.certificateData || !this.keyData || !this.wwdrCertificateData) {
      throw new Error('Certificates not loaded. Call initialize() first.');
    }

    return {
      certificate: this.certificateData,
      key: this.keyData,
      wwdr: this.wwdrCertificateData,
      // passphrase: process.env.APPLE_KEY_PASSPHRASE || '',
    };
  }

  /**
   * Get pass type identifier
   */
  getPassTypeId() {
    return this.passTypeId;
  }

  /**
   * Get team identifier
   */
  getTeamId() {
    return this.teamId;
  }

  /**
   * Generate unique serial number for pass
   */
  generateSerialNumber(employeeId) {
    const timestamp = Date.now();
    return `EMP-${employeeId}-${timestamp}`;
  }

  /**
   * Get pass configuration
   */
  getPassConfig() {
    return {
      passTypeIdentifier: this.passTypeId,
      teamIdentifier: this.teamId,
      organizationName: process.env.COMPANY_NAME || 'Company',
      description: 'Employee Card',
    };
  }

  /**
   * Validate configuration
   */
  validateConfig() {
    const required = [
      'APPLE_PASS_TYPE_ID',
      'APPLE_TEAM_ID',
      'APPLE_CERTIFICATE_PATH',
      'APPLE_KEY_PATH',
      'APPLE_WWDR_CERTIFICATE_PATH',
    ];

    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required Apple Wallet environment variables: ${missing.join(', ')}`);
    }

    // Validate pass type ID format
    if (!this.passTypeId.startsWith('pass.')) {
      throw new Error('APPLE_PASS_TYPE_ID must start with "pass."');
    }

    // Validate team ID format (10 characters alphanumeric)
    if (!/^[A-Z0-9]{10}$/.test(this.teamId)) {
      throw new Error('APPLE_TEAM_ID must be 10 alphanumeric characters');
    }

    return true;
  }
}

// Export singleton instance
export const appleWalletConfig = new AppleWalletConfig();
