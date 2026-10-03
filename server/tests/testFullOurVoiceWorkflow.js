import assert from 'assert';

const BASE_URL = 'http://localhost:5055/api/our-voice-our-issue';

async function testCompleteWorkflow() {
  console.log('====================================================');
  console.log('🚀 RUNNING COMPREHENSIVE OUR VOICE OUR ISSUE TEST SUITE');
  console.log('====================================================\n');

  // ─────────────────────────────────────────────
  // TEST 1: AUTHENTICATION & RBAC BOUNDARIES
  // ─────────────────────────────────────────────
  console.log('🔹 TEST 1: AUTHENTICATION & ACCESS CONTROL (RBAC)');

  // 1.1 Citizen Registration
  const testCitizenEmail = `citizen_test_${Date.now()}@example.com`;
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'V. Sundaram',
      email: testCitizenEmail,
      phone: '+919876500001',
      password: 'password123'
    })
  });
  const regJson = await regRes.json();
  assert.strictEqual(regJson.success, true, 'Citizen registration must succeed');
  assert.strictEqual(regJson.user.role, 'CITIZEN', 'Role must strictly be CITIZEN');
  const citizenToken = regJson.token;
  const citizenId = regJson.user.id;
  console.log('  ✅ Citizen registration: SUCCESS (ID:', citizenId, ')');

  // 1.2 Prevent unauthorized public officer or admin self-registration
  const badRegRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Hacker In-Charge',
      email: `fake_officer_${Date.now()}@example.com`,
      password: 'password123',
      role: 'DEPARTMENT_INCHARGE'
    })
  });
  assert.strictEqual(badRegRes.status, 403, 'Public officer self-registration must be rejected with 403');
  console.log('  ✅ Public officer registration rejection: SUCCESS (403 Forbidden)');

  // 1.3 Admin Login (Preset trusted account)
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@ourvoice.gov.in', password: 'admin123' })
  });
  const adminLoginJson = await adminLoginRes.json();
  assert.strictEqual(adminLoginJson.success, true, 'Admin login must succeed');
  assert.strictEqual(adminLoginJson.user.role, 'ADMIN', 'Must be ADMIN role');
  const adminToken = adminLoginJson.token;
  console.log('  ✅ Admin authentication: SUCCESS (User:', adminLoginJson.user.name, ')');

  // 1.4 Department In-Charge Login (Water Officer)
  const officerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'water.officer@ourvoice.gov.in', password: 'officer123' })
  });
  const officerLoginJson = await officerLoginRes.json();
  assert.strictEqual(officerLoginJson.success, true, 'Water officer login must succeed');
  assert.strictEqual(officerLoginJson.user.department_id, 'dept-water', 'Department must be dept-water');
  const officerToken = officerLoginJson.token;
  console.log('  ✅ Water In-Charge authentication: SUCCESS (User:', officerLoginJson.user.name, ')');

  // 1.5 Citizen cannot access Admin-only routes (e.g., Provisioning Officers)
  const unauthOfficerRes = await fetch(`${BASE_URL}/officers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${citizenToken}`
    },
    body: JSON.stringify({
      name: 'Unauthorized Officer',
      email: 'unauth@gov.in',
      password: 'pass',
      departmentId: 'dept-water'
    })
  });
  assert.strictEqual(unauthOfficerRes.status, 403, 'Citizen must be blocked from provisioning officers (403)');
  console.log('  ✅ RBAC Protection: Citizen blocked from admin officer provisioning');

  // ─────────────────────────────────────────────
  // TEST 2: ALL THREE SUBMISSION CHANNELS
  // ─────────────────────────────────────────────
  console.log('\n🔹 TEST 2: THREE SUBMISSION CHANNELS (VOICE, MANUAL, PHONE)');

  // 2.1 Channel 1: VOICE (Web Speech-to-Text)
  const voiceCompRes = await fetch(`${BASE_URL}/complaints`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${citizenToken}`
    },
    body: JSON.stringify({
      title: 'Water contamination in residential pipeline',
      description: 'Water coming from tap has brownish color and foul odor since morning. Children are falling sick.',
      source: 'VOICE',
      department_id: 'dept-water',
      priority: 'HIGH',
      location_address: 'Door 24, Gandhi Road, Ward 15',
      citizen_name: 'V. Sundaram',
      citizen_phone: '+919876500001'
    })
  });
  const voiceJson = await voiceCompRes.json();
  assert.strictEqual(voiceJson.success, true);
  assert.strictEqual(voiceJson.complaint.source, 'VOICE', 'Channel must be VOICE');
  const voiceComplaintId = voiceJson.complaint.id;
  const voiceRefId = voiceJson.complaint.complaint_id;
  console.log('  ✅ Channel 1 [VOICE]: Registered ref:', voiceRefId, '| Source:', voiceJson.complaint.source);

  // 2.2 Channel 2: MANUAL (Web Typed Petition)
  const manualCompRes = await fetch(`${BASE_URL}/complaints`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${citizenToken}`
    },
    body: JSON.stringify({
      title: 'Streetlight pole tilted dangerously on 3rd Main',
      description: 'Heavy wind has tilted the concrete electricity pole. Live wires are sagging low over footpath.',
      source: 'MANUAL',
      department_id: 'dept-electricity',
      priority: 'CRITICAL',
      location_address: '3rd Main Rd, Opp. Post Office',
      citizen_name: 'V. Sundaram',
      citizen_phone: '+919876500001'
    })
  });
  const manualJson = await manualCompRes.json();
  assert.strictEqual(manualJson.success, true);
  assert.strictEqual(manualJson.complaint.source, 'MANUAL', 'Channel must be MANUAL');
  const manualComplaintId = manualJson.complaint.id;
  const manualRefId = manualJson.complaint.complaint_id;
  console.log('  ✅ Channel 2 [MANUAL]: Registered ref:', manualRefId, '| Source:', manualJson.complaint.source);

  // 2.3 Channel 3: PHONE (Exotel Telephony Stream Bridge)
  const phoneCallSid = `call_exo_${Date.now()}`;
  const phoneCompRes = await fetch(`${BASE_URL}/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Phone: Blocked storm drainage causing waterlogging',
      description: 'Telephone report received from helpline caller: Severe sewage overflow on market road.',
      source: 'PHONE',
      department_id: 'dept-sanitation',
      priority: 'HIGH',
      location_address: 'Market Road Junction',
      citizen_phone: '+914447615477',
      citizen_name: 'Telephone Caller',
      call_sid: phoneCallSid,
      transcript: 'USER: Sewage is overflowing into vegetable market. BOT: Registering emergency drainage complaint.'
    })
  });
  const phoneJson = await phoneCompRes.json();
  assert.strictEqual(phoneJson.success, true);
  assert.strictEqual(phoneJson.complaint.source, 'PHONE', 'Channel must be PHONE');
  assert.strictEqual(phoneJson.complaint.call_sid, phoneCallSid);
  const phoneRefId = phoneJson.complaint.complaint_id;
  console.log('  ✅ Channel 3 [PHONE]: Registered ref:', phoneRefId, '| Call SID:', phoneCallSid);

  // ─────────────────────────────────────────────
  // TEST 3: MAIN ADMIN CENTRAL INBOX & ASSIGNMENT
  // ─────────────────────────────────────────────
  console.log('\n🔹 TEST 3: MAIN ADMIN REVIEW & ASSIGNMENT WORKFLOW');

  // 3.1 Admin lists all complaints
  const inboxRes = await fetch(`${BASE_URL}/complaints?limit=10`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const inboxJson = await inboxRes.json();
  assert.strictEqual(inboxJson.success, true);
  assert(inboxJson.complaints.length >= 3, 'Must list all complaints');
  console.log('  ✅ Admin Central Inbox: retrieved', inboxJson.complaints.length, 'complaints across channels');

  // 3.2 Admin Assigns Water Complaint to Water Department Officer
  const assignRes = await fetch(`${BASE_URL}/complaints/${voiceComplaintId}/assign`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      departmentId: 'dept-water',
      notes: 'Dispatched to Zone 5 pipeline repair crew.'
    })
  });
  const assignJson = await assignRes.json();
  assert.strictEqual(assignJson.success, true);
  assert.strictEqual(assignJson.complaint.state, 'ASSIGNED');
  assert.strictEqual(assignJson.complaint.department_id, 'dept-water');
  console.log('  ✅ Admin Assignment: Transitioned', voiceRefId, 'to ASSIGNED (Dept: Water Supply)');

  // ─────────────────────────────────────────────
  // TEST 4: DEPARTMENT IN-CHARGE SCOPED WORKFLOW
  // ─────────────────────────────────────────────
  console.log('\n🔹 TEST 4: DEPARTMENT IN-CHARGE ACTIONS & ISOLATION');

  // 4.1 Water officer can see water complaints
  const waterQueueRes = await fetch(`${BASE_URL}/complaints`, {
    headers: { 'Authorization': `Bearer ${officerToken}` }
  });
  const waterQueueJson = await waterQueueRes.json();
  assert.strictEqual(waterQueueJson.success, true);
  assert(waterQueueJson.complaints.every(c => c.department_id === 'dept-water'), 'Water officer must ONLY see dept-water complaints');
  console.log('  ✅ Department Scoping: Water officer queue strictly filtered to dept-water (Count:', waterQueueJson.complaints.length, ')');

  // 4.2 Water officer accepts complaint -> ACCEPTED
  const acceptRes = await fetch(`${BASE_URL}/complaints/${voiceComplaintId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${officerToken}`
    },
    body: JSON.stringify({
      targetState: 'ACCEPTED',
      notes: 'Officer acknowledged and mobilized field engineers.'
    })
  });
  const acceptJson = await acceptRes.json();
  assert.strictEqual(acceptJson.success, true);
  assert.strictEqual(acceptJson.complaint.state, 'ACCEPTED');
  console.log('  ✅ Officer status update: ACCEPTED');

  // 4.3 Water officer marks in progress -> IN_PROGRESS
  const progressRes = await fetch(`${BASE_URL}/complaints/${voiceComplaintId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${officerToken}`
    },
    body: JSON.stringify({
      targetState: 'IN_PROGRESS',
      notes: 'Excavation completed, flushing pipeline valves.',
      expectedCompletionDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
    })
  });
  const progressJson = await progressRes.json();
  assert.strictEqual(progressJson.success, true);
  assert.strictEqual(progressJson.complaint.state, 'IN_PROGRESS');
  console.log('  ✅ Officer status update: IN_PROGRESS');

  // 4.4 Water officer marks resolved -> RESOLVED
  const resolveRes = await fetch(`${BASE_URL}/complaints/${voiceComplaintId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${officerToken}`
    },
    body: JSON.stringify({
      targetState: 'RESOLVED',
      notes: 'Repaired rusted joint and sterilized main pipe. Water quality tested and clear.',
      resolutionDetails: 'Repaired 4-inch valve joint and ran chlorine neutralization test.'
    })
  });
  const resolveJson = await resolveRes.json();
  assert.strictEqual(resolveJson.success, true);
  assert.strictEqual(resolveJson.complaint.state, 'RESOLVED');
  assert.strictEqual(resolveJson.complaint.resolution_notes, 'Repaired 4-inch valve joint and ran chlorine neutralization test.');
  console.log('  ✅ Officer status update: RESOLVED with formal resolution notes');

  // 4.5 Officer from Water Supply CANNOT modify electricity complaint (Security boundary check)
  const forbiddenModRes = await fetch(`${BASE_URL}/complaints/${manualComplaintId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${officerToken}`
    },
    body: JSON.stringify({
      targetState: 'RESOLVED',
      notes: 'Illegal unauthorized resolution attempt'
    })
  });
  assert.strictEqual(forbiddenModRes.status, 400, 'Cross-department modification must be rejected');
  console.log('  ✅ Security Check: Water officer successfully prevented from tampering with Electricity complaint');

  // ─────────────────────────────────────────────
  // TEST 5: CITIZEN TRACKING & "MY COMPLAINTS"
  // ─────────────────────────────────────────────
  console.log('\n🔹 TEST 5: CITIZEN TRACKING & FEEDBACK');

  // 5.1 Citizen gets "My Complaints"
  const myCompRes = await fetch(`${BASE_URL}/complaints/my`, {
    headers: { 'Authorization': `Bearer ${citizenToken}` }
  });
  const myCompJson = await myCompRes.json();
  assert.strictEqual(myCompJson.success, true);
  assert(myCompJson.complaints.length >= 2, 'Must return complaints submitted by citizen');
  console.log('  ✅ Citizen "My Complaints": Retrieved', myCompJson.complaints.length, 'personal complaints');

  // 5.2 Public Track by ID
  const trackRes = await fetch(`${BASE_URL}/complaints/track/${voiceRefId}`);
  const trackJson = await trackRes.json();
  assert.strictEqual(trackJson.success, true);
  assert.strictEqual(trackJson.complaint.state, 'RESOLVED');
  assert(trackJson.complaint.statusHistory.length >= 3, 'Must contain complete status history');
  console.log('  ✅ Track by ID: Successfully tracked', voiceRefId, 'State:', trackJson.complaint.state, 'Timeline entries:', trackJson.complaint.statusHistory.length);

  // 5.3 Citizen Dispute / Feedback
  const disputeRes = await fetch(`${BASE_URL}/complaints/${voiceComplaintId}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${citizenToken}`
    },
    body: JSON.stringify({
      isDisputed: true,
      disputeReason: 'Water is still showing light yellow residue in morning supply.'
    })
  });
  const disputeJson = await disputeRes.json();
  assert.strictEqual(disputeJson.success, true);
  assert.strictEqual(disputeJson.complaint.state, 'REOPENED');
  console.log('  ✅ Citizen Dispute Workflow: Transitioned to REOPENED with citizen dispute reason');

  // ─────────────────────────────────────────────
  // TEST 6: DATABASE METRICS & AUDIT
  // ─────────────────────────────────────────────
  console.log('\n🔹 TEST 6: REAL DATABASE METRICS & AUDIT INTEGRITY');

  const statsRes = await fetch(`${BASE_URL}/stats`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const statsJson = await statsRes.json();
  assert.strictEqual(statsJson.success, true);
  const st = statsJson.stats;
  assert(st.total > 0, 'Total complaints count must be > 0');
  assert(st.byChannel.VOICE > 0, 'VOICE channel count must be > 0');
  assert(st.byChannel.MANUAL > 0, 'MANUAL channel count must be > 0');
  assert(st.byChannel.PHONE > 0, 'PHONE channel count must be > 0');
  console.log('  ✅ Database Metrics Verified:');
  console.log('     Total Complaints:', st.total);
  console.log('     Channels Breakdown: VOICE:', st.byChannel.VOICE, '| MANUAL:', st.byChannel.MANUAL, '| PHONE:', st.byChannel.PHONE);
  console.log('     Departments Breakdown:', st.byDepartment.map(d => `${d.department_name}: ${d.count}`).join(', '));

  console.log('\n====================================================');
  console.log('🎉 ALL 6 COMPREHENSIVE WORKFLOW TESTS PASSED 100%');
  console.log('====================================================\n');
}

testCompleteWorkflow().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
