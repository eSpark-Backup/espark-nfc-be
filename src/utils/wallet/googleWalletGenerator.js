import { googleWalletConfig } from '../../config/googleWalletConfig.js';
import {
  createGenericClassPayload,
  createGenericObjectPayload,
  createJWTClaims,
  validateEmployeeData,
} from '../../templates/wallet/googlePassTemplate.js';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

/**
 * Google Wallet Pass Generator
 * Handles creation and management of Google Wallet passes for employees
 */

class GoogleWalletGenerator {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize the generator
   */
  async initialize() {
    if (!this.initialized) {
      googleWalletConfig.validateConfig();
      await googleWalletConfig.initialize();
      this.initialized = true;
    }
  }

  /**
   * Create or update Generic Class (template) - only needs to be done once
   */
  async createOrUpdateClass(companyProfile) {
    try {
      await this.initialize();

      const classId = googleWalletConfig.getClassId();
      const endpoints = googleWalletConfig.getEndpoints();
      const httpClient = await googleWalletConfig.getHttpClient();

      const classPayload = createGenericClassPayload(companyProfile);

      // Try to get existing class
      try {
        const getResponse = await httpClient.request({
          url: `${endpoints.genericClass}/${classId}`,
          method: 'GET',
        });

        console.log('✅ Generic class already exists:', classId);

        // Update existing class
        const updateResponse = await httpClient.request({
          url: `${endpoints.genericClass}/${classId}`,
          method: 'PUT',
          data: classPayload,
        });

        return updateResponse.data;
      } catch (error) {
        if (error.response?.status === 404) {
          // Class doesn't exist, create it
          console.log('📝 Creating new generic class:', classId);

          const createResponse = await httpClient.request({
            url: endpoints.genericClass,
            method: 'POST',
            data: classPayload,
          });

          console.log('✅ Generic class created successfully');
          return createResponse.data;
        }
        throw error;
      }
    } catch (error) {
      console.error('❌ Error creating/updating class:', error.message);
      throw new Error(`Failed to create/update Google Wallet class: ${error.message}`);
    }
  }

  /**
   * Create or update Generic Object (individual employee pass)
   */
  async createOrUpdateObject(employee, companyProfile) {
    try {
      await this.initialize();

      // Validate employee data
      validateEmployeeData(employee);

      const objectId = googleWalletConfig.generateObjectId(employee._id);
      const endpoints = googleWalletConfig.getEndpoints();
      const httpClient = await googleWalletConfig.getHttpClient();

      const objectPayload = createGenericObjectPayload(employee, companyProfile);

      // Try to get existing object
      try {
        const getResponse = await httpClient.request({
          url: `${endpoints.genericObject}/${objectId}`,
          method: 'GET',
        });

        console.log('✅ Generic object already exists:', objectId);

        // Update existing object
        const updateResponse = await httpClient.request({
          url: `${endpoints.genericObject}/${objectId}`,
          method: 'PUT',
          data: objectPayload,
        });

        return {
          success: true,
          objectId: objectId,
          data: updateResponse.data,
          isNew: false,
        };
      } catch (error) {
        if (error.response?.status === 404) {
          // Object doesn't exist, create it
          console.log('📝 Creating new generic object:', objectId);

          const createResponse = await httpClient.request({
            url: endpoints.genericObject,
            method: 'POST',
            data: objectPayload,
          });

          console.log('✅ Generic object created successfully');
          return {
            success: true,
            objectId: objectId,
            data: createResponse.data,
            isNew: true,
          };
        }
        throw error;
      }
    } catch (error) {
      console.error('❌ Error creating/updating object:', error.message);
      throw new Error(`Failed to create/update Google Wallet object: ${error.message}`);
    }
  }

  /**
   * Generate JWT for "Add to Google Wallet" button
   */
  async generateSaveUrl(employee) {
    try {
      await this.initialize();

      const objectId = googleWalletConfig.generateObjectId(employee._id);
      const claims = createJWTClaims(objectId);

      // Read service account key
      const serviceAccountPath = path.resolve(
        process.cwd(),
        process.env.GOOGLE_APPLICATION_CREDENTIALS
      );

      if (!fs.existsSync(serviceAccountPath)) {
        throw new Error(`Service account file not found: ${serviceAccountPath}`);
      }
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

      // Create JWT
      const token = jwt.sign(claims, serviceAccount.private_key, {
        algorithm: 'RS256',
        // audience: 'google',
        // issuer: serviceAccount.client_email,
      });

      // Generate save URL
      const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

      return {
        success: true,
        saveUrl: saveUrl,
        token: token,
        objectId: objectId,
      };
    } catch (error) {
      console.error('❌ Error generating save URL:', error.message);
      throw new Error(`Failed to generate Google Wallet save URL: ${error.message}`);
    }
  }

  /**
   * Generate complete Google Wallet pass (creates class, object, and returns save URL)
   */
  async generateCompletePass(employee, companyProfile) {
    try {
      // Step 1: Ensure class exists
      await this.createOrUpdateClass(companyProfile);

      // Step 2: Create/update object for employee
      const objectResult = await this.createOrUpdateObject(employee, companyProfile);

      // Step 3: Generate save URL
      const urlResult = await this.generateSaveUrl(employee);

      return {
        success: true,
        message: objectResult.isNew
          ? 'Google Wallet pass created successfully'
          : 'Google Wallet pass updated successfully',
        objectId: objectResult.objectId,
        saveUrl: urlResult.saveUrl,
        isNew: objectResult.isNew,
      };
    } catch (error) {
      console.error('❌ Error generating complete pass:', error.message);
      throw error;
    }
  }

  /**
   * Deactivate/expire an employee pass
   */
  async deactivatePass(employeeId) {
    try {
      await this.initialize();

      const objectId = googleWalletConfig.generateObjectId(employeeId);
      const endpoints = googleWalletConfig.getEndpoints();
      const httpClient = await googleWalletConfig.getHttpClient();

      // Update object state to EXPIRED
      const patchResponse = await httpClient.request({
        url: `${endpoints.genericObject}/${objectId}`,
        method: 'PATCH',
        data: {
          state: 'EXPIRED',
        },
      });

      console.log('✅ Pass deactivated successfully:', objectId);

      return {
        success: true,
        message: 'Google Wallet pass deactivated successfully',
        objectId: objectId,
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return {
          success: false,
          message: 'Pass not found',
        };
      }
      console.error('❌ Error deactivating pass:', error.message);
      throw new Error(`Failed to deactivate Google Wallet pass: ${error.message}`);
    }
  }

  /**
   * Check if pass exists for employee
   */
  async passExists(employeeId) {
    try {
      await this.initialize();

      const objectId = googleWalletConfig.generateObjectId(employeeId);
      const endpoints = googleWalletConfig.getEndpoints();
      const httpClient = await googleWalletConfig.getHttpClient();

      const response = await httpClient.request({
        url: `${endpoints.genericObject}/${objectId}`,
        method: 'GET',
      });

      return {
        exists: true,
        objectId: objectId,
        state: response.data.state,
        data: response.data,
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return {
          exists: false,
          objectId: googleWalletConfig.generateObjectId(employeeId),
        };
      }
      throw error;
    }
  }

  /**
   * Get pass details for employee
   */
  async getPassDetails(employeeId) {
    try {
      const passInfo = await this.passExists(employeeId);
      return passInfo;
    } catch (error) {
      console.error('❌ Error getting pass details:', error.message);
      throw new Error(`Failed to get Google Wallet pass details: ${error.message}`);
    }
  }
}

// Export singleton instance
export const googleWalletGenerator = new GoogleWalletGenerator();
