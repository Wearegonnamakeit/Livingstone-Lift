'use client';

import { useState, useEffect } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, query, orderBy, serverTimestamp, deleteDoc, where, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db, messaging, getToken, onMessage } from '../lib/firebase';

interface UserProfile {
  name: string;
  phone: string;
  address: string;
  rideType: string;
  capacity: string;
  isAdmin: boolean;
  isVan?: boolean;
  fcmToken?: string;
}

interface ChurchEvent {
  id: string;
  title: string;
  date: string;
  destination: string;
  type: 'regular' | 'special';
}

interface Application {
  id: string;
  eventId: string;
  userId: string;
  name: string;
  phone: string;
  address: string;
  rideType: string;
  capacity: string;
  role: 'driver' | 'rider';
  carIdTo: string | null;
  carIdFrom: string | null;
  statusTo: string;
  statusFrom: string;
  isVan?: boolean;
}

const text = {
  en: {
    appTitle: "Livingstone Lift",
    loginReq: "Please log in to use the application.",
    loginBtn: "Sign in with Google",
    createProfile: "Create Your Profile",
    name: "Name", phone: "Phone", address: "Address",
    rideType: "Ride Type", capacity: "Capacity (excl. driver)",
    needRide: "Need a Ride", canDrive: "Can Drive", driveSelf: "Drive Self",
    van: "I occasionally drive the Church Van", save: "Save Profile", saving: "Saving...",
    myProfile: "My Profile", signOut: "Sign Out",
    enablePush: "Enable Push Notifications",
    prev: "Prev", next: "Next",
    scheduleTitle: "Schedule for Selected Date",
    regular: "Regular Worship", special: "Special Event",
    myAssignment: "My Assignment", driverTxt: "Driver", statusTxt: "Driver Status",
    late5: "Late 5 min", ready: "Ready outside", waitChurch: "Waiting at church",
    myPassengers: "My Passengers", call: "Call", noPass: "No passengers assigned yet.",
    departed: "Departed", arr3: "3 Mins away",
    applyBtn: "1-Click Apply", appliedBtn: "Applied", cancelBtn: "Cancel",
    noEvent: "No events registered for this date.",
    adminNew: "New Event", adminAssign: "Assignments",
    titleL: "Title", dateL: "Date", destL: "Destination", typeL: "Event Type",
    createBtn: "Create Event", creatingBtn: "Creating...",
    selectEvt: "-- Select Event to Manage --",
    toEvt: "To Event", fromEvt: "From Event",
    waitList: "Waiting List", allAssig: "All assigned",
    cars: "Cars", full: "FULL", mapNav: "Map Navi", dropHere: "Drop here", noDriv: "No drivers available.",
    navCal: "Calendar", navProf: "Profile", navAdmin: "Admin", navGuide: "Guide",
    guideTitle: "User Guide",
    g1T: "1. Install the App", g1D: "iOS: Safari Share Button > 'Add to Home Screen'\nAndroid: Chrome Menu > 'Add to Home screen'",
    g2T: "2. Ride Application", g2D: "Go to Calendar, select a date, and click '1-Click Apply'.",
    g3T: "3. Status Update", g3D: "Use the status buttons or type a custom message to notify your driver/passengers in real-time.",
    loading: "Loading...",
    msgPlaceholder: "Type message...", sendBtn: "Send",
    vehicleType: "Vehicle", personalCar: "Personal Car", churchVan: "Church Van (15 seats)", seats: "seats"
  },
  ko: {
    appTitle: "리빙스톤 리프트",
    loginReq: "앱을 사용하려면 로그인해 주세요.",
    loginBtn: "구글 계정으로 시작하기",
    createProfile: "프로필 생성",
    name: "이름", phone: "연락처", address: "픽업 주소",
    rideType: "탑승 유형", capacity: "탑승 가능 인원(운전자 본인 제외)",
    needRide: "라이드 필요", canDrive: "운전 가능", driveSelf: "개별 이동",
    van: "상황에 따라 교회 밴도 운전합니다", save: "프로필 저장", saving: "저장 중...",
    myProfile: "내 프로필", signOut: "로그아웃",
    enablePush: "푸시 알림 켜기",
    prev: "이전", next: "다음",
    scheduleTitle: "선택된 날짜의 일정",
    regular: "정기 예배", special: "특별 행사",
    myAssignment: "내 탑승 정보", driverTxt: "운전자", statusTxt: "운전자 상태",
    late5: "5분 지각", ready: "탑승 준비 완료", waitChurch: "교회 대기 중",
    myPassengers: "내 탑승자 목록", call: "전화", noPass: "아직 배정된 탑승자가 없습니다.",
    departed: "출발함", arr3: "3분 후 도착",
    applyBtn: "1클릭 신청", appliedBtn: "신청 완료", cancelBtn: "신청 취소",
    noEvent: "이 날짜에 등록된 일정이 없습니다.",
    adminNew: "새 일정 만들기", adminAssign: "인원 배정하기",
    titleL: "일정 이름", dateL: "날짜", destL: "목적지", typeL: "일정 종류",
    createBtn: "일정 생성", creatingBtn: "생성 중...",
    selectEvt: "-- 관리할 일정 선택 --",
    toEvt: "교회로 갈 때 (To)", fromEvt: "집으로 갈 때 (From)",
    waitList: "대기 명단", allAssig: "배정 완료",
    cars: "차량 목록", full: "만차", mapNav: "지도 내비", dropHere: "여기로 드래그", noDriv: "가능한 운전자가 없습니다.",
    navCal: "일정", navProf: "프로필", navAdmin: "관리자", navGuide: "설명서",
    guideTitle: "앱 사용 설명서",
    g1T: "1. 앱 설치하기", g1D: "아이폰: Safari 하단 공유 버튼 > '홈 화면에 추가'\n안드로이드: Chrome 우측 상단 메뉴 > '홈 화면에 추가'",
    g2T: "2. 라이드 신청하기", g2D: "일정(Calendar) 탭에서 날짜를 누르고 '1클릭 신청' 버튼을 누르면 신청이 완료됩니다.",
    g3T: "3. 실시간 톡/상태 알림", g3D: "출발 당일 상태 버튼을 누르거나 직접 텍스트를 입력해서 메시지를 전송하면 상대방에게 즉시 표시됩니다.",
    loading: "로딩 중...",
    msgPlaceholder: "메시지 직접 입력...", sendBtn: "전송",
    vehicleType: "운행 차량", personalCar: "개인 자가용", churchVan: "교회 밴 (15인승)", seats: "인승"
  }
};

const statusMap: Record<string, {en: string, ko: string}> = {
  '5 Mins Late': {en: 'Late 5 min', ko: '5분 지각'},
  'Ready outside': {en: 'Ready outside', ko: '탑승 준비 완료'},
  'Waiting at church': {en: 'Waiting at church', ko: '교회 대기 중'},
  'Departed': {en: 'Departed', ko: '출발함'},
  'Arriving in 3 min': {en: '3 Mins away', ko: '3분 후 도착'},
};

export default function Home() {
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const t = text[lang];
  
  const displayStatus = (status: string) => statusMap[status]?.[lang] || status;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentTab, setCurrentTab] = useState<'calendar' | 'profile' | 'admin' | 'guide'>('calendar');
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '', phone: '', address: '',
    rideType: 'Need a Ride', capacity: '4', isVan: false
  });
  const [saving, setSaving] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<string>('');

  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [userApplications, setUserApplications] = useState<Record<string, Application>>({});
  const [driverDetails, setDriverDetails] = useState<Record<string, Application>>({});
  const [myPassengers, setMyPassengers] = useState<Application[]>([]);
  
  const [newEvent, setNewEvent] = useState({
    title: '', date: '', destination: '', type: 'regular'
  });
  const [creatingEvent, setCreatingEvent] = useState(false);

  const [adminMode, setAdminMode] = useState<'create' | 'assign'>('create');
  const [adminSelectedEventId, setAdminSelectedEventId] = useState<string>('');
  const [eventAttendees, setEventAttendees] = useState<Application[]>([]);
  const [rideDirection, setRideDirection] = useState<'to' | 'from'>('to');
  const [dragOverCarId, setDragOverCarId] = useState<string | null>(null);

  const [customMsg, setCustomMsg] = useState<Record<string, string>>({});

  useEffect(() => {
    let unsubscribeApps: () => void;
    let unsubscribePassengers: () => void;

    const setupRealtime = async (uid: string) => {
      const q = query(collection(db, 'applications'), where('userId', '==', uid));
      unsubscribeApps = onSnapshot(q, async (querySnapshot) => {
        const appliedMap: Record<string, Application> = {};
        const driverIds = new Set<string>();

        querySnapshot.forEach(docSnap => {
          const data = docSnap.data() as Application;
          appliedMap[data.eventId] = { ...data, id: docSnap.id };
          if (data.carIdTo) driverIds.add(data.carIdTo);
          if (data.carIdFrom) driverIds.add(data.carIdFrom);
        });
        setUserApplications(appliedMap);

        const drivers: Record<string, Application> = {};
        for (const dId of Array.from(driverIds)) {
          const dSnap = await getDoc(doc(db, 'applications', dId));
          if (dSnap.exists()) {
            const dData = dSnap.data() as Application;
            drivers[dId] = { ...dData, id: dSnap.id };
          }
        }
        setDriverDetails(prev => ({ ...prev, ...drivers }));
      });

      const qPassengers = query(collection(db, 'applications'));
      unsubscribePassengers = onSnapshot(qPassengers, (snapshot) => {
        const passengers: Application[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as Application;
          if (data.carIdTo?.endsWith(uid) || data.carIdFrom?.endsWith(uid)) {
            passengers.push({ ...data, id: docSnap.id });
          }
        });
        setMyPassengers(passengers);
      });
    };

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchUserProfile(currentUser.uid);
        await fetchEvents();
        setupRealtime(currentUser.uid);
      } else {
        setProfile(null);
        setUserApplications({});
        setMyPassengers([]);
        setLoading(false);
        if (unsubscribeApps) unsubscribeApps();
        if (unsubscribePassengers) unsubscribePassengers();
      }
    });
    
    return () => { unsubscribeAuth(); };
  }, []);

  const requestNotificationPermission = async () => {
    if (!messaging || !user) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, {
          vapidKey: 'BJk6feu2WhkttIgPvgw977NbtMd_1RfEfMFqpYECAZgSxeeqSVmGRXnkYDABCXFMWcN9-fEnGUXStxjSX_QOvcU'
        });
        if (token) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, { fcmToken: token });
          setNotificationStatus(lang === 'ko' ? '푸시 알림이 설정되었습니다.' : 'Push notifications enabled.');
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchUserProfile = async (uid: string) => {
    try {
      const docSnap = await getDoc(doc(db, 'users', uid));
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        setFormData({
          name: data.name || '', phone: data.phone || '', address: data.address || '',
          rideType: data.rideType || 'Need a Ride', capacity: data.capacity || '4', isVan: data.isVan || false
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const q = query(collection(db, 'events'), orderBy('date', 'asc'));
      const querySnapshot = await getDocs(q);
      setEvents(querySnapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id })) as ChurchEvent[]);
    } catch (error) { console.error(error); }
  };

  const fetchEventAttendees = async (eventId: string) => {
    onSnapshot(query(collection(db, 'applications'), where('eventId', '==', eventId)), (snapshot) => {
      setEventAttendees(snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id })) as Application[]);
    });
  };

  useEffect(() => {
    if (adminSelectedEventId) fetchEventAttendees(adminSelectedEventId);
    else setEventAttendees([]);
  }, [adminSelectedEventId]);

  const handleLogin = () => signInWithPopup(auth, googleProvider);
  const handleLogout = () => { signOut(auth); setProfile(null); setCurrentTab('calendar'); };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const newProfile = { ...formData, isAdmin: profile?.isAdmin || false, fcmToken: profile?.fcmToken || '' };
      await setDoc(doc(db, 'users', user.uid), newProfile);
      setProfile(newProfile as UserProfile);
    } finally { setSaving(false); }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingEvent(true);
    try {
      await addDoc(collection(db, 'events'), newEvent);
      setNewEvent({ title: '', date: '', destination: '', type: 'regular' });
      await fetchEvents();
    } finally { setCreatingEvent(false); }
  };

  const handleApply = async (event: ChurchEvent) => {
    if (!user || !profile) return;
    try {
      const appId = `${event.id}_${user.uid}`;
      await setDoc(doc(db, 'applications', appId), {
        eventId: event.id, userId: user.uid, name: profile.name, phone: profile.phone, address: profile.address,
        rideType: profile.rideType, capacity: profile.capacity, role: profile.rideType.includes('Drive') ? 'driver' : 'rider',
        carIdTo: null, carIdFrom: null, statusTo: '', statusFrom: '', isVan: profile.isVan || false, appliedAt: serverTimestamp()
      });
    } catch (error) { console.error(error); }
  };

  const handleCancelApplication = async (eventId: string) => {
    if (user) await deleteDoc(doc(db, 'applications', `${eventId}_${user.uid}`));
  };

  const updateStatus = async (appId: string, direction: 'to' | 'from', statusMsg: string) => {
    try {
      await updateDoc(doc(db, 'applications', appId), { [direction === 'to' ? 'statusTo' : 'statusFrom']: statusMsg });
    } catch (error) { console.error(error); }
  };

  const updateVehicle = async (appId: string, isVan: boolean, capacity: string) => {
    try {
      await updateDoc(doc(db, 'applications', appId), { isVan, capacity });
    } catch (error) { console.error(error); }
  };

  const handleSendCustomMsg = (appId: string, direction: 'to' | 'from') => {
    const key = `${appId}_${direction}`;
    const msg = customMsg[key];
    if (msg && msg.trim() !== '') {
      updateStatus(appId, direction, msg);
      setCustomMsg(prev => ({ ...prev, [key]: '' }));
    }
  };

  const handleDrop = async (e: React.DragEvent, carId: string | null, capacityStr?: string) => {
    e.preventDefault(); e.stopPropagation(); setDragOverCarId(null);
    const passengerId = e.dataTransfer.getData('passengerId');
    if (!passengerId) return;

    if (carId && capacityStr) {
      const limit = parseInt(capacityStr) || 4;
      if (eventAttendees.filter(a => rideDirection === 'to' ? a.carIdTo === carId : a.carIdFrom === carId).length >= limit) {
        alert(t.full); return;
      }
    }
    await updateDoc(doc(db, 'applications', passengerId), { [rideDirection === 'to' ? 'carIdTo' : 'carIdFrom']: carId });
  };

  const openNavigation = (driverAppId: string) => {
    const passengers = eventAttendees.filter(a => rideDirection === 'to' ? a.carIdTo === driverAppId : a.carIdFrom === driverAppId);
    if (passengers.length === 0) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(passengers[0].address)}&waypoints=${passengers.slice(1).map(p => encodeURIComponent(p.address)).join('|')}&destination=Livingstone+Church`;
    window.open(url, '_blank');
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>{t.loading}</div>;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const blanks = Array.from({ length: new Date(year, month, 1).getDay() }, (_, i) => i);
  const days = Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => i + 1);
  const monthNames = lang === 'ko' ? ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"] : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  
  const drivers = eventAttendees.filter(a => a.role === 'driver');
  const riders = eventAttendees.filter(a => a.role === 'rider');
  const unassignedRiders = riders.filter(r => rideDirection === 'to' ? r.carIdTo === null : r.carIdFrom === null);

  return (
    <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto', background: '#f4f4f5', minHeight: '100vh', paddingBottom: '80px', fontFamily: 'sans-serif' }}>
      <header style={{ background: '#ffffff', padding: '15px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e4e4e7' }}>
        <h1 style={{ margin: 0, fontSize: '18px', color: '#18181b', fontWeight: 'bold' }}>{t.appTitle}</h1>
        <button onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')} style={{ padding: '6px 12px', background: '#e4e4e7', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
          {lang === 'ko' ? 'EN / KR' : 'KR / EN'}
        </button>
      </header>

      <main style={{ padding: '20px' }}>
        {!user ? (
          <div style={{ background: '#ffffff', padding: '30px', borderRadius: '12px', textAlign: 'center' }}>
            <p style={{ marginBottom: '20px' }}>{t.loginReq}</p>
            <button onClick={handleLogin} style={{ width: '100%', padding: '14px', background: '#3b82f6', color: 'white', borderRadius: '8px', fontWeight: 'bold' }}>{t.loginBtn}</button>
          </div>
        ) : !profile ? (
          <div style={{ background: '#ffffff', padding: '25px', borderRadius: '12px' }}>
            <h2 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>{t.createProfile}</h2>
            <form onSubmit={handleSaveProfile}>
              <div style={{ marginBottom: '15px' }}><label>{t.name}</label><input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>
              <div style={{ marginBottom: '15px' }}><label>{t.phone}</label><input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>
              <div style={{ marginBottom: '15px' }}><label>{t.address}</label><input required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>
              <div style={{ marginBottom: '15px' }}>
                <label>{t.rideType}</label>
                <select value={formData.rideType} onChange={e => setFormData({...formData, rideType: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
                  <option value="Need a Ride">{t.needRide}</option><option value="Can Drive">{t.canDrive}</option><option value="Drive Self">{t.driveSelf}</option>
                </select>
              </div>
              {formData.rideType === 'Can Drive' && (
                <>
                  <div style={{ marginBottom: '15px' }}><label>{t.capacity}</label><input type="number" value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>
                  <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
                    <input type="checkbox" id="isVan" checked={formData.isVan} onChange={e => setFormData({...formData, isVan: e.target.checked})} />
                    <label htmlFor="isVan" style={{ fontSize: '13px', fontWeight: 'bold' }}>{t.van}</label>
                  </div>
                </>
              )}
              <button type="submit" disabled={saving} style={{ width: '100%', padding: '14px', background: '#18181b', color: 'white', borderRadius: '8px', fontWeight: 'bold' }}>{saving ? t.saving : t.save}</button>
            </form>
          </div>
        ) : (
          <>
            {currentTab === 'calendar' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: '#fff', padding: '15px', borderRadius: '16px' }}>
                  <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}>{t.prev}</button>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{year} {monthNames[month]}</h2>
                  <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}>{t.next}</button>
                </div>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
                    {blanks.map(b => <div key={`blank-${b}`} />)}
                    {days.map(day => {
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const hasEvent = events.some(e => e.date === dateStr);
                      return (
                        <div key={day} onClick={() => setSelectedDate(dateStr)} style={{ height: '45px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: '8px', background: selectedDate === dateStr ? '#18181b' : hasEvent ? '#f3f4f6' : 'transparent', color: selectedDate === dateStr ? '#fff' : '#18181b', fontWeight: hasEvent ? 'bold' : 'normal' }}>
                          <span>{day}</span>
                          {hasEvent && <div style={{ width: '5px', height: '5px', background: selectedDate === dateStr ? '#fff' : '#3b82f6', borderRadius: '50%', marginTop: '3px' }} />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedDate && (
                  <div style={{ marginTop: '20px' }}>
                    <h3 style={{ fontSize: '16px', marginBottom: '10px', fontWeight: 'bold' }}>{t.scheduleTitle}</h3>
                    {events.filter(e => e.date === selectedDate).map(event => {
                      const userApp = userApplications[event.id];
                      return (
                        <div key={event.id} style={{ background: '#fff', padding: '20px', borderRadius: '16px', marginBottom: '10px' }}>
                          <span style={{ fontSize: '12px', background: event.type === 'regular' ? '#dbeafe' : '#fce7f3', color: event.type === 'regular' ? '#1d4ed8' : '#be185d', padding: '5px 10px', borderRadius: '12px', fontWeight: 'bold' }}>{event.type === 'regular' ? t.regular : t.special}</span>
                          <h4 style={{ margin: '12px 0', fontSize: '18px' }}>{event.title}</h4>
                          
                          {userApp?.role === 'driver' && (
                            <div style={{ marginBottom: '15px', background: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{t.vehicleType}:</span>
                                <select 
                                  value={userApp.isVan ? 'van' : 'car'} 
                                  onChange={(e) => {
                                    const isVan = e.target.value === 'van';
                                    updateVehicle(userApp.id, isVan, isVan ? '15' : profile.capacity);
                                  }}
                                  style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px' }}
                                >
                                  <option value="car">{t.personalCar} ({profile.capacity}{t.seats})</option>
                                  <option value="van">{t.churchVan}</option>
                                </select>
                              </div>
                              <h5 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>{t.myPassengers}</h5>
                              {myPassengers.filter(p => p.eventId === event.id).map(p => (
                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#fff', borderRadius: '6px', marginBottom: '5px', border: '1px solid #e2e8f0' }}>
                                  <div><span style={{ fontSize: '13px', fontWeight: 'bold' }}>{p.name}</span> {p.statusTo && p.carIdTo?.endsWith(user.uid) && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold', marginLeft: '5px' }}>({displayStatus(p.statusTo)})</span>}</div>
                                  <a href={`tel:${p.phone}`} style={{ fontSize: '12px', color: '#2563eb', fontWeight: 'bold' }}>{t.call}</a>
                                </div>
                              ))}
                              
                              <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                                <button onClick={() => updateStatus(userApp.id, 'to', 'Departed')} style={{ flex: 1, padding: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>{t.departed}</button>
                                <button onClick={() => updateStatus(userApp.id, 'to', 'Arriving in 3 min')} style={{ flex: 1, padding: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>{t.arr3}</button>
                              </div>
                              <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                <input type="text" placeholder={t.msgPlaceholder} value={customMsg[`${userApp.id}_to`] || ''} onChange={e => setCustomMsg({...customMsg, [`${userApp.id}_to`]: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px' }} />
                                <button onClick={() => handleSendCustomMsg(userApp.id, 'to')} style={{ padding: '8px 15px', background: '#18181b', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>{t.sendBtn}</button>
                              </div>
                            </div>
                          )}

                          {userApp?.role === 'rider' && (
                            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                              <h5 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>{t.myAssignment}</h5>
                              {userApp.carIdTo && (
                                <div style={{ marginBottom: '15px' }}>
                                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>{t.toEvt} ({t.driverTxt}: {driverDetails[userApp.carIdTo]?.name || '...'})</span>
                                  {driverDetails[userApp.carIdTo]?.statusTo && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', margin: '5px 0' }}>{t.statusTxt}: {displayStatus(driverDetails[userApp.carIdTo].statusTo)}</div>}
                                  <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                    <button onClick={() => updateStatus(userApp.id, 'to', '5 Mins Late')} style={{ flex: 1, padding: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>{t.late5}</button>
                                    <button onClick={() => updateStatus(userApp.id, 'to', 'Ready outside')} style={{ flex: 1, padding: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>{t.ready}</button>
                                  </div>
                                  <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                    <input type="text" placeholder={t.msgPlaceholder} value={customMsg[`${userApp.id}_to`] || ''} onChange={e => setCustomMsg({...customMsg, [`${userApp.id}_to`]: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px' }} />
                                    <button onClick={() => handleSendCustomMsg(userApp.id, 'to')} style={{ padding: '8px 15px', background: '#18181b', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>{t.sendBtn}</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '10px' }}>
                            {!userApp ? (
                              <button onClick={() => handleApply(event)} style={{ flex: 1, padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>{t.applyBtn}</button>
                            ) : (
                              <>
                                <div style={{ flex: 1, padding: '12px', background: '#10b981', color: '#fff', textAlign: 'center', borderRadius: '8px', fontWeight: 'bold' }}>{t.appliedBtn}</div>
                                <button onClick={() => handleCancelApplication(event.id)} style={{ flex: 1, padding: '12px', background: '#f4f4f5', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: 'bold' }}>{t.cancelBtn}</button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {events.filter(e => e.date === selectedDate).length === 0 && <div style={{ padding: '30px', textAlign: 'center', color: '#a1a1aa' }}>{t.noEvent}</div>}
                  </div>
                )}
              </div>
            )}

            {currentTab === 'profile' && (
              <div style={{ background: '#ffffff', padding: '25px', borderRadius: '12px' }}>
                <h2 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>{t.myProfile}</h2>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}><strong>{t.name}:</strong> {profile.name}</p>
                  <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}><strong>{t.phone}:</strong> {profile.phone}</p>
                  <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}><strong>{t.address}:</strong> {profile.address}</p>
                  <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}><strong>{t.rideType}:</strong> {profile.rideType}</p>
                  <button onClick={handleLogout} style={{ width: '100%', padding: '12px', background: '#f4f4f5', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: 'bold' }}>{t.signOut}</button>
                </div>
              </div>
            )}
            
            {currentTab === 'guide' && (
              <div style={{ background: '#ffffff', padding: '25px', borderRadius: '12px', border: '1px solid #e4e4e7' }}>
                <h2 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>{t.guideTitle}</h2>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '15px', color: '#2563eb', marginBottom: '8px' }}>{t.g1T}</h3>
                  <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#555', whiteSpace: 'pre-line' }}>{t.g1D}</p>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '15px', color: '#2563eb', marginBottom: '8px' }}>{t.g2T}</h3>
                  <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#555', whiteSpace: 'pre-line' }}>{t.g2D}</p>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '15px', color: '#2563eb', marginBottom: '8px' }}>{t.g3T}</h3>
                  <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#555', whiteSpace: 'pre-line' }}>{t.g3D}</p>
                </div>
              </div>
            )}

            {currentTab === 'admin' && profile.isAdmin && (
              <div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  <button onClick={() => setAdminMode('create')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: adminMode === 'create' ? '#18181b' : '#e4e4e7', color: adminMode === 'create' ? '#fff' : '#71717a', fontWeight: 'bold' }}>{t.adminNew}</button>
                  <button onClick={() => setAdminMode('assign')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: adminMode === 'assign' ? '#18181b' : '#e4e4e7', color: adminMode === 'assign' ? '#fff' : '#71717a', fontWeight: 'bold' }}>{t.adminAssign}</button>
                </div>

                {adminMode === 'create' ? (
                  <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px' }}>
                    <form onSubmit={handleCreateEvent}>
                      <div style={{ marginBottom: '15px' }}><label>{t.titleL}</label><input required value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>
                      <div style={{ marginBottom: '15px' }}><label>{t.dateL}</label><input required type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>
                      <div style={{ marginBottom: '15px' }}><label>{t.destL}</label><input required value={newEvent.destination} onChange={e => setNewEvent({...newEvent, destination: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>
                      <button type="submit" style={{ width: '100%', padding: '12px', background: '#3b82f6', color: 'white', borderRadius: '8px', fontWeight: 'bold' }}>{creatingEvent ? t.creatingBtn : t.createBtn}</button>
                    </form>
                  </div>
                ) : (
                  <div>
                    <select value={adminSelectedEventId} onChange={e => setAdminSelectedEventId(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '15px' }}>
                      <option value="">{t.selectEvt}</option>
                      {events.map(ev => <option key={ev.id} value={ev.id}>{ev.date} - {ev.title}</option>)}
                    </select>

                    {adminSelectedEventId && (
                      <>
                        <div style={{ display: 'flex', background: '#e4e4e7', padding: '4px', borderRadius: '10px', marginBottom: '20px' }}>
                          <button onClick={() => setRideDirection('to')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: rideDirection === 'to' ? '#fff' : 'transparent', fontWeight: 'bold' }}>{t.toEvt}</button>
                          <button onClick={() => setRideDirection('from')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: rideDirection === 'from' ? '#fff' : 'transparent', fontWeight: 'bold' }}>{t.fromEvt}</button>
                        </div>

                        <div onDragOver={(e) => { e.preventDefault(); setDragOverCarId('waiting'); }} onDrop={(e) => handleDrop(e, null)} style={{ background: dragOverCarId === 'waiting' ? '#f3f4f6' : '#fff', padding: '15px', borderRadius: '12px', border: '1px solid #e4e4e7', marginBottom: '20px', minHeight: '100px' }}>
                          <h4 style={{ margin: '0 0 10px 0' }}>{t.waitList} ({unassignedRiders.length})</h4>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {unassignedRiders.map(r => <div key={r.id} draggable onDragStart={e => e.dataTransfer.setData('passengerId', r.id)} style={{ padding: '6px 12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', cursor: 'grab' }}>{r.name}</div>)}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                          <h4 style={{ margin: 0 }}>{t.cars}</h4>
                          {drivers.map(driver => {
                            const passengers = riders.filter(r => rideDirection === 'to' ? r.carIdTo === driver.id : r.carIdFrom === driver.id);
                            const isFull = passengers.length >= parseInt(driver.capacity);
                            return (
                              <div key={driver.id} onDragOver={(e) => { e.preventDefault(); if(!isFull) setDragOverCarId(driver.id); }} onDrop={(e) => handleDrop(e, driver.id, driver.capacity)} style={{ background: isFull ? '#fff1f2' : (dragOverCarId === driver.id ? '#ecfdf5' : '#fff'), padding: '15px', borderRadius: '12px', border: isFull ? '2px solid #fecaca' : '1px solid #e4e4e7', position: 'relative' }}>
                                {isFull && <div style={{ position: 'absolute', right: '-25px', top: '15px', background: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '4px 30px', transform: 'rotate(45deg)' }}>{t.full}</div>}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                  <div style={{ fontWeight: 'bold' }}>{driver.isVan ? <span style={{ color: '#2563eb' }}>[Van] </span> : 'Car: '}{driver.name}</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button onClick={() => openNavigation(driver.id)} style={{ padding: '6px 10px', background: '#18181b', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>{t.mapNav}</button>
                                    <span style={{ color: isFull ? '#ef4444' : '#166534', fontWeight: 'bold' }}>{passengers.length} / {driver.capacity}</span>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '40px', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                                  {passengers.map(p => <div key={p.id} draggable onDragStart={e => e.dataTransfer.setData('passengerId', p.id)} style={{ padding: '6px 12px', background: '#3b82f6', color: '#fff', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>{p.name}</div>)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {user && profile && (
        <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: '#ffffff', display: 'flex', borderTop: '1px solid #e4e4e7' }}>
          <button onClick={() => setCurrentTab('calendar')} style={{ flex: 1, padding: '15px 0', background: 'none', border: 'none', color: currentTab === 'calendar' ? '#18181b' : '#a1a1aa', fontWeight: currentTab === 'calendar' ? 'bold' : 'normal', fontSize: '13px' }}>{t.navCal}</button>
          <button onClick={() => setCurrentTab('profile')} style={{ flex: 1, padding: '15px 0', background: 'none', border: 'none', color: currentTab === 'profile' ? '#18181b' : '#a1a1aa', fontWeight: currentTab === 'profile' ? 'bold' : 'normal', fontSize: '13px' }}>{t.navProf}</button>
          <button onClick={() => setCurrentTab('guide')} style={{ flex: 1, padding: '15px 0', background: 'none', border: 'none', color: currentTab === 'guide' ? '#18181b' : '#a1a1aa', fontWeight: currentTab === 'guide' ? 'bold' : 'normal', fontSize: '13px' }}>{t.navGuide}</button>
          {profile.isAdmin && <button onClick={() => setCurrentTab('admin')} style={{ flex: 1, padding: '15px 0', background: 'none', border: 'none', color: currentTab === 'admin' ? '#18181b' : '#a1a1aa', fontWeight: currentTab === 'admin' ? 'bold' : 'normal', fontSize: '13px' }}>{t.navAdmin}</button>}
        </nav>
      )}
    </div>
  );
}