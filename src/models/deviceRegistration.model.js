import mongoose from 'mongoose';

/**
 * Device Registration Model
 * Stores Apple Wallet device registrations for push notifications and pass updates
 *
 * According to Apple's PassKit Web Service specification:
 * https://developer.apple.com/documentation/walletpasses/adding_a_web_service_to_update_passes
 */

const deviceRegistrationSchema = new mongoose.Schema(
  {
    // Device Library Identifier - unique identifier for the device
    device_library_identifier: {
      type: String,
      required: [true, 'Device library identifier is required'],
      trim: true,
      index: true,
    },

    // Push Token - used to send push notifications to the device
    push_token: {
      type: String,
      required: [true, 'Push token is required'],
      trim: true,
    },

    // Pass Type Identifier (e.g., pass.com.eurosystemsint.nfc)
    pass_type_identifier: {
      type: String,
      required: [true, 'Pass type identifier is required'],
      trim: true,
      index: true,
    },

    // Serial Number of the pass
    serial_number: {
      type: String,
      required: [true, 'Serial number is required'],
      trim: true,
      index: true,
    },

    // Reference to the Employee who owns this pass
    employee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee ID is required'],
      index: true,
    },

    // Timestamps
    registered_at: {
      type: Date,
      default: Date.now,
      index: true,
    },

    last_updated: {
      type: Date,
      default: Date.now,
    },

    // Status tracking
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Metadata
    device_metadata: {
      user_agent: String,
      ip_address: String,
      registration_source: {
        type: String,
        enum: ['ios', 'macos', 'watchos', 'unknown'],
        default: 'unknown',
      },
    },

    // Track unregistration
    unregistered_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'device_registrations',
  }
);

// ============================================
// COMPOUND INDEXES for better query performance
// ============================================

// Unique index: One device can only register once for a specific pass
deviceRegistrationSchema.index(
  {
    device_library_identifier: 1,
    pass_type_identifier: 1,
    serial_number: 1,
  },
  { unique: true }
);

// Query passes for a specific device and pass type (for getSerialNumbers endpoint)
deviceRegistrationSchema.index({
  device_library_identifier: 1,
  pass_type_identifier: 1,
  is_active: 1,
  last_updated: 1,
});

// Find all devices registered for a specific pass (for push notifications)
deviceRegistrationSchema.index({
  serial_number: 1,
  is_active: 1,
});

// Find all registrations for an employee
deviceRegistrationSchema.index({
  employee_id: 1,
  is_active: 1,
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Mark this registration as inactive (soft delete)
 */
deviceRegistrationSchema.methods.deactivate = function () {
  this.is_active = false;
  this.unregistered_at = new Date();
  return this.save();
};

/**
 * Update the push token
 */
deviceRegistrationSchema.methods.updatePushToken = function (newToken) {
  this.push_token = newToken;
  this.last_updated = new Date();
  return this.save();
};

/**
 * Update last_updated timestamp (when pass is modified)
 */
deviceRegistrationSchema.methods.touch = function () {
  this.last_updated = new Date();
  return this.save();
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Register a device for push notifications
 * @param {Object} data - Registration data
 * @returns {Promise<Object>} Registration result
 */
deviceRegistrationSchema.statics.registerDevice = async function (data) {
  const {
    deviceLibraryIdentifier,
    pushToken,
    passTypeIdentifier,
    serialNumber,
    employeeId,
    metadata,
  } = data;

  try {
    // Check if already registered
    const existing = await this.findOne({
      device_library_identifier: deviceLibraryIdentifier,
      pass_type_identifier: passTypeIdentifier,
      serial_number: serialNumber,
    });

    if (existing) {
      // Update existing registration
      if (existing.push_token !== pushToken) {
        existing.push_token = pushToken;
        existing.last_updated = new Date();
        existing.is_active = true;
        existing.unregistered_at = null;
        if (metadata) existing.device_metadata = { ...existing.device_metadata, ...metadata };
        await existing.save();
        return { status: 'updated', registration: existing };
      }
      return { status: 'already_registered', registration: existing };
    }

    // Create new registration
    const registration = await this.create({
      device_library_identifier: deviceLibraryIdentifier,
      push_token: pushToken,
      pass_type_identifier: passTypeIdentifier,
      serial_number: serialNumber,
      employee_id: employeeId,
      device_metadata: metadata || {},
    });

    return { status: 'created', registration };
  } catch (error) {
    throw new Error(`Failed to register device: ${error.message}`);
  }
};

/**
 * Unregister a device
 * @param {String} deviceLibraryIdentifier
 * @param {String} passTypeIdentifier
 * @param {String} serialNumber
 * @returns {Promise<Boolean>}
 */
deviceRegistrationSchema.statics.unregisterDevice = async function (
  deviceLibraryIdentifier,
  passTypeIdentifier,
  serialNumber
) {
  const registration = await this.findOne({
    device_library_identifier: deviceLibraryIdentifier,
    pass_type_identifier: passTypeIdentifier,
    serial_number: serialNumber,
    is_active: true,
  });

  if (!registration) {
    return false;
  }

  await registration.deactivate();
  return true;
};

/**
 * Get serial numbers for passes registered to a device, updated since a given date
 * @param {String} deviceLibraryIdentifier
 * @param {String} passTypeIdentifier
 * @param {Date} updatedSince - Optional date filter
 * @returns {Promise<Array>} Array of serial numbers
 */
deviceRegistrationSchema.statics.getUpdatedSerialNumbers = async function (
  deviceLibraryIdentifier,
  passTypeIdentifier,
  updatedSince = null
) {
  const query = {
    device_library_identifier: deviceLibraryIdentifier,
    pass_type_identifier: passTypeIdentifier,
    is_active: true,
  };

  // Add date filter if provided
  if (updatedSince) {
    query.last_updated = { $gt: new Date(updatedSince) };
  }

  const registrations = await this.find(query)
    .select('serial_number last_updated')
    .sort({ last_updated: -1 });

  return registrations.map((reg) => reg.serial_number);
};

/**
 * Get all active devices for a specific pass (for push notifications)
 * @param {String} serialNumber
 * @returns {Promise<Array>} Array of device registrations
 */
deviceRegistrationSchema.statics.getDevicesForPass = async function (serialNumber) {
  return this.find({
    serial_number: serialNumber,
    is_active: true,
  }).select('device_library_identifier push_token');
};

/**
 * Mark all registrations for a pass as updated (when pass content changes)
 * @param {String} serialNumber
 * @returns {Promise<Number>} Number of updated registrations
 */
deviceRegistrationSchema.statics.touchPassRegistrations = async function (serialNumber) {
  const result = await this.updateMany(
    {
      serial_number: serialNumber,
      is_active: true,
    },
    {
      $set: { last_updated: new Date() },
    }
  );

  return result.modifiedCount;
};

/**
 * Get registration statistics
 * @returns {Promise<Object>} Statistics object
 */
deviceRegistrationSchema.statics.getStatistics = async function () {
  const [totalActive, totalInactive, byPassType, byEmployee] = await Promise.all([
    this.countDocuments({ is_active: true }),
    this.countDocuments({ is_active: false }),
    this.aggregate([
      { $match: { is_active: true } },
      { $group: { _id: '$pass_type_identifier', count: { $sum: 1 } } },
    ]),
    this.aggregate([
      { $match: { is_active: true } },
      { $group: { _id: '$employee_id', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  return {
    total_active_registrations: totalActive,
    total_inactive_registrations: totalInactive,
    by_pass_type: byPassType,
    top_employees_by_devices: byEmployee,
  };
};

/**
 * Cleanup old inactive registrations (older than 90 days)
 * @returns {Promise<Number>} Number of deleted registrations
 */
deviceRegistrationSchema.statics.cleanupOldRegistrations = async function () {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const result = await this.deleteMany({
    is_active: false,
    unregistered_at: { $lt: ninetyDaysAgo },
  });

  return result.deletedCount;
};

// ============================================
// MIDDLEWARE
// ============================================

// Update last_updated timestamp before save
deviceRegistrationSchema.pre('save', function (next) {
  if (this.isModified() && !this.isNew) {
    this.last_updated = new Date();
  }
  next();
});

// ============================================
// EXPORT MODEL
// ============================================

export const DeviceRegistration = mongoose.model('DeviceRegistration', deviceRegistrationSchema);
