const axios = require('axios');

async function testPagination() {
  try {
    // Test with admin user
    console.log('=== Testing Admin User ===');
    const adminLogin = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin_a@miningcompany.com',
      password: 'admin123'
    });
    
    const adminToken = adminLogin.data.token;
    const adminResponse = await axios.get('http://localhost:5001/api/bookings?page=1&limit=10', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log('Admin - Total bookings:', adminResponse.data.pagination.total);
    console.log('Admin - Pages:', adminResponse.data.pagination.pages);
    console.log('Admin - Limit:', adminResponse.data.pagination.limit);
    console.log('Admin - Current page:', adminResponse.data.pagination.page);
    console.log('Admin - Bookings returned:', adminResponse.data.bookings.length);
    
    // Test with employee user (Mike)
    console.log('\n=== Testing Employee User (Mike) ===');
    const employeeLogin = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'mike.employee@miningcompany.com',
      password: 'employee123'
    });
    
    const employeeToken = employeeLogin.data.token;
    const employeeResponse = await axios.get('http://localhost:5001/api/bookings?page=1&limit=10', {
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    
    console.log('Employee - Total bookings:', employeeResponse.data.pagination.total);
    console.log('Employee - Pages:', employeeResponse.data.pagination.pages);
    console.log('Employee - Limit:', employeeResponse.data.pagination.limit);
    console.log('Employee - Current page:', employeeResponse.data.pagination.page);
    console.log('Employee - Bookings returned:', employeeResponse.data.bookings.length);
    
    // Test with approver user
    console.log('\n=== Testing Approver User ===');
    const approverLogin = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'john.supervisor@miningcompany.com',
      password: 'approver123'
    });
    
    const approverToken = approverLogin.data.token;
    const approverResponse = await axios.get('http://localhost:5001/api/bookings?page=1&limit=10', {
      headers: { Authorization: `Bearer ${approverToken}` }
    });
    
    console.log('Approver - Total bookings:', approverResponse.data.pagination.total);
    console.log('Approver - Pages:', approverResponse.data.pagination.pages);
    console.log('Approver - Limit:', approverResponse.data.pagination.limit);
    console.log('Approver - Current page:', approverResponse.data.pagination.page);
    console.log('Approver - Bookings returned:', approverResponse.data.bookings.length);
    
  } catch (error) {
    console.error('Error testing pagination:', error.response?.data || error.message);
  }
}

testPagination();
