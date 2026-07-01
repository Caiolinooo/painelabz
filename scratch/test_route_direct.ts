import { POST } from '../src/app/api/e-social/eventos/[id]/enviar/route';
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
dotenv.config();

const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';

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
  const eventId = '75c7ee81-210a-417d-ad3c-12e1b126b660';
  console.log(`Invoking POST route directly for event ${eventId}...`);

  const req = new NextRequest(`http://localhost:3000/api/e-social/eventos/${eventId}/enviar`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const params = Promise.resolve({ id: eventId });

  try {
    const response = await POST(req, { params });
    console.log("Response status:", response.status);
    const body = await response.json();
    console.log("Response body:", JSON.stringify(body, null, 2));
  } catch (err) {
    console.error("Error executing route POST:", err);
  }
}

run();
