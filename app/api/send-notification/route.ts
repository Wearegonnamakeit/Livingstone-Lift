import { NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

const projectId = process.env.FIREBASE_PROJECT_ID || '';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || '';
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export async function POST(request: Request) {
  try {
    const { token, title, body } = await request.json();
    
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 400 });

    await getMessaging().send({
      token,
      notification: { title, body },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push error:', error);
    return NextResponse.json({ error: 'Failed to send push notification' }, { status: 500 });
  }
}