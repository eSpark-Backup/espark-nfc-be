import dotenv from 'dotenv';

dotenv.config();

/**
 * Apple Wallet Pass Template for Employee Cards
 * Defines the structure and design of employee passes
 */

/**
 * Create pass.json structure for Apple Wallet
 * @param {Object} employee - Employee data
 * @param {Object} companyProfile - Company profile data
 * @param {string} serialNumber - Unique serial number for this pass
 * @returns {Object} Pass JSON structure
 */
export const createApplePassJSON = (employee, companyProfile, serialNumber) => {
  const passTypeId = process.env.APPLE_PASS_TYPE_ID;
  const teamId = process.env.APPLE_TEAM_ID;

  return {
    formatVersion: 1,
    passTypeIdentifier: passTypeId,
    serialNumber: serialNumber,
    teamIdentifier: teamId,
    organizationName: companyProfile?.company_name || 'Company',
    description: `${employee.name} - Employee Card`,

    // Pass appearance
    backgroundColor: 'rgb(26, 115, 232)', // Blue color
    foregroundColor: 'rgb(255, 255, 255)', // White text
    labelColor: 'rgb(255, 255, 255)', // White labels

    // Logo text (appears next to logo on pass)
    logoText: companyProfile?.company_name || 'Company',

    // Barcode/QR code
    barcodes: [
      {
        format: 'PKBarcodeFormatQR',
        message: `${process.env.BASE_URL}/api/employees/${employee.employee_id}/contact`,
        messageEncoding: 'iso-8859-1',
        altText: employee.employee_id,
      },
    ],

    // Generic pass type (most flexible)
    generic: {
      // Primary fields (large, prominent)
      primaryFields: [
        {
          key: 'name',
          label: 'NAME',
          value: employee.name,
          textAlignment: 'PKTextAlignmentLeft',
        },
      ],

      // Secondary fields (medium size, below primary)
      secondaryFields: [
        {
          key: 'designation',
          label: 'DESIGNATION',
          value: employee.designation,
          textAlignment: 'PKTextAlignmentLeft',
        },
        {
          key: 'employee_id',
          label: 'EMPLOYEE ID',
          value: employee.employee_id,
          textAlignment: 'PKTextAlignmentRight',
        },
      ],

      // Auxiliary fields (smaller, below secondary)
      auxiliaryFields: [
        {
          key: 'department',
          label: 'DEPARTMENT',
          value: employee.department_id?.name || 'N/A',
          textAlignment: 'PKTextAlignmentLeft',
        },
        {
          key: 'joining_date',
          label: 'JOINED',
          value: new Date(employee.joining_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
          textAlignment: 'PKTextAlignmentRight',
        },
      ],

      // Back fields (detailed information on back of pass)
      backFields: [
        {
          key: 'email',
          label: 'Email',
          value: employee.email,
          textAlignment: 'PKTextAlignmentLeft',
        },
        {
          key: 'phone',
          label: 'Phone',
          value: employee.phone_number,
          textAlignment: 'PKTextAlignmentLeft',
        },
        ...(employee.second_phone_number
          ? [
              {
                key: 'second_phone',
                label: 'Alternate Phone',
                value: employee.second_phone_number,
                textAlignment: 'PKTextAlignmentLeft',
              },
            ]
          : []),
        {
          key: 'address',
          label: 'Address',
          value: employee.address,
          textAlignment: 'PKTextAlignmentLeft',
        },
        {
          key: 'about',
          label: 'About',
          value: employee.about_me,
          textAlignment: 'PKTextAlignmentLeft',
        },
        ...(employee.social_links?.linkedin
          ? [
              {
                key: 'linkedin',
                label: 'LinkedIn',
                value: employee.social_links.linkedin,
                textAlignment: 'PKTextAlignmentLeft',
                attributedValue: `<a href="${employee.social_links.linkedin}">LinkedIn Profile</a>`,
              },
            ]
          : []),
        ...(employee.social_links?.facebook
          ? [
              {
                key: 'facebook',
                label: 'Facebook',
                value: employee.social_links.facebook,
                textAlignment: 'PKTextAlignmentLeft',
                attributedValue: `<a href="${employee.social_links.facebook}">Facebook Profile</a>`,
              },
            ]
          : []),
        ...(employee.social_links?.twitter
          ? [
              {
                key: 'twitter',
                label: 'Twitter',
                value: employee.social_links.twitter,
                textAlignment: 'PKTextAlignmentLeft',
                attributedValue: `<a href="${employee.social_links.twitter}">Twitter Profile</a>`,
              },
            ]
          : []),
        ...(employee.social_links?.instagram
          ? [
              {
                key: 'instagram',
                label: 'Instagram',
                value: employee.social_links.instagram,
                textAlignment: 'PKTextAlignmentLeft',
                attributedValue: `<a href="${employee.social_links.instagram}">Instagram Profile</a>`,
              },
            ]
          : []),
        ...(employee.social_links?.youtube
          ? [
              {
                key: 'youtube',
                label: 'Youtube',
                value: employee.social_links.youtube,
                textAlignment: 'PKTextAlignmentLeft',
                attributedValue: `<a href="${employee.social_links.youtube}">Youtube Account</a>`,
              },
            ]
          : []),
      ],
    },

    // Relevance (location-based notifications - optional)
    // You can add locations where pass is relevant
    // locations: [
    //   {
    //     latitude: 37.3230,
    //     longitude: -122.0322,
    //     relevantText: 'Welcome to the office!',
    //   },
    // ],

    // Web service for pass updates (optional - for advanced features)
    // webServiceURL: `${process.env.BASE_URL}/api/apple-wallet`,
    // authenticationToken: 'your-auth-token',
  };
};

/**
 * Define required images for Apple Wallet pass
 * Returns image specifications and their purposes
 */
export const getRequiredImages = () => {
  return {
    icon: {
      name: 'icon',
      required: true,
      sizes: {
        '1x': { width: 29, height: 29 },
        '2x': { width: 58, height: 58 },
        '3x': { width: 87, height: 87 },
      },
      description: 'Small icon shown in notifications and on lock screen',
    },
    logo: {
      name: 'logo',
      required: true,
      sizes: {
        '1x': { width: 160, height: 50 },
        '2x': { width: 320, height: 100 },
        '3x': { width: 480, height: 150 },
      },
      description: 'Company logo shown at top of pass',
    },
    strip: {
      name: 'strip',
      required: false, // Optional for generic passes
      sizes: {
        '1x': { width: 375, height: 123 },
        '2x': { width: 750, height: 246 },
        '3x': { width: 1125, height: 369 },
      },
      description: 'Large image shown behind primary fields (employee photo)',
    },
    thumbnail: {
      name: 'thumbnail',
      required: false,
      sizes: {
        '1x': { width: 90, height: 90 },
        '2x': { width: 180, height: 180 },
        '3x': { width: 270, height: 270 },
      },
      description: 'Small image shown on front of pass',
    },
  };
};

/**
 * Validate employee data before pass creation
 */
export const validateEmployeeDataForApple = (employee) => {
  const required = ['name', 'email', 'phone_number', 'designation', 'employee_id', 'joining_date'];
  const missing = required.filter((field) => !employee[field]);

  if (missing.length > 0) {
    throw new Error(`Missing required employee fields for Apple Wallet: ${missing.join(', ')}`);
  }

  return true;
};

/**
 * Get pass style configuration
 */
export const getPassStyleConfig = () => {
  return {
    // Colors
    backgroundColor: 'rgb(26, 115, 232)', // Blue
    foregroundColor: 'rgb(255, 255, 255)', // White
    labelColor: 'rgb(255, 255, 255)', // White

    // Alternative color schemes you can use:
    // Dark theme:
    // backgroundColor: 'rgb(30, 30, 30)',
    // foregroundColor: 'rgb(255, 255, 255)',
    // labelColor: 'rgb(180, 180, 180)',

    // Corporate blue:
    // backgroundColor: 'rgb(0, 51, 102)',
    // foregroundColor: 'rgb(255, 255, 255)',
    // labelColor: 'rgb(204, 229, 255)',
  };
};

/**
 * Create manifest.json structure
 * Lists all files in the pass with their SHA-1 hashes
 */
export const createManifestStructure = () => {
  return {
    // Will be populated with file hashes during pass generation
    // Example:
    // 'pass.json': 'sha1-hash-here',
    // 'icon.png': 'sha1-hash-here',
    // 'icon@2x.png': 'sha1-hash-here',
    // 'logo.png': 'sha1-hash-here',
    // etc.
  };
};

/**
 * Get pass metadata for tracking
 */
export const getPassMetadata = (employee, serialNumber) => {
  return {
    employeeId: employee._id,
    employeeCode: employee.employee_id,
    serialNumber: serialNumber,
    createdAt: new Date(),
    passType: 'employee_card',
    version: '1.0',
  };
};

/**
 * Helper to format employee data for pass display
 */
export const formatEmployeeForPass = (employee) => {
  return {
    name: employee.name.trim(),
    designation: employee.designation.trim(),
    employeeId: employee.employee_id,
    email: employee.email.toLowerCase(),
    phone: employee.phone_number,
    department: employee.department_id?.name || 'Not Assigned',
    joiningDate: new Date(employee.joining_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    address: employee.address,
    about: employee.about_me,
    socialLinks: employee.social_links || {},
  };
};
