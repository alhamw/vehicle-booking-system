const { Booking, User, Vehicle, Driver, Approval } = require('./backend/models');

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

async function createBookings() {
  try {
    console.log('🎯 Starting to create 100 bookings...\n');
    
    // Fetch all required data
    console.log('📊 Fetching system data...');
    const [users, vehicles, drivers] = await Promise.all([
      User.findAll(),
      Vehicle.findAll(),
      Driver.findAll()
    ]);

    // Filter users by role
    const employees = users.filter(user => user.role === 'employee');
    const approversL1 = users.filter(user => user.role === 'approver_l1');
    const approversL2 = users.filter(user => user.role === 'approver_l2');

    console.log(`📋 Data fetched:`);
    console.log(`   - Employees: ${employees.length}`);
    console.log(`   - Approvers L1: ${approversL1.length}`);
    console.log(`   - Approvers L2: ${approversL2.length}`);
    console.log(`   - Vehicles: ${vehicles.length}`);
    console.log(`   - Drivers: ${drivers.length}\n`);

    if (employees.length === 0) {
      throw new Error('No employees found');
    }
    if (approversL1.length === 0 || approversL2.length === 0) {
      throw new Error('Not enough approvers found');
    }
    if (vehicles.length === 0) {
      throw new Error('No vehicles found');
    }
    if (drivers.length === 0) {
      throw new Error('No drivers found');
    }

    // Generate and create bookings
    const results = { success: 0, failed: 0, errors: [] };
    
    for (let i = 1; i <= 100; i++) {
      try {
        // Generate random booking data
        const randomEmployee = employees[Math.floor(Math.random() * employees.length)];
        const randomVehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
        const randomDriver = drivers[Math.floor(Math.random() * drivers.length)];
        const randomApproverL1 = approversL1[Math.floor(Math.random() * approversL1.length)];
        const randomApproverL2 = approversL2[Math.floor(Math.random() * approversL2.length)];
        
        // Generate random dates (1-30 days from now for start, 1-7 days duration)
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 30) + 1);
        
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 7) + 1);
        
        const randomNote = SAMPLE_NOTES[Math.floor(Math.random() * SAMPLE_NOTES.length)];
        const randomDepartment = DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)];

        const bookingData = {
          user_id: randomEmployee.id,
          created_by: 1, // Admin user ID
          vehicle_id: randomVehicle.id,
          driver_id: randomDriver.id,
          start_date: startDate,
          end_date: endDate,
          status: 'pending',
          department: randomDepartment,
          notes: `${randomNote} - ${randomDepartment} Department`
        };

        // Create booking
        const booking = await Booking.create(bookingData);

        // Create approval records
        await Promise.all([
          Approval.create({
            booking_id: booking.id,
            approver_id: randomApproverL1.id,
            level: 1,
            status: 'pending'
          }),
          Approval.create({
            booking_id: booking.id,
            approver_id: randomApproverL2.id,
            level: 2,
            status: 'pending'
          })
        ]);

        results.success++;
        console.log(`✅ Booking ${i}/100 created - ID: ${booking.id}`);
        
      } catch (error) {
        results.failed++;
        results.errors.push({
          booking: i,
          error: error.message
        });
        console.log(`❌ Booking ${i}/100 failed: ${error.message}`);
      }
    }

    console.log('\n📊 Final Results:');
    console.log(`✅ Successful: ${results.success}`);
    console.log(`❌ Failed: ${results.failed}`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ First few errors:');
      results.errors.slice(0, 5).forEach(error => {
        console.log(`   Booking ${error.booking}: ${error.error}`);
      });
    }
    
    console.log('\n🎉 Booking generation completed!');
    
  } catch (error) {
    console.error('💥 Fatal error:', error.message);
  } finally {
    process.exit(0);
  }
}

createBookings();

