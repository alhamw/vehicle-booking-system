const ExcelJS = require('exceljs');
const { AuditLog, User, Vehicle, Driver } = require('../models');

/**
 * Service responsible for exporting booking activities to Excel format
 * Follows Single Responsibility Principle - only handles export logic
 */
class BookingActivityExportService {
  constructor() {
    this.workbook = new ExcelJS.Workbook();
  }

  /**
   * Export booking activities to Excel format
   * @param {string} bookingId - The booking ID to export activities for
   * @returns {Promise<Buffer>} Excel file buffer
   */
  async exportActivities(bookingId) {
    try {
      // Get activities data
      const activities = await this.getActivitiesData(bookingId);
      
      // Create lookup maps for better performance
      const lookupMaps = await this.createLookupMaps(activities);
      
      // Generate Excel file
      const buffer = await this.generateExcelFile(activities, lookupMaps);
      
      return buffer;
    } catch (error) {
      throw new Error(`Failed to export booking activities: ${error.message}`);
    }
  }

  /**
   * Get activities data from database
   * @param {string} bookingId - The booking ID
   * @returns {Promise<Array>} Array of activities
   */
  async getActivitiesData(bookingId) {
    return await AuditLog.findAll({
      where: {
        entity_type: 'booking',
        entity_id: bookingId
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'role']
        }
      ],
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * Create lookup maps for efficient data retrieval
   * @param {Array} activities - Array of activities
   * @returns {Promise<Object>} Object containing lookup maps
   */
  async createLookupMaps(activities) {
    const vehicleIds = new Set();
    const driverIds = new Set();
    const userIds = new Set();

    // Collect all unique IDs from activities
    activities.forEach(activity => {
      this.collectIdsFromValues(activity.old_values, vehicleIds, driverIds, userIds);
      this.collectIdsFromValues(activity.new_values, vehicleIds, driverIds, userIds);
    });

    // Fetch related data in parallel
    const [vehicles, drivers, users] = await Promise.all([
      this.fetchVehicles(Array.from(vehicleIds)),
      this.fetchDrivers(Array.from(driverIds)),
      this.fetchUsers(Array.from(userIds))
    ]);

    return {
      vehicleMap: this.createMap(vehicles, 'id'),
      driverMap: this.createMap(drivers, 'id'),
      userMap: this.createMap(users, 'id')
    };
  }

  /**
   * Collect IDs from activity values
   * @param {Object} values - Activity values object
   * @param {Set} vehicleIds - Set to collect vehicle IDs
   * @param {Set} driverIds - Set to collect driver IDs
   * @param {Set} userIds - Set to collect user IDs
   */
  collectIdsFromValues(values, vehicleIds, driverIds, userIds) {
    if (!values) return;

    const idFields = {
      vehicle_id: vehicleIds,
      driver_id: driverIds,
      user_id: userIds,
      employee_id: userIds,
      approver_l1_id: userIds,
      approver_l2_id: userIds
    };

    Object.entries(idFields).forEach(([field, set]) => {
      if (values[field]) set.add(values[field]);
    });
  }

  /**
   * Fetch vehicles by IDs
   * @param {Array} vehicleIds - Array of vehicle IDs
   * @returns {Promise<Array>} Array of vehicles
   */
  async fetchVehicles(vehicleIds) {
    if (vehicleIds.length === 0) return [];
    return await Vehicle.findAll({
      where: { id: vehicleIds },
      attributes: ['id', 'plate_number', 'make', 'model']
    });
  }

  /**
   * Fetch drivers by IDs
   * @param {Array} driverIds - Array of driver IDs
   * @returns {Promise<Array>} Array of drivers
   */
  async fetchDrivers(driverIds) {
    if (driverIds.length === 0) return [];
    return await Driver.findAll({
      where: { id: driverIds },
      attributes: ['id', 'name', 'license_number']
    });
  }

  /**
   * Fetch users by IDs
   * @param {Array} userIds - Array of user IDs
   * @returns {Promise<Array>} Array of users
   */
  async fetchUsers(userIds) {
    if (userIds.length === 0) return [];
    return await User.findAll({
      where: { id: userIds },
      attributes: ['id', 'name', 'email', 'role']
    });
  }

  /**
   * Create a map from array of objects
   * @param {Array} items - Array of objects
   * @param {string} keyField - Field to use as key
   * @returns {Map} Map with keyField as key and item as value
   */
  createMap(items, keyField) {
    const map = new Map();
    items.forEach(item => map.set(item[keyField], item));
    return map;
  }

  /**
   * Generate Excel file from activities data
   * @param {Array} activities - Array of activities
   * @param {Object} lookupMaps - Object containing lookup maps
   * @returns {Promise<Buffer>} Excel file buffer
   */
  async generateExcelFile(activities, lookupMaps) {
    const worksheet = this.workbook.addWorksheet('Booking Activities');
    
    // Define columns
    this.setupWorksheetColumns(worksheet);
    
    // Add data rows
    activities.forEach(activity => {
      const rowData = this.formatActivityRow(activity, lookupMaps);
      worksheet.addRow(rowData);
    });
    
    // Style the header row
    this.styleHeaderRow(worksheet);
    
    // Generate buffer
    return await this.workbook.xlsx.writeBuffer();
  }

  /**
   * Setup worksheet columns
   * @param {Object} worksheet - ExcelJS worksheet object
   */
  setupWorksheetColumns(worksheet) {
    worksheet.columns = [
      { header: 'Activity ID', key: 'id', width: 10 },
      { header: 'Action', key: 'action', width: 15 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'User', key: 'user', width: 25 },
      { header: 'User Role', key: 'user_role', width: 15 },
      { header: 'Timestamp', key: 'timestamp', width: 20 },
      { header: 'IP Address', key: 'ip_address', width: 15 },
      { header: 'Old Values', key: 'old_values', width: 30 },
      { header: 'New Values', key: 'new_values', width: 30 }
    ];
  }

  /**
   * Format activity row for Excel
   * @param {Object} activity - Activity object
   * @param {Object} lookupMaps - Object containing lookup maps
   * @returns {Object} Formatted row data
   */
  formatActivityRow(activity, lookupMaps) {
    const description = this.generateActivityDescription(activity, lookupMaps);
    
    return {
      id: activity.id,
      action: activity.action,
      description: description,
      user: activity.user ? activity.user.name : 'System',
      user_role: activity.user ? activity.user.role.replace('_', ' ').toUpperCase() : 'SYSTEM',
      timestamp: new Date(activity.created_at).toLocaleString('en-GB'),
      ip_address: activity.ip_address || 'N/A',
      old_values: activity.old_values ? JSON.stringify(activity.old_values) : 'N/A',
      new_values: activity.new_values ? JSON.stringify(activity.new_values) : 'N/A'
    };
  }

  /**
   * Generate human-readable activity description
   * @param {Object} activity - Activity object
   * @param {Object} lookupMaps - Object containing lookup maps
   * @returns {string} Human-readable description
   */
  generateActivityDescription(activity, lookupMaps) {
    const descriptionMap = {
      'CREATE': 'Booking created',
      'UPDATE': this.generateUpdateDescription(activity, lookupMaps),
      'CANCEL': 'Booking cancelled',
      'APPROVE': 'Booking approved',
      'REJECT': 'Booking rejected'
    };

    return descriptionMap[activity.action] || activity.description || activity.action;
  }

  /**
   * Generate update description with field changes
   * @param {Object} activity - Activity object
   * @param {Object} lookupMaps - Object containing lookup maps
   * @returns {string} Update description with changes
   */
  generateUpdateDescription(activity, lookupMaps) {
    let description = 'Booking updated';
    
    if (activity.old_values && activity.new_values) {
      const changes = this.extractFieldChanges(activity, lookupMaps);
      if (changes.length > 0) {
        description += ` (${changes.join(', ')})`;
      }
    }
    
    return description;
  }

  /**
   * Extract field changes from activity
   * @param {Object} activity - Activity object
   * @param {Object} lookupMaps - Object containing lookup maps
   * @returns {Array} Array of change descriptions
   */
  extractFieldChanges(activity, lookupMaps) {
    const changes = [];
    
    Object.keys(activity.new_values).forEach(key => {
      if (activity.old_values[key] !== activity.new_values[key]) {
        const fieldName = this.formatFieldName(key);
        const oldValue = this.formatFieldValue(key, activity.old_values[key], lookupMaps);
        const newValue = this.formatFieldValue(key, activity.new_values[key], lookupMaps);
        changes.push(`${fieldName}: ${oldValue} → ${newValue}`);
      }
    });
    
    return changes;
  }

  /**
   * Format field name for display
   * @param {string} field - Field name
   * @returns {string} Formatted field name
   */
  formatFieldName(field) {
    const fieldMap = {
      'vehicle_id': 'Vehicle',
      'driver_id': 'Driver',
      'user_id': 'Employee',
      'employee_id': 'Employee',
      'start_date': 'Start Date',
      'end_date': 'End Date',
      'notes': 'Notes',
      'status': 'Status',
      'approver_l1_id': 'First Approver',
      'approver_l2_id': 'Second Approver'
    };
    
    return fieldMap[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Format field value for display
   * @param {string} field - Field name
   * @param {*} value - Field value
   * @param {Object} lookupMaps - Object containing lookup maps
   * @returns {string} Formatted field value
   */
  formatFieldValue(field, value, lookupMaps) {
    if (!value) return 'None';
    
    if (field.includes('_date')) {
      return new Date(value).toLocaleDateString('en-GB');
    }
    
    if (field === 'vehicle_id' && typeof value === 'number') {
      const vehicle = lookupMaps.vehicleMap.get(value);
      return vehicle ? `${vehicle.plate_number} (${vehicle.make} ${vehicle.model})` : `Vehicle ID: ${value}`;
    }
    
    if (field === 'driver_id' && typeof value === 'number') {
      const driver = lookupMaps.driverMap.get(value);
      return driver ? `${driver.name} (${driver.license_number})` : `Driver ID: ${value}`;
    }
    
    if (field.includes('_id') && typeof value === 'number' && !['vehicle_id', 'driver_id'].includes(field)) {
      const user = lookupMaps.userMap.get(value);
      return user ? `${user.name} (${user.role.replace('_', ' ').toUpperCase()})` : `User ID: ${value}`;
    }
    
    if (field === 'status') {
      return value.replace('_', ' ').toUpperCase();
    }
    
    return value;
  }

  /**
   * Style the header row
   * @param {Object} worksheet - ExcelJS worksheet object
   */
  styleHeaderRow(worksheet) {
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  }
}

module.exports = BookingActivityExportService;

