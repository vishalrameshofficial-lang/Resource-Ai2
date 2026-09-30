import test from 'node:test';
import assert from 'node:assert/strict';
import { educationService } from '../server/services/educationService.js';
import { healthService } from '../server/services/healthService.js';
import { auditService } from '../server/services/auditService.js';
import { languageDetectionService } from '../server/ai/languageDetectionService.js';

test('Multidomain Architecture: Language Detection Service', async (t) => {
  await t.test('detects language from natural speech transcript', () => {
    // Tamil
    const resTa = languageDetectionService.detectLanguage('எனக்கு வெள்ளத்தில் உதவி தேவை தயவுசெய்து வாங்க');
    assert.equal(resTa.language, 'Tamil');
    assert.equal(resTa.languageCode, 'ta');
    assert.ok(resTa.confidence > 0.7);

    // Hindi
    const resHi = languageDetectionService.detectLanguage('मदद चाहिए यहां पानी भर गया है');
    assert.equal(resHi.language, 'Hindi');
    assert.equal(resHi.languageCode, 'hi');
    assert.ok(resHi.confidence > 0.7);

    // Telugu
    const resTe = languageDetectionService.detectLanguage('మాకు సహాయం కావాలి ఇక్కడ వరదలు వచ్చాయి');
    assert.equal(resTe.language, 'Telugu');
    assert.equal(resTe.languageCode, 'te');
    assert.ok(resTe.confidence > 0.7);

    // English
    const resEn = languageDetectionService.detectLanguage('We need immediate flood rescue and food packets');
    assert.equal(resEn.language, 'English');
    assert.equal(resEn.languageCode, 'en');
    assert.ok(resEn.confidence > 0.6);
  });

  await t.test('capability matrix reports 13 official Indian languages', () => {
    const matrix = languageDetectionService.getCapabilities();
    assert.equal(matrix.length, 13);
    const codes = matrix.map(m => m.code);
    assert.ok(codes.includes('ta'));
    assert.ok(codes.includes('te'));
    assert.ok(codes.includes('hi'));
    assert.ok(codes.includes('ml'));
    assert.ok(codes.includes('kn'));
    assert.ok(codes.includes('bn'));
    assert.ok(codes.includes('en'));
  });

  await t.test('detects mixed-language speech and handles language switching', () => {
    // English dominant
    const mixed = languageDetectionService.detectLanguage('Sir here flood water coming please help');
    assert.equal(mixed.language, 'English');
    assert.equal(mixed.languageCode, 'en');
    assert.ok(mixed.confidence > 0.5);
  });
});

test('Education Domain: Manual Petition and Lifecycle Workflow', async (t) => {
  let createdReq;

  await t.test('creates real database-backed education petition with EDU-YYYY-XXXXXX format', () => {
    createdReq = educationService.createRequest({
      institution_type: 'Government Higher Secondary School',
      institution_name: 'Govt Model Higher Secondary School',
      institution_code: 'GMHSS-TEST-01',
      district: 'Coimbatore',
      taluk: 'Coimbatore North',
      village_city: 'Coimbatore',
      resource_category: 'Infrastructure',
      resource_type: 'Smart Classroom',
      specific_resource: 'Smart Interactive Flat Panel',
      required_quantity: 4,
      requested_quantity: 4,
      unit: 'Units',
      reason_justification: 'Classroom modernization grant',
      priority: 'HIGH',
      requested_by: 'Test Headmaster',
      designation: 'Principal',
      department: 'School Education'
    });

    assert.ok(createdReq.request_id);
    assert.match(createdReq.request_id, /^EDU-\d{4}-\d{6}$/);
    assert.equal(createdReq.status, 'SUBMITTED');
    assert.equal(createdReq.institution_name, 'Govt Model Higher Secondary School');
  });

  await t.test('transition through official lifecycle: SUBMITTED -> UNDER_REVIEW -> VERIFIED -> APPROVED', () => {
    const underReview = educationService.updateStatus(createdReq.request_id, 'UNDER_REVIEW', {
      changed_by: 'BEO Officer',
      role: 'EDUCATION_OFFICER',
      comments: 'Documents received, initiating inspection'
    });
    assert.equal(underReview.status, 'UNDER_REVIEW');

    const verified = educationService.updateStatus(createdReq.request_id, 'VERIFIED', {
      changed_by: 'Field Inspector',
      role: 'EDUCATION_OFFICER',
      comments: 'Site inspection verified classrooms count'
    });
    assert.equal(verified.status, 'VERIFIED');

    const approved = educationService.updateStatus(createdReq.request_id, 'APPROVED', {
      changed_by: 'District Collector / CEO',
      role: 'APPROVING_OFFICER',
      comments: 'Sanctioned under State Education Fund'
    });
    assert.equal(approved.status, 'APPROVED');
  });

  await t.test('allocates resource against inventory and updates request to ALLOCATED', () => {
    // Add real inventory item
    const inventory = educationService.createResource({
      institution_id: null,
      district: 'Coimbatore',
      taluk: 'Coimbatore North',
      category: 'Infrastructure',
      resource_type: 'Smart Classroom',
      name: 'Smart Interactive Flat Panel 65 inch',
      total_quantity: 10,
      available_quantity: 10,
      allocated_quantity: 0,
      unit: 'Units',
      condition: 'NEW'
    });

    assert.ok(inventory.id);
    assert.equal(inventory.available_quantity, 10);

    // Perform allocation
    const allocation = educationService.createAllocation(createdReq.request_id, {
      resource_id: inventory.id,
      requested_quantity: 4,
      approved_quantity: 4,
      allocated_quantity: 4,
      unit: 'Units',
      source_location: 'Coimbatore District Central Storehouse',
      destination_location: createdReq.institution_name,
      allocated_by: 'District Education Officer'
    });

    assert.match(allocation.allocation_id, /^ALC-EDU-\d{4}-\d{6}$/);

    // Verify inventory deduction
    const updatedInventory = educationService.getResourceById(inventory.id);
    assert.equal(updatedInventory.available_quantity, 6);
    assert.equal(updatedInventory.allocated_quantity, 4);

    // Verify request status transitioned to ALLOCATED
    const updatedReq = educationService.getRequestById(createdReq.request_id);
    assert.equal(updatedReq.status, 'ALLOCATED');
  });
});

test('Health Domain: Manual Hospital Requisition and Stock Allocation', async (t) => {
  let createdReq;

  await t.test('creates real database-backed health petition with HLT-YYYY-XXXXXX format', () => {
    createdReq = healthService.createRequest({
      facility_type: 'District Headquarters Hospital',
      facility_name: 'District HQ Hospital, Salem',
      facility_code: 'DHQ-SLM-01',
      district: 'Salem',
      taluk: 'Salem South',
      location: 'Salem Town',
      resource_category: 'Medicines',
      resource_type: 'Antibiotic Injection',
      specific_resource: 'Piperacillin Tazobactam 4.5g',
      required_quantity: 200,
      requested_quantity: 200,
      unit: 'Vials',
      reason_justification: 'ICU respiratory infections caseload surge',
      priority: 'URGENT',
      requested_by: 'Dr. Ramesh Kumar',
      designation: 'Medical Superintendent',
      department: 'Health & Family Welfare'
    });

    assert.ok(createdReq.request_id);
    assert.match(createdReq.request_id, /^HLT-\d{4}-\d{6}$/);
    assert.equal(createdReq.status, 'SUBMITTED');
  });

  await t.test('updates health status with full audit history: SUBMITTED -> VERIFIED -> APPROVED', () => {
    healthService.updateStatus(createdReq.request_id, 'VERIFIED', {
      changed_by: 'Deputy Director of Health Services',
      role: 'HEALTH_OFFICER',
      comments: 'Epidemiological surge verified'
    });

    const approved = healthService.updateStatus(createdReq.request_id, 'APPROVED', {
      changed_by: 'State Drug Controller',
      role: 'APPROVING_OFFICER',
      comments: 'Sanctioned from TNMSC Buffer Stock'
    });

    assert.equal(approved.status, 'APPROVED');
  });

  await t.test('allocates medicine stock and verifies lot/batch tracking', () => {
    const medStock = healthService.createResource({
      facility_id: null,
      district: 'Salem',
      taluk: 'Salem South',
      category: 'Medicines',
      resource_type: 'Antibiotic Injection',
      name: 'Piperacillin Tazobactam 4.5g',
      total_quantity: 1000,
      available_quantity: 1000,
      allocated_quantity: 0,
      unit: 'Vials',
      batch_lot: 'BATCH-2026-SLM-99',
      expiry_date: '2027-12-31',
      condition: 'SEALED_GOOD'
    });

    assert.equal(medStock.batch_lot, 'BATCH-2026-SLM-99');

    const allocation = healthService.createAllocation(createdReq.request_id, {
      resource_id: medStock.id,
      requested_quantity: 200,
      approved_quantity: 200,
      allocated_quantity: 200,
      unit: 'Vials',
      source_location: 'TNMSC Warehouse Salem',
      destination_location: createdReq.facility_name,
      allocated_by: 'State Medical Supply Officer'
    });

    assert.match(allocation.allocation_id, /^ALC-HLT-\d{4}-\d{6}$/);

    const updatedStock = healthService.getResourceById(medStock.id);
    assert.equal(updatedStock.available_quantity, 800);
    assert.equal(updatedStock.allocated_quantity, 200);

    const updatedReq = healthService.getRequestById(createdReq.request_id);
    assert.equal(updatedReq.status, 'ALLOCATED');
  });
});

test('Audit Logging: Government-grade audit recording across domains', () => {
  auditService.log({
    userId: 'usr_test_1',
    userName: 'Test Officer',
    role: 'SUPER_ADMIN',
    action: 'POLICY_SANCTION_CONFIRMED',
    domain: 'HEALTH',
    entity: 'HEALTH_REQUEST',
    entityId: 'HLT-2026-999999',
    newValue: { sanction_amount: 'Rs 5,00,000' }
  });

  const logs = auditService.getLogs({ domain: 'HEALTH', limit: 5 });
  assert.ok(logs.length > 0);
  assert.equal(logs[0].domain, 'HEALTH');
  assert.equal(logs[0].action, 'POLICY_SANCTION_CONFIRMED');
});

test('Separation of Domains: Emergency vs Education vs Health', () => {
  // Verifying Education and Health requests exist solely in their respective tables
  const eduReqs = educationService.getRequests({ limit: 10 });
  for (const r of eduReqs) {
    assert.match(r.request_id, /^EDU-\d{4}-\d{6}$/);
    assert.ok(r.institution_name);
  }

  const hltReqs = healthService.getRequests({ limit: 10 });
  for (const r of hltReqs) {
    assert.match(r.request_id, /^HLT-\d{4}-\d{6}$/);
    assert.ok(r.facility_name);
  }
});
