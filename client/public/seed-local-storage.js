(function() {
  const user = {
    id: 'test-superadmin-id',
    email: 'superadmin@hoa.com',
    username: 'superadmin',
    mobileNumber: null,
    role: 'super_admin',
    status: 'active',
    mfaEnabled: false
  };
  const token = 'dev-token-placeholder';
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  console.log('Seeded localStorage with dev super_admin user');
})();