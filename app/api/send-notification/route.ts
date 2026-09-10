import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export async function POST(request: Request) {
  try {
    const { token, title, body } = await request.json();
    
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 400 });

    // 파이어베이스를 통해 상대방 기기로 푸시 알림 즉시 전송!
    await admin.messaging().send({
      token,
      notification: { title, body },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push error:', error);
    return NextResponse.json({ error: 'Failed to send push notification' }, { status: 500 });
  }
}