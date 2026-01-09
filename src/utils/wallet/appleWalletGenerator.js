import { PKPass } from 'passkit-generator';
import { appleWalletConfig } from '../../config/appleWalletConfig.js';
import {
  validateEmployeeDataForApple,
  getPassMetadata,
} from '../../templates/wallet/applePassTemplate.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import AdmZip from 'adm-zip';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AppleWalletGenerator {
  constructor() {
    this.initialized = false;
    this.tempDir = path.resolve(__dirname, '../../temp/apple-passes');
  }

  async initialize() {
    if (!this.initialized) {
      appleWalletConfig.validateConfig();
      await appleWalletConfig.initialize();

      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }

      this.initialized = true;
      console.log('✅ Apple Wallet generator initialized successfully');
    }
  }

  /**
   * Download image from URL and convert to buffer
   * CRITICAL FIX: Handles WebP and converts to PNG
   */
  async downloadImage(imageUrl) {
    try {
      console.log(`📥 Downloading image: ${imageUrl}`);

      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 15000, // Increased timeout
      });

      const buffer = Buffer.from(response.data);
      console.log(`✅ Downloaded ${buffer.length} bytes`);

      return buffer;
    } catch (error) {
      console.error(`❌ Failed to download image from ${imageUrl}:`, error.message);
      return null;
    }
  }

  /**
   * CRITICAL FIX: Resize image and FORCE convert to PNG
   * This ensures WebP images are converted to PNG for Apple Wallet
   */
  async resizeImage(imageBuffer, width, height, imageName) {
    try {
      console.log(`🔄 Processing ${imageName}: ${width}x${height}`);

      const resizedBuffer = await sharp(imageBuffer)
        .resize(width, height, {
          fit: 'cover',
          position: 'center',
        })
        .png({
          // CRITICAL: Force PNG output regardless of input format
          quality: 100,
          compressionLevel: 9,
        })
        .toBuffer();

      console.log(`✅ ${imageName} created: ${resizedBuffer.length} bytes`);
      return resizedBuffer;
    } catch (error) {
      console.error(`❌ Failed to resize ${imageName}:`, error.message);
      throw error;
    }
  }

  /**
   * FIXED: Prepare images with WebP support and proper logging
   */
  async preparePassImages(employee, companyProfile) {
    const images = {};
    let successCount = 0;
    let failCount = 0;

    try {
      console.log('\n🖼️  Preparing pass images...');

      // Icon images (from company logo) - MUST be square
      if (companyProfile?.profile_image?.image_url) {
        console.log('📸 Processing company logo...');
        const logoBuffer = await this.downloadImage(companyProfile.profile_image.image_url);

        if (logoBuffer) {
          try {
            // Icon - MUST be square
            images['icon.png'] = await this.resizeImage(logoBuffer, 29, 29, 'icon.png');
            successCount++;
            images['icon@2x.png'] = await this.resizeImage(logoBuffer, 58, 58, 'icon@2x.png');
            successCount++;
            images['icon@3x.png'] = await this.resizeImage(logoBuffer, 87, 87, 'icon@3x.png');
            successCount++;

            // Logo - Used in upper left
            images['logo.png'] = await this.resizeImage(logoBuffer, 160, 50, 'logo.png');
            successCount++;
            images['logo@2x.png'] = await this.resizeImage(logoBuffer, 320, 100, 'logo@2x.png');
            successCount++;
            images['logo@3x.png'] = await this.resizeImage(logoBuffer, 480, 150, 'logo@3x.png');
            successCount++;

            console.log('✅ Company logo processed successfully');
          } catch (err) {
            console.error('❌ Error processing company logo:', err.message);
            failCount += 6;
          }
        } else {
          console.warn('⚠️  Company logo download failed');
          failCount += 6;
        }
      } else {
        console.warn('⚠️  No company logo available');
        failCount += 6;
      }

      // Strip and Thumbnail images (from employee profile photo)
      if (employee?.profile_image?.image_url) {
        console.log('📸 Processing employee photo...');
        const profileBuffer = await this.downloadImage(employee.profile_image.image_url);

        if (profileBuffer) {
          try {
            // Strip image - Full width background image
            // images['strip.png'] = await this.resizeImage(profileBuffer, 375, 123, 'strip.png');
            // successCount++;
            // images['strip@2x.png'] = await this.resizeImage(
            //   profileBuffer,
            //   750,
            //   246,
            //   'strip@2x.png'
            // );
            // successCount++;
            // images['strip@3x.png'] = await this.resizeImage(
            //   profileBuffer,
            //   1125,
            //   369,
            //   'strip@3x.png'
            // );
            // successCount++;

            // Define pass folder at the top of preparePassImages
            const passFolder = path.join(__dirname, '../../pass-templates/employee.pass');

            // Thumbnail - MUST be square, appears in top-left corner
            images['thumbnail.png'] = await this.resizeImage(
              profileBuffer,
              90,
              90,
              'thumbnail.png'
            );
            successCount++;
            images['thumbnail@2x.png'] = await this.resizeImage(
              profileBuffer,
              180,
              180,
              'thumbnail@2x.png'
            );
            successCount++;
            images['thumbnail@3x.png'] = await this.resizeImage(
              profileBuffer,
              270,
              270,
              'thumbnail@3x.png'
            );
            successCount++;

            // ---- NEW: Save thumbnails temporarily in pass folder ----
            try {
              fs.writeFileSync(path.join(passFolder, 'thumbnail.png'), images['thumbnail.png']);
              fs.writeFileSync(
                path.join(passFolder, 'thumbnail@2x.png'),
                images['thumbnail@2x.png']
              );
              fs.writeFileSync(
                path.join(passFolder, 'thumbnail@3x.png'),
                images['thumbnail@3x.png']
              );
              console.log('✅ Employee thumbnail images saved temporarily in pass folder');
            } catch (err) {
              console.error('❌ Failed to save thumbnails to pass folder:', err.message);
            }

            console.log('✅ Employee photo processed successfully');
          } catch (err) {
            console.error('❌ Error processing employee photo:', err.message);
            failCount += 6;
          }
        } else {
          console.warn('⚠️  Employee photo download failed');
          failCount += 6;
        }
      } else {
        console.warn('⚠️  No employee photo available');
        failCount += 6;
      }

      console.log(`\n📊 Image Processing Summary:`);
      console.log(`   ✅ Success: ${successCount} images`);
      console.log(`   ❌ Failed: ${failCount} images`);
      console.log(`   📦 Total: ${Object.keys(images).length} images prepared\n`);

      // Validate that we have at least some images
      if (Object.keys(images).length === 0) {
        console.error('❌ CRITICAL: No images were successfully prepared!');
        console.error('   This will result in an invalid pass.');
      }

      return images;
    } catch (error) {
      console.error('❌ Critical error preparing pass images:', error.message);
      console.error('Stack:', error.stack);
      return {};
    }
  }

  /**
   * CRITICAL FIX: Generate pass with proper data application
   * The issue was that pass data wasn't being saved to pass.json properly
   */
  async generatePass(employee, companyProfile) {
    try {
      await this.initialize();

      console.log('\n🎫 Starting pass generation...');
      console.log(`   Employee: ${employee.name} (${employee.employee_id})`);
      console.log(`   Company: ${companyProfile.company_name}\n`);

      // Validate employee data
      validateEmployeeDataForApple(employee);

      // Generate unique serial number and auth token
      const serialNumber = appleWalletConfig.generateSerialNumber(employee._id);
      const authToken = crypto.randomUUID();

      console.log(`   Serial: ${serialNumber}`);
      console.log(`   Auth Token: ${authToken.substring(0, 8)}...\n`);

      // Store auth token for later retrieval
      this._lastGeneratedAuthToken = authToken;

      // Get certificates
      const certificates = appleWalletConfig.getCertificates();

      const passFolder = path.join(__dirname, '../../pass-templates/employee.pass');

      // Verify pass folder exists
      if (!fs.existsSync(passFolder)) {
        throw new Error(`Pass template folder not found: ${passFolder}`);
      }

      // Verify pass.json exists
      const passJsonPath = path.join(passFolder, 'pass.json');
      if (!fs.existsSync(passJsonPath)) {
        throw new Error(`pass.json not found in template folder: ${passJsonPath}`);
      }

      // Prepare images BEFORE creating pass
      const images = await this.preparePassImages(employee, companyProfile);

      if (Object.keys(images).length === 0) {
        console.warn('⚠️  WARNING: No images prepared. Pass will have no visual elements.');
      }

      console.log(`📦 Creating PKPass object with ${Object.keys(images).length} image(s)...`);

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
        // {
        //   serialNumber: serialNumber,
        //   webServiceURL: `${process.env.BASE_URL}/api/apple-wallet`,
        //   authenticationToken: authToken,
        // },
        images
      );

      pass.serialNumber = serialNumber;
      pass.webServiceURL = `${process.env.BASE_URL}/api/apple-wallet`;
      pass.authenticationToken = authToken;

      console.log('✅ PKPass object created');

      // Prepare barcode data
      const barcodeMessage =
        employee.qr_url || `${process.env.BASE_URL}/api/employees/${employee.employee_id}/contact`;

      console.log('📝 Setting barcode...');
      pass.setBarcodes({
        format: 'PKBarcodeFormatQR',
        message: barcodeMessage,
        messageEncoding: 'iso-8859-1',
        altText: employee.employee_id,
      });

      // Add fields
      console.log('📝 Adding pass fields...');

      // Primary field
      pass.primaryFields.push({
        key: 'name',
        label: 'NAME',
        value: employee.name,
      });

      // Secondary fields
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

      // Back fields
      const backFields = [
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
      ];

      if (employee.second_phone_number) {
        backFields.push({
          key: 'second_phone',
          label: 'Alternate Phone',
          value: employee.second_phone_number,
        });
      }

      backFields.push(
        {
          key: 'company_website',
          label: 'Company Website',
          value: companyProfile.website_link,
        },
        {
          key: 'address',
          label: 'Address',
          value: employee.address,
        }
      );

      // Add social links if available
      if (employee.social_links) {
        const { facebook, twitter, instagram, linkedin, youtube } = employee.social_links;

        if (facebook) backFields.push({ key: 'facebook', label: 'Facebook', value: facebook });
        if (twitter) backFields.push({ key: 'twitter', label: 'Twitter', value: twitter });
        if (instagram) backFields.push({ key: 'instagram', label: 'Instagram', value: instagram });
        if (linkedin) backFields.push({ key: 'linkedin', label: 'LinkedIn', value: linkedin });
        if (youtube) backFields.push({ key: 'youtube', label: 'Youtube', value: youtube });
      }

      pass.backFields.push(...backFields);

      console.log(`✅ Pass structure complete:`);
      console.log(`   Primary fields: ${pass.primaryFields.length}`);
      console.log(`   Secondary fields: ${pass.secondaryFields.length}`);
      console.log(`   Back fields: ${pass.backFields.length}`);

      // Generate .pkpass file (this creates the signed ZIP)
      console.log('\n🔐 Generating signed .pkpass file...');
      const passBuffer = pass.getAsBuffer();

      // 🔍 Inspect unzipped pass.json from generated pass
      const zip = new AdmZip(passBuffer);
      const passJsonEntry = zip.getEntry('pass.json');
      if (passJsonEntry) {
        const generatedPassJson = JSON.parse(passJsonEntry.getData().toString('utf8'));
        console.log('\n   🔍 Full unzipped generated pass.json:');
        console.log(JSON.stringify(generatedPassJson, null, 2)); // Pretty-print JSON
      }

      // Validate the generated pass
      if (!this.validatePassBuffer(passBuffer)) {
        throw new Error('Generated pass buffer is invalid');
      }

      const thumbnailFiles = ['thumbnail.png', 'thumbnail@2x.png', 'thumbnail@3x.png'];
      const passTemplateFolder = path.join(__dirname, '../../pass-templates/employee.pass');

      thumbnailFiles.forEach((file) => {
        const filePath = path.join(passTemplateFolder, file);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log(`✅ Deleted temporary file: ${file}`);
          } catch (err) {
            console.warn(`⚠️ Could not delete ${file}: ${err.message}`);
          }
        }
      });

      console.log('✅ Apple Wallet pass generated successfully!');
      console.log(`   Serial: ${serialNumber}`);
      console.log(`   Size: ${(passBuffer.length / 1024).toFixed(2)} KB`);
      console.log(`   Images included: ${Object.keys(images).length}`);

      return {
        success: true,
        passBuffer: passBuffer,
        serialNumber: serialNumber,
        metadata: getPassMetadata(employee, serialNumber),
      };
    } catch (error) {
      console.error('\n❌ CRITICAL ERROR generating Apple Wallet pass:', error.message);
      console.error('Stack:', error.stack);
      throw new Error(`Failed to generate Apple Wallet pass: ${error.message}`);
    }
  }

  getLastAuthToken() {
    return this._lastGeneratedAuthToken;
  }

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

  async cleanupOldPasses() {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000;

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
   * IMPROVED: Validate pass buffer with detailed checks
   */
  validatePassBuffer(passBuffer) {
    try {
      if (!Buffer.isBuffer(passBuffer)) {
        console.error('❌ Pass buffer is not a valid Buffer object');
        return false;
      }

      if (passBuffer.length === 0) {
        console.error('❌ Pass buffer is empty');
        return false;
      }

      // Check for PKPass signature (ZIP file magic number: PK\x03\x04)
      const header = passBuffer.slice(0, 4).toString('hex');
      if (!header.startsWith('504b0304')) {
        console.error('❌ Pass buffer does not have valid ZIP signature');
        console.error(`   Found header: ${header}, expected: 504b0304...`);
        return false;
      }

      // Check minimum size (a valid .pkpass should be at least a few KB)
      if (passBuffer.length < 5000) {
        console.warn('⚠️  Pass buffer seems unusually small:', passBuffer.length, 'bytes');
      }

      console.log('✅ Pass buffer validation passed');
      return true;
    } catch (error) {
      console.error('❌ Error validating pass buffer:', error.message);
      return false;
    }
  }
}

export const appleWalletGenerator = new AppleWalletGenerator();
