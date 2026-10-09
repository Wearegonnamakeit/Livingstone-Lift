import { NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

// 더 이상 쓸 수 없는 알림 주소(앱 삭제, 브라우저 데이터 삭제 등)를 나타내는 오류 코드
const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

export async function POST(request: Request) {
  try {
    const { userId, title, body } = await request.json();
    if (!userId) return NextResponse.json({ error: 'No userId provided' }, { status: 400 });

    const userRef = getFirestore().collection('users').doc(userId);
    const snap = await userRef.get();
    const data = snap.data() || {};

    // 새 방식(fcmTokens 배열) + 예전 방식(fcmToken 하나)을 모두 모아서 중복 제거
    const tokens: string[] = Array.from(new Set<string>([
      ...((data.fcmTokens as string[]) || []),
      ...(data.fcmToken ? [data.fcmToken as string] : []),
    ].filter(Boolean)));

    if (tokens.length === 0) return NextResponse.json({ success: true, sent: 0 });

    const res = await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
    });

    // 죽은 주소는 자동으로 정리
    const dead = tokens.filter((_, i) => {
      const r = res.responses[i];
      return !r.success && r.error && DEAD_TOKEN_CODES.has(r.error.code);
    });
    if (dead.length > 0) {
      const updates: Record<string, unknown> = { fcmTokens: FieldValue.arrayRemove(...dead) };
      if (data.fcmToken && dead.includes(data.fcmToken)) updates.fcmToken = '';
      await userRef.update(updates);
    }

    return NextResponse.json({ success: true, sent: res.successCount, removed: dead.length });
  } catch (error) {
    console.error('Push error:', error);
    return NextResponse.json({ error: 'Failed to send push notification' }, { status: 500 });
  }
}
