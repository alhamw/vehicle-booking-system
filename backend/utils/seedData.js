const { sequelize, User, Vehicle, Driver } = require('../models');
require('dotenv').config();

const seedData = async () => {
  try {
    // Force sync database (will drop existing tables)
    await sequelize.sync({ force: true });
    console.log('Database synced successfully');

    // Create users (using individual creates to trigger password hashing hooks)
    const userPromises = [
      User.create({
        name: 'System Admin',
        email: 'admin@miningcompany.com',
        password: 'admin123',
        role: 'admin',
        department: 'IT'
      }),
      User.create({
        name: 'John Supervisor',
        email: 'john.supervisor@miningcompany.com',
        password: 'approver123',
        role: 'approver_l1',
        department: 'Operations'
      }),
      User.create({
        name: 'Sarah Manager',
        email: 'sarah.manager@miningcompany.com',
        password: 'approver123',
        role: 'approver_l2',
        department: 'Management'
      }),
      User.create({
        name: 'Mike Employee',
        email: 'mike.employee@miningcompany.com',
        password: 'employee123',
        role: 'employee',
        department: 'Mining'
      }),
      User.create({
        name: 'Lisa Worker',
        email: 'lisa.worker@miningcompany.com',
        password: 'employee123',
        role: 'employee',
        department: 'Maintenance'
      })
    ];

    const users = await Promise.all(userPromises);

    console.log(`Created ${users.length} users`);

    // Create vehicles
    const vehicles = await Vehicle.bulkCreate([
      {
        plate_number: 'MIN-001',
        type: 'truck',
        make: 'Ford',
        model: 'F-350',
        year: 2022,
        capacity: '3.5 tons',
        fuel_type: 'diesel',
        status: 'available',
        location: 'Main Depot'
      },
      {
        plate_number: 'MIN-002',
        type: 'excavator',
        make: 'Caterpillar',
        model: '320',
        year: 2021,
        capacity: '20 tons',
        fuel_type: 'diesel',
        status: 'available',
        location: 'Site A'
      },
      {
        plate_number: 'MIN-003',
        type: 'van',
        make: 'Toyota',
        model: 'Hiace',
        year: 2023,
        capacity: '8 passengers',
        fuel_type: 'petrol',
        status: 'available',
        location: 'Main Depot'
      },
      {
        plate_number: 'MIN-004',
        type: 'bulldozer',
        make: 'Komatsu',
        model: 'D65',
        year: 2020,
        capacity: '25 tons',
        fuel_type: 'diesel',
        status: 'maintenance',
        location: 'Workshop'
      },
      {
        plate_number: 'MIN-005',
        type: 'car',
        make: 'Toyota',
        model: 'Prado',
        year: 2022,
        capacity: '7 passengers',
        fuel_type: 'petrol',
        status: 'available',
        location: 'Main Depot'
      }
    ]);

    console.log(`Created ${vehicles.length} vehicles`);

    // Create drivers
    const drivers = await Driver.bulkCreate([
      {
        name: 'David Thompson',
        license_number: 'DL001234',
        license_expiry: new Date('2025-12-31'),
        phone: '+1234567890',
        email: 'david.thompson@miningcompany.com',
        status: 'available',
        experience_years: 10,
        vehicle_types: ['truck', 'van', 'car']
      },
      {
        name: 'Robert Miller',
        license_number: 'DL005678',
        license_expiry: new Date('2025-06-30'),
        phone: '+1234567891',
        email: 'robert.miller@miningcompany.com',
        status: 'available',
        experience_years: 15,
        vehicle_types: ['excavator', 'bulldozer', 'crane']
      },
      {
        name: 'Jennifer Davis',
        license_number: 'DL009012',
        license_expiry: new Date('2026-03-15'),
        phone: '+1234567892',
        email: 'jennifer.davis@miningcompany.com',
        status: 'available',
        experience_years: 8,
        vehicle_types: ['truck', 'van', 'car', 'bus']
      },
      {
        name: 'Carlos Rodriguez',
        license_number: 'DL003456',
        license_expiry: new Date('2025-09-20'),
        phone: '+1234567893',
        email: 'carlos.rodriguez@miningcompany.com',
        status: 'on_leave',
        experience_years: 12,
        vehicle_types: ['excavator', 'bulldozer']
      }
    ]);

    console.log(`Created ${drivers.length} drivers`);

    console.log('\n=== SEED DATA COMPLETED ===');
    console.log('\nDefault Login Credentials:');
    console.log('Admin: admin@miningcompany.com / admin123');
    console.log('Approver L1: john.supervisor@miningcompany.com / approver123');
    console.log('Approver L2: sarah.manager@miningcompany.com / approver123');
    console.log('Employee: mike.employee@miningcompany.com / employee123');
    console.log('Employee: lisa.worker@miningcompany.com / employee123');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();


