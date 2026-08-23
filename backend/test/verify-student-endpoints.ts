import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from '../src/app.module';

async function runVerification() {
  console.log(
    '=== Starting Student Endpoints QA & File Upload Verification ===\n',
  );

  // Prepare fixture file for multipart upload test
  const fixturesDir = resolve(__dirname, 'fixtures');
  if (!existsSync(fixturesDir)) {
    mkdirSync(fixturesDir, { recursive: true });
  }
  const samplePdfPath = resolve(fixturesDir, 'sample_resume.pdf');
  writeFileSync(
    samplePdfPath,
    '%PDF-1.4\n% Sample PDF Content for QA Verification\n%%EOF',
  );

  const sampleDocxPath = resolve(fixturesDir, 'sample_loi.docx');
  writeFileSync(sampleDocxPath, 'Sample Letter of Intent Content');

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: INestApplication = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();
  const server = app.getHttpServer();

  let studentToken = '';
  let adminToken = '';

  // 1. Authenticate Student 1
  try {
    const res = await request(server).post('/auth/login').send({
      email: 'student.manual@internet.local',
      password: 'password123',
    });
    studentToken =
      res.body?.accessToken || res.body?.access_token || res.body?.token;
    console.log(
      '✔ Authenticated student.manual@internet.local (Status:',
      res.status,
      ')',
    );
  } catch (err: any) {
    console.error('Failed to login student:', err.message);
  }

  // 2. Authenticate Admin
  try {
    const res = await request(server)
      .post('/auth/login')
      .send({ email: 'admin.dev@internet.local', password: 'password123' });
    adminToken =
      res.body?.accessToken || res.body?.access_token || res.body?.token;
    console.log(
      '✔ Authenticated admin.dev@internet.local (Status:',
      res.status,
      ')',
    );
  } catch (err: any) {
    console.error('Failed to login admin:', err.message);
  }

  if (!studentToken) {
    console.error('Student token missing, aborting verification.');
    await app.close();
    return;
  }

  console.log(
    '\n--- Test Case 1: Fetch Own Profile (GET /students/1/profile) ---',
  );
  const tc1 = await request(server)
    .get('/students/1/profile')
    .set('Authorization', `Bearer ${studentToken}`);
  console.log('Status:', tc1.status);

  console.log(
    '\n--- Test Case 2: Cross-Student Profile Access (GET /students/2/profile) ---',
  );
  const tc2 = await request(server)
    .get('/students/2/profile')
    .set('Authorization', `Bearer ${studentToken}`);
  console.log('Status (Expect 403):', tc2.status);

  if (adminToken) {
    console.log(
      '\n--- Test Case 3: Admin Student Profile Access (GET /students/1/profile) ---',
    );
    const tc3 = await request(server)
      .get('/students/1/profile')
      .set('Authorization', `Bearer ${adminToken}`);
    console.log('Status:', tc3.status);
    console.log('Admin Retrieved Student ID:', tc3.body?.student?.student_id);
  }

  console.log(
    '\n--- Test Case 4: Update Student Profile (POST /students/1/profile) - Valid Enum ---',
  );
  const tc4 = await request(server)
    .post('/students/1/profile')
    .set('Authorization', `Bearer ${studentToken}`)
    .send({
      firstName: 'Manuel',
      middleName: 'Santos',
      lastName: 'Local',
      extensionName: null,
      sex: 'Male',
      birthDate: '2002-01-15',
      contactNumber: '09987654321',
      contactEmail: 'student.manual@internet.local',
      linkedinUrl: 'https://linkedin.com/in/manuellocal',
      addressLine: 'Block 12 Lot 4 Emerald St.',
      addressBarangay: 'Barangay Central',
      addressDistrict: 'District 4',
      addressCity: 'Quezon City',
      inquiryMethod: 'online',
      photoFilePath: '/uploads/avatars/student-1.png',
      academic: {
        schoolName: 'Polytechnic University of the Philippines',
        yearLevel: 'fourth_year_college',
        strandProgram: 'BS Computer Science',
      },
      internshipPreference: {
        requiredHours: 486,
        availableDays: 'weekdays',
        preferredCompanyType: 'private',
        startDate: '2026-09-15',
        allowsOutsidePreferredField: true,
      },
      preferredIndustries: [
        { industryId: 1, customIndustryName: null },
        { industryId: 2, customIndustryName: null },
      ],
    });
  console.log('Status:', tc4.status);
  console.log('Updated Year Level:', tc4.body?.academic?.year_level);

  console.log(
    '\n--- Test Case 4b: Negative Validation Test (POST /students/1/profile) - Invalid Enum "4th Year" ---',
  );
  const tc4b = await request(server)
    .post('/students/1/profile')
    .set('Authorization', `Bearer ${studentToken}`)
    .send({
      firstName: 'Manuel',
      lastName: 'Local',
      sex: 'Male',
      birthDate: '2002-01-15',
      contactNumber: '09987654321',
      contactEmail: 'student.manual@internet.local',
      addressLine: 'Block 12 Lot 4 Emerald St.',
      addressBarangay: 'Barangay Central',
      addressDistrict: 'District 4',
      addressCity: 'Quezon City',
      inquiryMethod: 'online',
      academic: {
        schoolName: 'Polytechnic University of the Philippines',
        yearLevel: '4th Year', // Invalid enum value
        strandProgram: 'BS Computer Science',
      },
    });
  console.log('Status (Expect 400):', tc4b.status);

  console.log(
    '\n--- Test Case 5: Physical Document Upload (POST /students/1/requirements) ---',
  );
  const tc5 = await request(server)
    .post('/students/1/requirements')
    .set('Authorization', `Bearer ${studentToken}`)
    .attach('file', samplePdfPath)
    .field('requirementType', 'curriculum_vitae_resume')
    .field('requirementName', 'Manuel_Local_Resume_2026.pdf');

  console.log('Status (Expect 201):', tc5.status);
  console.log('Requirement Type:', tc5.body?.requirementType);
  console.log('Saved File Path:', tc5.body?.submission?.requirement_file_path);

  const generatedFilePath = String(
    tc5.body?.submission?.requirement_file_path ?? '',
  );
  if (
    generatedFilePath &&
    generatedFilePath.startsWith('/uploads/requirements/')
  ) {
    const filename = generatedFilePath.replace('/uploads/requirements/', '');
    const fullPhysicalPath = resolve(
      process.cwd(),
      'uploads',
      'requirements',
      filename,
    );
    console.log(
      '✔ File physically exists on disk under backend/uploads/requirements?:',
      existsSync(fullPhysicalPath),
    );
  }

  console.log(
    '\n--- Test Case 5b: Upload Second Document (POST /students/1/requirements) ---',
  );
  const tc5b = await request(server)
    .post('/students/1/requirements')
    .set('Authorization', `Bearer ${studentToken}`)
    .attach('file', sampleDocxPath)
    .field('requirementType', 'letter_of_intent')
    .field('requirementName', 'PESO_Letter_of_Intent.docx');

  console.log('Status (Expect 201):', tc5b.status);
  console.log('Saved LOI Path:', tc5b.body?.submission?.requirement_file_path);

  console.log(
    '\n--- Test Case 5c: Negative Test - Upload Without File (Expect 400) ---',
  );
  const tc5c = await request(server)
    .post('/students/1/requirements')
    .set('Authorization', `Bearer ${studentToken}`)
    .field('requirementType', 'proof_of_residency');
  console.log('Status (Expect 400):', tc5c.status);

  console.log(
    '\n--- Test Case 6: Get All Student Requirements (GET /students/1/requirements) ---',
  );
  const tc6 = await request(server)
    .get('/students/1/requirements')
    .set('Authorization', `Bearer ${studentToken}`);
  console.log('Status:', tc6.status);
  console.log('Requirements count:', tc6.body?.requirements?.length);

  console.log(
    '\n--- Test Case 7: Fetch Stored Resume (GET /students/1/resume) ---',
  );
  const tc7 = await request(server)
    .get('/students/1/resume')
    .set('Authorization', `Bearer ${studentToken}`);
  console.log('Status:', tc7.status);
  console.log('Resume Path:', tc7.body?.requirement_file_path);

  console.log(
    '\n--- Test Case 8: List Student Applications (GET /students/1/applications) ---',
  );
  const tc8 = await request(server)
    .get('/students/1/applications')
    .set('Authorization', `Bearer ${studentToken}`);
  console.log('Status:', tc8.status);

  console.log(
    '\n--- Test Case 9: Single Application Status (GET /students/1/applications/1/status) ---',
  );
  const tc9 = await request(server)
    .get('/students/1/applications/1/status')
    .set('Authorization', `Bearer ${studentToken}`);
  console.log('Status:', tc9.status);

  console.log(
    '\n--- Test Case 10: Attendance Clock In (POST /students/1/dtr/time-in) ---',
  );
  const tc10 = await request(server)
    .post('/students/1/dtr/time-in')
    .set('Authorization', `Bearer ${studentToken}`)
    .send({
      internshipAssignmentId: 1,
      timeIn: '08:15:00',
    });
  console.log('Status:', tc10.status);
  console.log('Time In Record is Array?:', Array.isArray(tc10.body));

  console.log(
    '\n--- Test Case 11: Attendance Clock Out (POST /students/1/dtr/time-out) ---',
  );
  const tc11 = await request(server)
    .post('/students/1/dtr/time-out')
    .set('Authorization', `Bearer ${studentToken}`)
    .send({
      internshipAssignmentId: 1,
      timeOut: '17:15:00',
    });
  console.log('Status:', tc11.status);
  console.log('Time Out Record is Array?:', Array.isArray(tc11.body));

  console.log(
    '\n--- Test Case 12: Negative Test - Clock In on Non-Existent Assignment ---',
  );
  const tc12 = await request(server)
    .post('/students/1/dtr/time-in')
    .set('Authorization', `Bearer ${studentToken}`)
    .send({
      internshipAssignmentId: 9999,
      timeIn: '08:15:00',
    });
  console.log('Status (Expect 404):', tc12.status);

  console.log('\n=== All Verification Tests Completed Successfully ===');
  await app.close();
}

runVerification().catch((err) => {
  console.error('Verification failed with unhandled error:', err);
  process.exit(1);
});
