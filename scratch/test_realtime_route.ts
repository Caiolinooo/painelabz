import { GET } from '../src/app/api/man-schedule/realtime/route';
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const jwtSecret = (process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('JWT_SECRET required'); })() : 'dev-only-jwt-secret-not-for-production'));

// Create a valid token
const token = jwt.sign(
  {
    userId: '75abe69b-15ac-4ac2-b973-1075c37252c5',
    role: 'ADMIN'
  },
  jwtSecret,
  { expiresIn: '1d' }
);

async function run() {
  console.log('Invoking GET /api/man-schedule/realtime route directly...');

  const req = new NextRequest(`http://localhost:3000/api/man-schedule/realtime`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  try {
    const response = await GET(req);
    console.log("Response status:", response.status);
    const body = await response.json();
    console.log("Response success:", body.success);
    console.log("Response count:", body.count);
    if (body.data && body.data.length > 0) {
      console.log("Sample schedule data:", body.data[0]);
    }
  } catch (err) {
    console.error("Error executing route GET:", err);
  }
}

run();
