const http = require('http');

const BASE_URL = 'http://localhost:3000';
const PASSWORD = 'password123';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = { ...headers };
    let postData = null;

    if (body) {
      postData = JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(rawData);
          } catch (e) {
            json = rawData;
          }
          resolve({ status: res.statusCode, data: json });
        });
      },
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function login(email, password) {
  const res = await request('POST', '/auth/login', { email, password });
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(
      `Login failed for ${email} (${res.status}): ${JSON.stringify(res.data)}`,
    );
  }
  return res.data.accessToken;
}

async function runTests() {
  console.log('=== Starting Full Dashboard API Test Suite ===\n');
  const results = [];

  // 1. Log in with different roles
  console.log('1. Authenticating test accounts...');
  const pesoToken = await login('peso.approved@internet.local', PASSWORD);
  const techCompanyToken = await login('company.tech@internet.local', PASSWORD);
  const hospCompanyToken = await login(
    'company.hospitality@internet.local',
    PASSWORD,
  );
  const adminToken = await login('admin.dev@internet.local', PASSWORD);
  const studentToken = await login('student.manual@internet.local', PASSWORD);
  console.log('✓ All 5 test account tokens acquired.\n');

  async function test(id, name, fn) {
    try {
      const outcome = await fn();
      results.push({ id, name, passed: true, details: outcome });
      console.log(`[PASS] ${id}: ${name}`);
    } catch (e) {
      results.push({ id, name, passed: false, error: e.message });
      console.log(`[FAIL] ${id}: ${name} -> ${e.message}`);
    }
  }

  // A1. Student dashboard metrics
  await test('A1', 'PESO Student Dashboard Metrics', async () => {
    const res = await request('GET', '/dashboard/peso/students/metrics', null, {
      Authorization: `Bearer ${pesoToken}`,
    });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    if (typeof res.data.totalPendingApplications !== 'number')
      throw new Error('Invalid response structure');
    return res.data;
  });

  // A2. GET all student applications
  await test('A2', 'PESO GET all student applications', async () => {
    const res = await request(
      'GET',
      '/dashboard/peso/applications?datePreset=all&page=1&limit=5',
      null,
      {
        Authorization: `Bearer ${pesoToken}`,
      },
    );
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    if (!Array.isArray(res.data.data) || !res.data.meta)
      throw new Error('Missing paginated structure');
    return `Found ${res.data.meta.total} apps`;
  });

  // A3. Application management dashboard metrics
  await test(
    'A3',
    'PESO Application Management Dashboard Metrics',
    async () => {
      const res = await request(
        'GET',
        '/dashboard/peso/applications/metrics?datePreset=all',
        null,
        {
          Authorization: `Bearer ${pesoToken}`,
        },
      );
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      if (typeof res.data.pendingApplications !== 'number')
        throw new Error('Invalid structure');
      return res.data;
    },
  );

  // B1. GET all companies
  await test('B1', 'PESO GET all companies', async () => {
    const res = await request('GET', '/dashboard/peso/employers', null, {
      Authorization: `Bearer ${pesoToken}`,
    });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    if (!Array.isArray(res.data.data)) throw new Error('Invalid structure');
    return `Found ${res.data.meta.total} companies`;
  });

  // B2. PESO employer dashboard metrics
  await test('B2', 'PESO Employer Dashboard Metrics', async () => {
    const res = await request('GET', '/dashboard/peso/employers/metrics', null, {
      Authorization: `Bearer ${pesoToken}`,
    });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    if (typeof res.data.totalPartnerEmployers !== 'number')
      throw new Error('Invalid structure');
    return res.data;
  });

  // C1. GET all referrals
  await test('C1', 'PESO GET all referrals', async () => {
    const res = await request('GET', '/dashboard/peso/referrals', null, {
      Authorization: `Bearer ${pesoToken}`,
    });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    if (!Array.isArray(res.data.data)) throw new Error('Invalid structure');
    return `Found ${res.data.meta.total} referrals`;
  });

  // D1. GET students with DTR entries
  await test('D1', 'PESO Interns summary list', async () => {
    const res = await request('GET', '/dashboard/peso/interns', null, {
      Authorization: `Bearer ${pesoToken}`,
    });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    if (!Array.isArray(res.data.data)) throw new Error('Invalid structure');
    return `Found ${res.data.meta.total} interns`;
  });

  // D2. GET DTR dashboard metrics
  await test('D2', 'PESO DTR Dashboard Metrics', async () => {
    const res = await request('GET', '/dashboard/peso/interns/metrics', null, {
      Authorization: `Bearer ${pesoToken}`,
    });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    if (typeof res.data.accepted !== 'number')
      throw new Error('Invalid structure');
    return res.data;
  });

  // D3. GET all DTR entries
  await test('D3', 'PESO All DTR Entries', async () => {
    const res = await request('GET', '/dashboard/peso/attendance', null, {
      Authorization: `Bearer ${pesoToken}`,
    });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    if (!Array.isArray(res.data.data)) throw new Error('Invalid structure');
    return `Found ${res.data.meta.total} entries`;
  });

  // D4. GET DTR entry per assignment
  await test('D4', 'PESO DTR Per Assignment Detail', async () => {
    const list = await request('GET', '/dashboard/peso/interns', null, {
      Authorization: `Bearer ${pesoToken}`,
    });
    const id = list.data.data[0]?.internshipAssignmentId;
    if (!id) throw new Error('No assignments in seed');
    const res = await request(
      'GET',
      `/dashboard/peso/attendance/assignments/${id}`,
      null,
      {
        Authorization: `Bearer ${pesoToken}`,
      },
    );
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    if (!res.data.studentInfo || !Array.isArray(res.data.dtrEntries))
      throw new Error('Invalid detail shape');
    return `Assignment ${id} with ${res.data.dtrEntries.length} entries`;
  });

  // E1. Employer dashboard metrics
  await test('E1', 'Employer Dashboard Metrics', async () => {
    const res = await request('GET', '/dashboard/employer/metrics', null, {
      Authorization: `Bearer ${techCompanyToken}`,
    });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    if (typeof res.data.activeOpportunities !== 'number')
      throw new Error('Invalid structure');
    return res.data;
  });

  // E2. Employer application list
  await test('E2', 'Employer Application List', async () => {
    const res = await request('GET', '/dashboard/employer/applications', null, {
      Authorization: `Bearer ${techCompanyToken}`,
    });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    if (!Array.isArray(res.data.data)) throw new Error('Invalid structure');
    return `Found ${res.data.meta.total} applications`;
  });

  // E3. Employer reports dashboard
  await test('E3', 'Employer Reports Metrics', async () => {
    const res = await request('GET', '/dashboard/employer/reports', null, {
      Authorization: `Bearer ${techCompanyToken}`,
    });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    if (typeof res.data.totalApplicants !== 'number')
      throw new Error('Invalid structure');
    return res.data;
  });

  // F1. Employer DTR dashboard metrics
  await test('F1', 'Employer DTR Dashboard Metrics', async () => {
    const res = await request(
      'GET',
      '/dashboard/employer/attendance/metrics',
      null,
      {
        Authorization: `Bearer ${hospCompanyToken}`,
      },
    );
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    if (typeof res.data.totalActiveInterns !== 'number')
      throw new Error('Invalid structure');
    return res.data;
  });

  // F2. Employer student attendance summary
  await test('F2', 'Employer Student Attendance Summary', async () => {
    // Look up assignment for hospCompany
    const dtrList = await request(
      'GET',
      '/dashboard/peso/attendance?datePreset=all',
      null,
      {
        Authorization: `Bearer ${pesoToken}`,
      },
    );
    if (!dtrList.data || !Array.isArray(dtrList.data.data)) {
      throw new Error('Could not fetch DTR list: ' + JSON.stringify(dtrList.data));
    }
    const hospItem = dtrList.data.data.find(
      (d) => d.company === 'DevSeed Hospitality Inc.',
    );
    if (!hospItem) throw new Error('No hospitality assignment in seed: ' + JSON.stringify(dtrList.data.data));
    const res = await request(
      'GET',
      `/dashboard/employer/attendance/assignments/${hospItem.internshipAssignmentId}`,
      null,
      {
        Authorization: `Bearer ${hospCompanyToken}`,
      },
    );
    if (res.status !== 200) throw new Error(`HTTP ${res.status}: ${JSON.stringify(res.data)}`);
    return `Found ${res.data.dtrEntries.length} entries for student ${res.data.studentInfo.studentName}`;
  });

  // G1. Admin student dashboard metrics
  await test('G1', 'Admin Student Dashboard Metrics', async () => {
    const res = await request(
      'GET',
      '/dashboard/admin/students/metrics',
      null,
      {
        Authorization: `Bearer ${adminToken}`,
      },
    );
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    if (typeof res.data.totalRegistered !== 'number')
      throw new Error('Invalid structure');
    return res.data;
  });

  // G2. Admin GET all students
  await test('G2', 'Admin GET all students', async () => {
    const res = await request('GET', '/dashboard/admin/students', null, {
      Authorization: `Bearer ${adminToken}`,
    });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    if (!Array.isArray(res.data.data)) throw new Error('Invalid structure');
    return `Found ${res.data.meta.total} students`;
  });

  // G4. Admin GET student details
  let targetStudentUserId = null;
  await test('G4', 'Admin GET student details', async () => {
    const list = await request('GET', '/dashboard/admin/students', null, {
      Authorization: `Bearer ${adminToken}`,
    });
    targetStudentUserId = list.data.data[0]?.userAccountId;
    if (!targetStudentUserId) throw new Error('No student found');
    const res = await request(
      'GET',
      `/dashboard/admin/students/${targetStudentUserId}`,
      null,
      {
        Authorization: `Bearer ${adminToken}`,
      },
    );
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    if (!res.data.firstName || res.data.passwordHash)
      throw new Error('Invalid projection (secret exposed or name missing)');
    return `Loaded student ${res.data.firstName} ${res.data.lastName}`;
  });

  // G3. Admin PATCH student account details
  await test('G3', 'Admin PATCH student account details', async () => {
    if (!targetStudentUserId) throw new Error('No target student ID');
    const res = await request(
      'PATCH',
      `/dashboard/admin/students/${targetStudentUserId}`,
      {
        contactNumber: '09179998888',
        strandProgram: 'BS Computer Science',
      },
      { Authorization: `Bearer ${adminToken}` },
    );
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    return res.data;
  });

  // H1. Admin employer dashboard metrics
  await test('H1', 'Admin Employer Dashboard Metrics', async () => {
    const res = await request(
      'GET',
      '/dashboard/admin/employers/metrics',
      null,
      {
        Authorization: `Bearer ${adminToken}`,
      },
    );
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    return res.data;
  });

  // H2. Admin GET all employers
  await test('H2', 'Admin GET all employers', async () => {
    const res = await request('GET', '/dashboard/admin/employers', null, {
      Authorization: `Bearer ${adminToken}`,
    });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    return `Found ${res.data.meta.total} employers`;
  });

  // H4. Admin GET employer account details
  let targetCompanyUserId = null;
  await test('H4', 'Admin GET employer details', async () => {
    const list = await request('GET', '/dashboard/admin/employers', null, {
      Authorization: `Bearer ${adminToken}`,
    });
    targetCompanyUserId = list.data.data[0]?.userAccountId;
    const res = await request(
      'GET',
      `/dashboard/admin/employers/${targetCompanyUserId}`,
      null,
      {
        Authorization: `Bearer ${adminToken}`,
      },
    );
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    return `Loaded ${res.data.companyName}`;
  });

  // H3. Admin PATCH employer account details
  await test('H3', 'Admin PATCH employer account details', async () => {
    if (!targetCompanyUserId) throw new Error('No target company user ID');
    const res = await request(
      'PATCH',
      `/dashboard/admin/employers/${targetCompanyUserId}`,
      {
        description: 'Updated company description via admin dashboard.',
      },
      { Authorization: `Bearer ${adminToken}` },
    );
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    return res.data;
  });

  // I1. Admin PESO dashboard metrics
  await test('I1', 'Admin PESO Dashboard Metrics', async () => {
    const res = await request(
      'GET',
      '/dashboard/admin/peso-personnel/metrics',
      null,
      {
        Authorization: `Bearer ${adminToken}`,
      },
    );
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    return res.data;
  });

  // I2. Admin GET all PESO accounts
  await test('I2', 'Admin GET all PESO accounts', async () => {
    const res = await request('GET', '/dashboard/admin/peso-personnel', null, {
      Authorization: `Bearer ${adminToken}`,
    });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    return `Found ${res.data.meta.total} PESO personnel`;
  });

  // I4. Admin GET PESO account details
  let targetPesoUserId = null;
  await test('I4', 'Admin GET PESO account details', async () => {
    const list = await request('GET', '/dashboard/admin/peso-personnel', null, {
      Authorization: `Bearer ${adminToken}`,
    });
    targetPesoUserId = list.data.data[0]?.userAccountId;
    const res = await request(
      'GET',
      `/dashboard/admin/peso-personnel/${targetPesoUserId}`,
      null,
      {
        Authorization: `Bearer ${adminToken}`,
      },
    );
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    return `Loaded PESO: ${res.data.firstName} ${res.data.lastName}`;
  });

  // I3. Admin PATCH PESO account details
  await test('I3', 'Admin PATCH PESO account details', async () => {
    if (!targetPesoUserId) throw new Error('No target PESO user ID');
    const res = await request(
      'PATCH',
      `/dashboard/admin/peso-personnel/${targetPesoUserId}`,
      {
        department: 'QC PESO Employment Division',
      },
      { Authorization: `Bearer ${adminToken}` },
    );
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    return res.data;
  });

  // === Authorization & Boundary Tests ===
  console.log('\n--- Authorization Negative Tests ---');

  await test('AUTH-1', 'Student accessing PESO endpoint → 403', async () => {
    const res = await request('GET', '/dashboard/peso/students/metrics', null, {
      Authorization: `Bearer ${studentToken}`,
    });
    if (res.status !== 403)
      throw new Error(`Expected 403 Forbidden, got ${res.status}`);
    return 'Correctly rejected with 403';
  });

  await test('AUTH-2', 'Company accessing Admin endpoint → 403', async () => {
    const res = await request('GET', '/dashboard/admin/students', null, {
      Authorization: `Bearer ${techCompanyToken}`,
    });
    if (res.status !== 403)
      throw new Error(`Expected 403 Forbidden, got ${res.status}`);
    return 'Correctly rejected with 403';
  });

  await test('AUTH-3', 'PESO accessing Admin endpoint → 403', async () => {
    const res = await request('GET', '/dashboard/admin/students', null, {
      Authorization: `Bearer ${pesoToken}`,
    });
    if (res.status !== 403)
      throw new Error(`Expected 403 Forbidden, got ${res.status}`);
    return 'Correctly rejected with 403';
  });

  await test(
    'AUTH-4',
    'Company A (Tech) accessing Company B (Hospitality) assignment → 403',
    async () => {
      // Find hospitality assignment #2
      const dtrList = await request(
        'GET',
        '/dashboard/peso/attendance?datePreset=all',
        null,
        {
          Authorization: `Bearer ${pesoToken}`,
        },
      );
      const hospItem = dtrList.data.data.find(
        (d) => d.company === 'DevSeed Hospitality Inc.',
      );
      if (!hospItem) throw new Error('No hospitality assignment in seed');

      // Attempt to access with Technology Company token
      const res = await request(
        'GET',
        `/dashboard/employer/attendance/assignments/${hospItem.internshipAssignmentId}`,
        null,
        {
          Authorization: `Bearer ${techCompanyToken}`,
        },
      );
      if (res.status !== 403)
        throw new Error(`Expected 403 Forbidden, got ${res.status}`);
      return 'Cross-company data isolation enforced (403 Forbidden)';
    },
  );

  await test('AUTH-5', 'Unauthenticated request → 401', async () => {
    const res = await request(
      'GET',
      '/dashboard/peso/students/metrics',
      null,
      {},
    );
    if (res.status !== 401)
      throw new Error(`Expected 401 Unauthorized, got ${res.status}`);
    return 'Correctly rejected with 401';
  });

  console.log('\n=== Test Suite Complete ===');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Passed: ${passed}/${results.length}, Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Fatal error during test run:', e);
  process.exit(1);
});
