const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'vehicle_booking_db',
  user: process.env.USER || 'styletheory',
  password: ''
});

const departments = ['Mining', 'Maintenance', 'IT', 'Logistics', 'Engineering'];
const purposes = [
  'Site inspection and maintenance',
  'Equipment transport to mining site',
  'Staff transportation for shift change',
  'Material delivery to construction site',
  'Emergency response and rescue',
  'Regular maintenance and service',
  'Client site visit and demonstration',
  'Equipment relocation between sites',
  'Safety inspection and compliance check',
  'Training and certification session',
  'Environmental assessment and monitoring',
  'Equipment testing and validation',
  'Site security patrol and inspection',
  'Medical emergency response',
  'Technical support and troubleshooting'
];

async function createPendingBookings() {
  try {
    console.log('Starting to create 20 pending bookings...');
    
    for (let i = 1; i <= 20; i++) {
      // Random data generation
      const user_id = Math.floor(Math.random() * 2) + 4; // 4 or 5 (Mike or Lisa)
      const vehicle_id = Math.floor(Math.random() * 5) + 1; // 1-5
      const driver_id = Math.floor(Math.random() * 4) + 1; // 1-4
      const department = departments[Math.floor(Math.random() * departments.length)];
      const purpose = purposes[Math.floor(Math.random() * purposes.length)];
      
      // Generate future dates (next 7-30 days)
      const now = new Date();
      const daysOffset = Math.floor(Math.random() * 23) + 7; // 7 to 30 days from now
      const startDate = new Date(now.getTime() + (daysOffset * 24 * 60 * 60 * 1000));
      const durationHours = Math.floor(Math.random() * 48) + 2; // 2-50 hours
      const endDate = new Date(startDate.getTime() + (durationHours * 60 * 60 * 1000));
      
      // All bookings will be pending
      const status = 'pending';
      const rejection_reason = null;
      
      // Insert booking
      const bookingQuery = `
        INSERT INTO bookings (user_id, vehicle_id, driver_id, start_date, end_date, 
                             department, notes, status, rejection_reason, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING id
      `;
      
      const bookingResult = await pool.query(bookingQuery, [
        user_id, vehicle_id, driver_id, startDate, endDate, 
        department, purpose, status, rejection_reason
      ]);
      
      const booking_id = bookingResult.rows[0].id;
      
      // Create Level 1 approval (pending)
      const level1ApproverId = 3; // John Supervisor
      const level1Status = 'pending';
      const level1Comments = null;
      
      await pool.query(`
        INSERT INTO approvals (booking_id, approver_id, level, status, comments, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `, [booking_id, level1ApproverId, 1, level1Status, level1Comments]);
      
      // Create Level 2 approval (pending)
      const level2ApproverId = 1; // Sarah Manager
      const level2Status = 'pending';
      const level2Comments = null;
      
      await pool.query(`
        INSERT INTO approvals (booking_id, approver_id, level, status, comments, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `, [booking_id, level2ApproverId, 2, level2Status, level2Comments]);
      
      console.log(`Created pending booking #${booking_id}`);
    }
    
    console.log('Successfully created 20 pending bookings with approvals!');
    
    // Verify the count
    const bookingCount = await pool.query('SELECT COUNT(*) FROM bookings');
    const approvalCount = await pool.query('SELECT COUNT(*) FROM approvals');
    const pendingBookingCount = await pool.query("SELECT COUNT(*) FROM bookings WHERE status = 'pending'");
    
    console.log(`Total bookings: ${bookingCount.rows[0].count}`);
    console.log(`Total approvals: ${approvalCount.rows[0].count}`);
    console.log(`Pending bookings: ${pendingBookingCount.rows[0].count}`);
    
  } catch (error) {
    console.error('Error creating pending bookings:', error);
  } finally {
    await pool.end();
  }
}

createPendingBookings();
