import fs from 'fs';
import path from 'path';

// Parse .env.local manually
const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    process.env[key] = val;
  }
}

import { generateOtp } from './lib/otp/generate.js';
import { storeOtp } from './lib/otp/store.js';
import { sendOtpEmail } from './lib/otp/mailer.js';

async function test() {
  const testEmail = 'p.manojkumar1101@gmail.com';
  const otp = generateOtp();
  console.log(`Generated OTP: ${otp}`);

  console.log('Testing storeOtp...');
  try {
    await storeOtp(testEmail, otp);
    console.log('storeOtp succeeded!');
  } catch (err) {
    console.error('storeOtp failed:', err);
  }

  console.log('Testing sendOtpEmail...');
  try {
    await sendOtpEmail({ to: testEmail, otp, name: 'Test User' });
    console.log('sendOtpEmail succeeded!');
  } catch (err) {
    console.error('sendOtpEmail failed:', err);
  }
}

test();
