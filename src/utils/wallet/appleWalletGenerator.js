import { PKPass } from 'passkit-generator';
import { appleWalletConfig } from '../../config/appleWalletConfig.js';
import {
  createApplePassJSON,
  validateEmployeeDataForApple,
  getPassMetadata,
} from '../../templates/wallet/applePassTemplate.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import axios from 'axios';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Apple Wallet Pass Generator
 * Handles creation and management of Apple Wallet passes for employees
 */

class AppleWalletGenerator {
  constructor() {
    this.initialized = false;
    this.tempDir = path.resolve(__dirname, '../../temp/apple-passes');
  }

  /**
   * Initialize the generator
   */
  async initialize() {
    if (!this.initialized) {
      appleWalletConfig.validateConfig();
      await appleWalletConfig.initialize();

      // Create temp directory if it doesn't exist
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }

      this.initialized = true;
      console.log('✅ Apple Wallet generator initialized successfully');
    }
  }

  applyEmployeeDataToPass(pass, employee, companyProfile, serialNumber) {
    pass.serialNumber = serialNumber;

    const authToken = crypto.randomUUID();

    pass.webServiceURL = `${process.env.BASE_URL}/api/apple-wallet`;
    pass.authenticationToken = authToken;

    this._lastGeneratedAuthToken = authToken;

    const barcodeMessage =
      employee.qr_url || `${process.env.BASE_URL}/api/employees/${employee.employee_id}/contact`;

    pass.setBarcodes([
      {
        format: 'PKBarcodeFormatQR',
        message: barcodeMessage,
        messageEncoding: 'iso-8859-1',
        altText: employee.employee_id,
      },
    ]);

    pass.primaryFields.push({
      key: 'name',
      label: 'NAME',
      value: employee.name,
    });

    pass.secondaryFields.push(
      {
        key: 'designation',
        label: 'DESIGNATION',
        value: employee.designation,
      },
      {
        key: 'employee_id',
        label: 'EMPLOYEE ID',
        value: employee.employee_id,
      }
    );

    pass.auxiliaryFields.push(
      {
        key: 'department',
        label: 'DEPARTMENT',
        value: employee.department_id?.name,
      },
      {
        key: 'joining_date',
        label: 'JOINED',
        value: employee.joining_date,
        dateStyle: 'PKDateStyleMedium',
      }
    );

    pass.backFields.push(
      {
        key: 'email',
        label: 'Email',
        value: employee.email,
      },
      {
        key: 'phone',
        label: 'Phone',
        value: employee.phone_number,
      },
      ...(employee.second_phone_number
        ? [
            {
              key: 'second_phone',
              label: 'Alternate Phone',
              value: employee.second_phone_number,
            },
          ]
        : []),
      {
        key: 'address',
        label: 'Address',
        value: employee.address,
      },
      {
        key: 'about',
        label: 'About',
        value: employee.about_me,
      }
    );

    if (employee.social_links) {
      const { facebook, twitter, instagram, linkedin, youtube } = employee.social_links;

      if (facebook)
        pass.backFields.push({
          key: 'facebook',
          label: 'Facebook',
          value: facebook,
        });

      if (twitter)
        pass.backFields.push({
          key: 'twitter',
          label: 'Twitter',
          value: twitter,
        });

      if (instagram)
        pass.backFields.push({
          key: 'instagram',
          label: 'Instagram',
          value: instagram,
        });

      if (linkedin)
        pass.backFields.push({
          key: 'linkedin',
          label: 'LinkedIn',
          value: linkedin,
        });
      if (youtube)
        pass.backFields.push({
          key: 'youtube',
          label: 'Youtube',
          value: youtube,
        });
    }
  }

  getLastAuthToken() {
    return this._lastGeneratedAuthToken;
  }

  /**
   * Download image from URL and convert to buffer
   */
  async downloadImage(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });
      return Buffer.from(response.data);
    } catch (error) {
      console.error(`Failed to download image from ${imageUrl}:`, error.message);
      return null;
    }
  }

  /**
   * Resize image to specified dimensions
   */
  async resizeImage(imageBuffer, width, height) {
    try {
      return await sharp(imageBuffer)
        .resize(width, height, {
          fit: 'cover',
          position: 'center',
        })
        .png()
        .toBuffer();
    } catch (error) {
      console.error('Failed to resize image:', error.message);
      throw error;
    }
  }

  /**
   * Prepare images for pass
   */
  async preparePassImages(employee, companyProfile) {
    const images = {};

    try {
      // Icon images (from company logo)
      if (companyProfile?.profile_image?.image_url) {
        const logoBuffer = await this.downloadImage(companyProfile.profile_image.image_url);

        if (logoBuffer) {
          // Icon (29x29, 58x58, 87x87)
          images['icon.png'] = await this.resizeImage(logoBuffer, 29, 29);
          images['icon@2x.png'] = await this.resizeImage(logoBuffer, 58, 58);
          images['icon@3x.png'] = await this.resizeImage(logoBuffer, 87, 87);

          // Logo (160x50, 320x100, 480x150)
          images['logo.png'] = await this.resizeImage(logoBuffer, 160, 50);
          images['logo@2x.png'] = await this.resizeImage(logoBuffer, 320, 100);
          images['logo@3x.png'] = await this.resizeImage(logoBuffer, 480, 150);
        }
      }

      // Strip images (from employee profile photo)
      if (employee?.profile_image?.image_url) {
        const profileBuffer = await this.downloadImage(employee.profile_image.image_url);

        if (profileBuffer) {
          // Strip (375x123, 750x246, 1125x369)
          images['strip.png'] = await this.resizeImage(profileBuffer, 375, 123);
          images['strip@2x.png'] = await this.resizeImage(profileBuffer, 750, 246);
          images['strip@3x.png'] = await this.resizeImage(profileBuffer, 1125, 369);

          // Thumbnail (optional - 90x90, 180x180, 270x270)
          images['thumbnail.png'] = await this.resizeImage(profileBuffer, 90, 90);
          images['thumbnail@2x.png'] = await this.resizeImage(profileBuffer, 180, 180);
          images['thumbnail@3x.png'] = await this.resizeImage(profileBuffer, 270, 270);
        }
      }

      // If no images were prepared, use placeholder
      if (Object.keys(images).length === 0) {
        console.warn('No images available, pass will be created without custom images');
      }

      return images;
    } catch (error) {
      console.error('Error preparing pass images:', error.message);
      return {}; // Return empty object, pass can still be created
    }
  }

  /**
   * Generate Apple Wallet pass for employee
   */
  async generatePass(employee, companyProfile) {
    try {
      await this.initialize();

      // Validate employee data
      validateEmployeeDataForApple(employee);

      // Generate unique serial number
      const serialNumber = appleWalletConfig.generateSerialNumber(employee._id);

      // Get certificates
      const certificates = appleWalletConfig.getCertificates();

      // Create pass JSON
      const passJSON = createApplePassJSON(employee, companyProfile, serialNumber);

      const passFolder = path.join(__dirname, '../../pass-templates/employee.pass');

      // Prepare images
      const images = await this.preparePassImages(employee, companyProfile);

      // Create pass using passkit-generator
      const pass = await PKPass.from(
        {
          model: passFolder,
          certificates: {
            wwdr: certificates.wwdr,
            signerCert: certificates.certificate,
            signerKey: certificates.key,
          },
        },
        images
      );

      this.applyEmployeeDataToPass(pass, employee, companyProfile, serialNumber);

      // Generate .pkpass file
      const passBuffer = pass.getAsBuffer();

      console.log('✅ Apple Wallet pass generated successfully:', serialNumber);

      return {
        success: true,
        passBuffer: passBuffer,
        serialNumber: serialNumber,
        metadata: getPassMetadata(employee, serialNumber),
      };
    } catch (error) {
      console.error('❌ Error generating Apple Wallet pass:', error.message);
      throw new Error(`Failed to generate Apple Wallet pass: ${error.message}`);
    }
  }

  /**
   * Save pass to file system
   */
  async savePassToFile(passBuffer, employeeId) {
    try {
      const fileName = `employee_${employeeId}_${Date.now()}.pkpass`;
      const filePath = path.join(this.tempDir, fileName);

      fs.writeFileSync(filePath, passBuffer);

      console.log('✅ Pass saved to file:', filePath);

      return {
        success: true,
        filePath: filePath,
        fileName: fileName,
      };
    } catch (error) {
      console.error('❌ Error saving pass to file:', error.message);
      throw error;
    }
  }

  /**
   * Delete pass file from file system
   */
  async deletePassFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('✅ Pass file deleted:', filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error deleting pass file:', error.message);
      return false;
    }
  }

  /**
   * Clean up old pass files (older than 24 hours)
   */
  async cleanupOldPasses() {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

      let deletedCount = 0;

      for (const file of files) {
        if (file.endsWith('.pkpass')) {
          const filePath = path.join(this.tempDir, file);
          const stats = fs.statSync(filePath);
          const age = now - stats.mtimeMs;

          if (age > maxAge) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        }
      }

      if (deletedCount > 0) {
        console.log(`✅ Cleaned up ${deletedCount} old pass file(s)`);
      }

      return deletedCount;
    } catch (error) {
      console.error('❌ Error cleaning up old passes:', error.message);
      return 0;
    }
  }

  /**
   * Get pass file info
   */
  getPassFileInfo(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const stats = fs.statSync(filePath);
      const fileName = path.basename(filePath);

      return {
        fileName: fileName,
        filePath: filePath,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
      };
    } catch (error) {
      console.error('❌ Error getting pass file info:', error.message);
      return null;
    }
  }

  /**
   * Generate pass and return as base64 (for API responses)
   */
  async generatePassBase64(employee, companyProfile) {
    try {
      const result = await this.generatePass(employee, companyProfile);

      const base64Pass = result.passBuffer.toString('base64');

      return {
        success: true,
        base64: base64Pass,
        serialNumber: result.serialNumber,
        metadata: result.metadata,
        mimeType: 'application/vnd.apple.pkpass',
      };
    } catch (error) {
      console.error('❌ Error generating base64 pass:', error.message);
      throw error;
    }
  }

  /**
   * Validate pass buffer
   */
  validatePassBuffer(passBuffer) {
    try {
      // Check if buffer is valid
      if (!Buffer.isBuffer(passBuffer)) {
        return false;
      }

      // Check if buffer is not empty
      if (passBuffer.length === 0) {
        return false;
      }

      // Check for PKPass signature (ZIP file magic number: PK)
      const header = passBuffer.slice(0, 2).toString('hex');
      if (header !== '504b') {
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Error validating pass buffer:', error.message);
      return false;
    }
  }
}

// Export singleton instance
export const appleWalletGenerator = new AppleWalletGenerator();
