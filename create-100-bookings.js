const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:5001/api';
const ADMIN_CREDENTIALS = {
  email: 'admin@miningcompany.com',
  password: 'admin123'
};

// Sample data for generating bookings
const SAMPLE_NOTES = [
  'Mining operation transport',
  'Equipment delivery to site',
  'Personnel transport',
  'Material hauling',
  'Site inspection visit',
  'Emergency response',
  'Maintenance support',
  'Project coordination',
  'Safety equipment transport',
  'Fuel delivery'
];

const DEPARTMENTS = [
  'Mining',
  'Maintenance', 
  'Safety',
  'Operations',
  'Logistics',
  'Engineering',
  'Administration'
];

class BookingGenerator {
  constructor() {
    this.token = null;
    this.users = [];
    this.vehicles = [];
    this.drivers = [];
    this.approvers = [];
    this.employees = [];
  }

  async login() {
    try {
      console.log('🔐 Logging in as admin...');
      const response = await axios.post(`${API_BASE_URL}/auth/login`, ADMIN_CREDENTIALS);
      this.token = response.data.token;
      console.log('✅ Login successful');
    } catch (error) {
      console.error('❌ Login failed:', error.response?.data?.message || error.message);
      throw error;
    }
  }

  async fetchData() {
    try {
      console.log('📊 Fetching system data...');
      
      const headers = { Authorization: `Bearer ${this.token}` };
      
      // Fetch all required data in parallel
      const [usersResponse, vehiclesResponse, driversResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/users`, { headers }),
        axios.get(`${API_BASE_URL}/vehicles`, { headers }),
        axios.get(`${API_BASE_URL}/drivers`, { headers })
      ]);

      this.users = usersResponse.data.users;
      this.vehicles = vehiclesResponse.data.vehicles;
      this.drivers = driversResponse.data.drivers;

      // Filter users by role
      this.approvers = this.users.filter(user => 
        ['approver_l1', 'approver_l2'].includes(user.role)
      );
      this.employees = this.users.filter(user => user.role === 'employee');

      console.log(`📋 Data fetched:`);
      console.log(`   - Users: ${this.users.length}`);
      console.log(`   - Vehicles: ${this.vehicles.length}`);
      console.log(`   - Drivers: ${this.drivers.length}`);
      console.log(`   - Approvers: ${this.approvers.length}`);
      console.log(`   - Employees: ${this.employees.length}`);

      if (this.employees.length === 0) {
        throw new Error('No employees found. Please ensure there are users with "employee" role.');
      }
      if (this.approvers.length < 2) {
        throw new Error('Not enough approvers found. Need at least 2 approvers.');
      }
      if (this.vehicles.length === 0) {
        throw new Error('No vehicles found.');
      }
      if (this.drivers.length === 0) {
        throw new Error('No drivers found.');
      }

    } catch (error) {
      console.error('❌ Failed to fetch data:', error.response?.data?.message || error.message);
      throw error;
    }
  }

  generateRandomDate(startDaysFromNow = 1, endDaysFromNow = 30) {
    const start = new Date();
    start.setDate(start.getDate() + startDaysFromNow);
    
    const end = new Date();
    end.setDate(end.getDate() + endDaysFromNow);
    
    const startTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
    const endTime = startTime + (Math.random() * 7 + 1) * 24 * 60 * 60 * 1000; // 1-8 days duration
    
    return {
      start_date: new Date(startTime).toISOString(),
      end_date: new Date(endTime).toISOString()
    };
  }

  generateRandomBooking() {
    const randomEmployee = this.employees[Math.floor(Math.random() * this.employees.length)];
    const randomVehicle = this.vehicles[Math.floor(Math.random() * this.vehicles.length)];
    const randomDriver = this.drivers[Math.floor(Math.random() * this.drivers.length)];
    
    // Get random approvers (ensure they're different)
    let approverL1, approverL2;
    do {
      approverL1 = this.approvers[Math.floor(Math.random() * this.approvers.length)];
      approverL2 = this.approvers[Math.floor(Math.random() * this.approvers.length)];
    } while (approverL1.id === approverL2.id);

    const dates = this.generateRandomDate();
    const randomNote = SAMPLE_NOTES[Math.floor(Math.random() * SAMPLE_NOTES.length)];
    const randomDepartment = DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)];

    return {
      vehicle_id: randomVehicle.id,
      driver_id: randomDriver.id,
      employee_id: randomEmployee.id,
      approver_l1_id: approverL1.id,
      approver_l2_id: approverL2.id,
      start_date: dates.start_date,
      end_date: dates.end_date,
      notes: `${randomNote} - ${randomDepartment} Department`,
      department: randomDepartment
    };
  }

  async createBooking(bookingData) {
    try {
      const headers = { Authorization: `Bearer ${this.token}` };
      const response = await axios.post(`${API_BASE_URL}/bookings`, bookingData, { headers });
      return response.data;
    } catch (error) {
      console.error('❌ Failed to create booking:', error.response?.data?.message || error.message);
      throw error;
    }
  }

  async createBookings(count = 100) {
    console.log(`🚀 Creating ${count} bookings...`);
    
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (let i = 1; i <= count; i++) {
      try {
        const bookingData = this.generateRandomBooking();
        const result = await this.createBooking(bookingData);
        
        results.success++;
        console.log(`✅ Booking ${i}/${count} created - ID: ${result.booking.id}`);
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        results.failed++;
        results.errors.push({
          booking: i,
          error: error.response?.data?.message || error.message
        });
        console.log(`❌ Booking ${i}/${count} failed: ${error.response?.data?.message || error.message}`);
      }
    }

    return results;
  }

  async run() {
    try {
      console.log('🎯 Starting booking generation process...\n');
      
      await this.login();
      await this.fetchData();
      
      const results = await this.createBookings(100);
      
      console.log('\n📊 Final Results:');
      console.log(`✅ Successful: ${results.success}`);
      console.log(`❌ Failed: ${results.failed}`);
      
      if (results.errors.length > 0) {
        console.log('\n❌ Errors:');
        results.errors.forEach(error => {
          console.log(`   Booking ${error.booking}: ${error.error}`);
        });
      }
      
      console.log('\n🎉 Booking generation completed!');
      
    } catch (error) {
      console.error('💥 Fatal error:', error.message);
      process.exit(1);
    }
  }
}

// Run the generator
const generator = new BookingGenerator();
generator.run();

