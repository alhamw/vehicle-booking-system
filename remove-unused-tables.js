const { FuelLog, ServiceLog } = require('./backend/models');

/**
 * Script to remove unused FuelLogs and ServiceLogs tables
 * This will clean up the database schema by removing tables that are not used
 */
async function removeUnusedTables() {
  try {
    console.log('🗑️  Starting cleanup of unused tables...');
    
    // Drop fuel_logs table using Sequelize
    console.log('📊 Dropping fuel_logs table...');
    await FuelLog.drop();
    console.log('✅ fuel_logs table dropped successfully');
    
    // Drop service_logs table using Sequelize
    console.log('🔧 Dropping service_logs table...');
    await ServiceLog.drop();
    console.log('✅ service_logs table dropped successfully');
    
    console.log('🎉 Database cleanup completed successfully!');
    console.log('📝 Removed tables: fuel_logs, service_logs');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    throw error;
  }
}

// Run the cleanup
removeUnusedTables()
  .then(() => {
    console.log('✅ Cleanup script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Cleanup script failed:', error);
    process.exit(1);
  });