require('dotenv').config();
const { Client } = require('pg');

const approvedIndustries = [
  'Accounting/ Finance',
  'Customer Service/ Retail',
  'Engineering',
  'Healthcare',
  'Hospitality/ Tourism',
  'Human Resources',
  'Information Technology',
  'Office Administration',
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT || 5433),
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME || 'internet_db',
  });
  await client.connect();
  try {
    const industries = await client.query(
      `SELECT industry_name, is_custom_text FROM public.industry
        WHERE industry_name = ANY($1::text[])`,
      [approvedIndustries],
    );
    assert(
      industries.rowCount === 8,
      `All eight approved industries are required. Found: ${industries.rowCount}`,
    );
    assert(
      industries.rows.every((row) => row.is_custom_text === false),
      'Approved industries must have is_custom_text=false.',
    );

    console.log('Reference seed validation passed.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
