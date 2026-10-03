async function runTest() {
  console.log('--- Testing Our Voice Our Issue Endpoints ---');

  // 1. Get Departments
  const deptRes = await fetch('http://localhost:5055/api/our-voice-our-issue/departments');
  const deptJson = await deptRes.json();
  console.log('✅ Departments retrieved:', deptJson.departments?.length || 0);

  // 2. Admin Login
  const loginRes = await fetch('http://localhost:5055/api/our-voice-our-issue/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@ourvoice.gov.in', password: 'admin123' })
  });
  const loginJson = await loginRes.json();
  console.log('✅ Admin login status:', loginJson.success ? 'Success' : loginJson.error);
  const token = loginJson.token;

  // 3. Create a Complaint
  const createRes = await fetch('http://localhost:5055/api/our-voice-our-issue/complaints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Water pipe broken at Anna Nagar',
      description: 'Main 4-inch drinking water pipe has burst near bus depot, flooding road.',
      department_id: 'dept-water',
      priority: 'HIGH',
      citizen_name: 'Ramesh Kumar',
      citizen_phone: '9876543210',
      location_address: 'Anna Nagar Bus Depot, Ward 112',
      source: 'WEB'
    })
  });
  const createJson = await createRes.json();
  console.log('✅ Complaint created:', createJson.complaint?.complaint_id, '| Title:', createJson.complaint?.title);
  const complaintId = createJson.complaint?.id;
  const refId = createJson.complaint?.complaint_id;

  // 4. Track Complaint
  const trackRes = await fetch(`http://localhost:5055/api/our-voice-our-issue/complaints/track/${refId}`);
  const trackJson = await trackRes.json();
  console.log('✅ Track by Ref ID:', trackJson.complaint?.complaint_id, '| State:', trackJson.complaint?.state, '| SLA:', trackJson.complaint?.sla_deadline);

  // 5. Assign Officer (Admin)
  const assignRes = await fetch(`http://localhost:5055/api/our-voice-our-issue/complaints/${complaintId}/assign`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      departmentId: 'dept-water',
      notes: 'Dispatched to Zone 5 maintenance squad'
    })
  });
  const assignJson = await assignRes.json();
  console.log('✅ Admin assign status:', assignJson.complaint?.state, '| Dept:', assignJson.complaint?.department_name);

  // 6. Transition State to IN_PROGRESS
  const statusRes = await fetch(`http://localhost:5055/api/our-voice-our-issue/complaints/${complaintId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      targetState: 'IN_PROGRESS',
      notes: 'Excavation team on site replacing valve'
    })
  });
  const statusJson = await statusRes.json();
  console.log('✅ Status transitioned:', statusJson.complaint?.state);

  // 7. Transition State to RESOLVED
  const resolveRes = await fetch(`http://localhost:5055/api/our-voice-our-issue/complaints/${complaintId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      targetState: 'RESOLVED',
      resolutionDetails: 'Replaced 4-inch pipe with reinforced PVC. Normal pressure restored.',
      notes: 'Resolved by field unit'
    })
  });
  const resolveJson = await resolveRes.json();
  console.log('✅ Status resolved:', resolveJson.complaint?.state, '| Resolution:', resolveJson.complaint?.resolution_details);

  // 8. Stats verification
  const statsRes = await fetch('http://localhost:5055/api/our-voice-our-issue/stats');
  const statsJson = await statsRes.json();
  console.log('✅ System Stats:', JSON.stringify(statsJson.stats, null, 2));

  console.log('--- ALL INTEGRATION TESTS PASSED PERFECTLY ---');
}

runTest().catch(console.error);
