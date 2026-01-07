import dotenv from 'dotenv';

dotenv.config();

/**
 * Validate employee data before pass creation
 */
export const validateEmployeeDataForApple = (employee) => {
  const required = ['name', 'email', 'phone_number', 'designation', 'employee_id'];
  const missing = required.filter((field) => !employee[field]);

  if (missing.length > 0) {
    throw new Error(`Missing required employee fields for Apple Wallet: ${missing.join(', ')}`);
  }

  return true;
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
