'use client';

import { useState, useEffect, useRef } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, query, orderBy, serverTimestamp, deleteDoc, where, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db, messaging, getToken, onMessage } from '../lib/firebase';

interface UserProfile {
  name: string;
  phone: string;
  address: string;
  zone?: string;
  rideType: string;
  capacity: string;
  isAdmin: boolean;
  isVan?: boolean;
  fcmToken?: string;
  isGuest?: boolean;
  regFri?: boolean;
  regSatPraise?: boolean;
  regSunPraise?: boolean;
  regSun?: boolean;
}

interface ChurchEvent {
  id: string;
  title: string;
  date: string;
  destination: string;
  type: 'regular' | 'special';
  isLocked?: boolean;
}

interface Application {
  id: string;
  eventId: string;
  userId: string;
  name: string;
  phone: string;
  address: string;
  zone?: string;
  rideType: string;
  capacity: string;
  role: 'driver' | 'rider';
  carIdTo: string | null;
  carIdFrom: string | null;
  statusTo: string;
  statusFrom: string;
  isVan?: boolean;
}

const text: Record<string, any> = {
  en: {
    appTitle: "Livingstone Lift", loginReq: "Please log in to use the application.", loginBtn: "Sign in with Google",
    createProfile: "Create Your Profile", name: "Name", phone: "Phone", address: "Address (Detailed)", rideType: "Ride Type", capacity: "Capacity (excl. driver)",
    needRide: "Need a Ride", canDrive: "Can Drive", driveSelf: "Drive Self", van: "I occasionally drive the Church Van", save: "Save Profile", saving: "Saving...",
    myProfile: "My Profile", signOut: "Sign Out", prev: "Prev", next: "Next", scheduleTitle: "Schedule for Selected Date",
    regular: "Regular Worship", special: "Special Event", myAssignment: "My Assignment", driverTxt: "Driver", statusTxt: "Driver Status",
    waitPickup: "Waiting at pickup area", myPassengers: "My Passengers", call: "Call", noPass: "No passengers assigned yet.",
    departed: "Departed", arrived: "Arrived", applyBtn: "1-Click Apply", appliedBtn: "Applied", cancelBtn: "Cancel", noEvent: "No events registered for this date.",
    adminNew: "New Event", adminAssign: "Assign", adminUsers: "Roster", titleL: "Title", dateL: "Date", destL: "Destination", typeL: "Event Type",
    createBtn: "Create Event", creatingBtn: "Creating...", selectEvt: "-- Select Event to Manage --", toEvt: "To Event", fromEvt: "From Event",
    waitList: "Waiting List", allAssig: "All assigned", cars: "Cars", full: "FULL", mapNav: "Map Navi", dropHere: "Drop here", noDriv: "No drivers available.",
    navCal: "Calendar", navProf: "Prof", navGuide: "Guide", guideTitle: "User Guide",
    g1T: "1. Install the App", g1D: "iOS: Safari Share Button > 'Add to Home Screen'\nAndroid: Chrome Menu > 'Add to Home screen'",
    g2T: "2. Ride Application", g2D: "Go to Calendar, select a date, and click '1-Click Apply'.",
    g3T: "3. Status Update", g3D: "Use the status buttons or type a custom message to notify your driver/passengers in real-time.",
    loading: "Loading...", msgPlaceholder: "Type message...", sendBtn: "Send", vehicleType: "Vehicle", personalCar: "Personal Car", churchVan: "Church Van (15 seats)", seats: "seats",
    refresh: "Refresh", statusUpdated: "Status updated.", msgSent: "Message sent.", refreshed: "Data refreshed successfully.",
    assignedTitle: "Ride Assigned", assignedBody: "A driver has been assigned to you.", alertTitle: "Driver Update", newMsg: "New Message",
    pushEnabled: "[ON] Push Notifications (Disable)", pushDisabled: "Enable Push Notifications", disablePushConfirm: "Do you want to disable push notifications?",
    deleteEvt: "Delete Event", confirmDeleteEvt: "Are you sure you want to delete this event?",
    statsTxt: "Total Riders", statsSeats: "Total Seats", statsAvail: "Seats Available", statsShort: "Seat Shortage",
    addGuestBtn: "Add Offline User", proxyApplyTitle: "Proxy Apply (Search)", searchPlaceholder: "Search by name...", addBtn: "Add", noResult: "No results found.",
    applyModalTitle: "Application", confirmApply: "Confirm Apply", close: "Close",
    autoGenBtn: "Auto-Generate 1 Month (Fri/Sat/Sun)", autoGenConfirm: "Generate regular and praise team events for the next 30 days?", autoGenDone: "Events generated!",
    lockEvt: "Lock Event", unlockEvt: "Unlock Event", evtLocked: "Event Closed", sortByAddr: "📍 Group by Zone", sortByName: "🔤 Sort by Name",
    zoneL: "Residential Zone", 
    zone1: "State St. / Downtown (Hub, Lucky, Cap Square, etc.)", zone2: "The Nick / Southeast (Witte, Sellery, Kohl Center, etc.)",
    zone3: "Union South / Regent (Engineering, Camp Randall, etc.)", zone4: "Hilldale / Sheboygan (Hilldale Mall, West Side Apts)",
    zone5: "Eagle Heights (University Houses, etc.)", zone6: "Other (Any other areas)",
    editProfile: "Edit Profile", cancelEdit: "Cancel Edit", selectToAssign: "Tap a person, then tap a car to assign.", dailyRoster: "Daily Attendees",
    regLabel: "Regular Attendance (Auto-Apply)", regFri: "Friday Worship", regSatPraise: "Sat Praise", regSunPraise: "Sun Praise", regSun: "Sunday Worship"
  },
  ko: {
    appTitle: "Livingstone Lift", loginReq: "앱을 사용하려면 로그인해 주세요.", loginBtn: "구글 계정으로 시작하기",
    createProfile: "프로필 생성", name: "이름", phone: "연락처", address: "상세 주소", rideType: "탑승 유형", capacity: "탑승 가능 인원(운전자 본인 제외)",
    needRide: "라이드 필요", canDrive: "운전 가능", driveSelf: "개별 이동", van: "상황에 따라 교회 밴도 운전합니다", save: "프로필 저장", saving: "저장 중...",
    myProfile: "내 프로필", signOut: "로그아웃", prev: "이전", next: "다음", scheduleTitle: "선택된 날짜의 일정",
    regular: "정기 예배", special: "특별 행사", myAssignment: "내 탑승 정보", driverTxt: "운전자", statusTxt: "운전자 상태",
    waitPickup: "탑승 구역 대기 중", myPassengers: "내 탑승자 목록", call: "전화", noPass: "아직 배정된 정보가 없습니다.",
    departed: "출발함", arrived: "도착함", applyBtn: "1클릭 신청", appliedBtn: "신청 완료", cancelBtn: "신청 취소", noEvent: "이 날짜에 등록된 일정이 없습니다.",
    adminNew: "새 일정", adminAssign: "인원 배정", adminUsers: "교인 명단", titleL: "일정 이름", dateL: "날짜", destL: "목적지", typeL: "일정 종류",
    createBtn: "일정 생성", creatingBtn: "생성 중...", selectEvt: "-- 관리할 일정 선택 --", toEvt: "교회로 갈 때 (To)", fromEvt: "집으로 갈 때 (From)",
    waitList: "대기 명단", allAssig: "배정 완료", cars: "차량 목록", full: "만차", mapNav: "지도 내비", dropHere: "여기로 드래그", noDriv: "가능한 운전자가 없습니다.",
    navCal: "일정", navProf: "프로필", navGuide: "설명서", guideTitle: "앱 사용 설명서",
    g1T: "1. 앱 설치하기", g1D: "아이폰: Safari 하단 공유 버튼 > '홈 화면에 추가'\n안드로이드: Chrome 우측 상단 메뉴 > '홈 화면에 추가'",
    g2T: "2. 라이드 신청하기", g2D: "일정(Calendar) 탭에서 날짜를 누르고 '1클릭 신청' 버튼을 누르면 신청이 완료됩니다.",
    g3T: "3. 실시간 톡/상태 알림", g3D: "출발 당일 상태 버튼을 누르거나 직접 텍스트를 입력해서 메시지를 전송하면 상대방에게 즉시 표시됩니다.",
    loading: "로딩 중...", msgPlaceholder: "메시지 직접 입력...", sendBtn: "전송", vehicleType: "운행 차량", personalCar: "개인 자가용", churchVan: "교회 밴 (15인승)", seats: "인승",
    refresh: "새로고침", statusUpdated: "상태가 전송되었습니다.", msgSent: "메시지가 전송되었습니다.", refreshed: "최신 정보로 새로고침 되었습니다.",
    assignedTitle: "배차 완료", assignedBody: "차량이 성공적으로 배정되었습니다.", alertTitle: "운전자 상태 업데이트", newMsg: "새 메시지",
    pushEnabled: "[ON] 푸시 알림 켜짐 (끄기)", pushDisabled: "푸시 알림 켜기", disablePushConfirm: "푸시 알림을 끄시겠습니까?",
    deleteEvt: "일정 삭제", confirmDeleteEvt: "정말로 이 일정을 삭제하시겠습니까? 신청 내역도 모두 삭제됩니다.",
    statsTxt: "신청 인원", statsSeats: "전체 좌석", statsAvail: "남은 자리", statsShort: "자리 부족",
    addGuestBtn: "수동 교인 추가", proxyApplyTitle: "대리 신청 (이름 검색)", searchPlaceholder: "이름을 입력하세요...", addBtn: "추가", noResult: "검색 결과가 없습니다.",
    applyModalTitle: "탑승 신청", confirmApply: "신청 완료", close: "닫기",
    autoGenBtn: "1달치 예배/찬양팀 자동 생성 (금/토/일)", autoGenConfirm: "앞으로 30일간의 정기 예배 및 찬양팀 일정을 생성하시겠습니까?", autoGenDone: "생성 완료되었습니다.",
    lockEvt: "일정 마감", unlockEvt: "마감 해제", evtLocked: "마감된 일정입니다", sortByAddr: "📍 구역별 색깔 정렬", sortByName: "🔤 이름순 정렬",
    zoneL: "거주 구역 (차량 배정용)", 
    zone1: "State St. / Downtown (허브, 럭키, 캡스퀘어 등)", zone2: "The Nick / Southeast (콜 센터, Witte, Sellery 등)",
    zone3: "Union South / Regent (공대, 캠프 랜들 근처)", zone4: "Hilldale / Sheboygan (힐데일 몰, 셔보이건 애비뉴 등)",
    zone5: "Eagle Heights (이글 하이츠 가족 기숙사)", zone6: "Other (그 외 기타 지역)",
    editProfile: "프로필 수정", cancelEdit: "수정 취소", selectToAssign: "💡 대기자를 먼저 터치한 후, 차량을 터치해 배정하세요.", dailyRoster: "해당 날짜 신청자 명단",
    regLabel: "정기 참석 자동 신청", regFri: "금요예배", regSatPraise: "토요 찬양팀", regSunPraise: "주일 찬양팀", regSun: "주일예배"
  }
};

const statusMap: Record<string, {en: string, ko: string}> = {
  'Waiting at pickup area': {en: 'Waiting at pickup area', ko: '탑승 구역 대기 중'},
  'Departed': {en: 'Departed', ko: '출발함'},
  'Arrived': {en: 'Arrived', ko: '도착함'},
};

const zoneColors: Record<string, string> = {
  'zone1': '#3b82f6', 'zone2': '#8b5cf6', 'zone3': '#f59e0b', 'zone4': '#10b981', 'zone5': '#ef4444', 'zone6': '#64748b',
};

export default function Home() {
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const t = text[lang];
  const weekDays = lang === 'ko' ? ['일', '월', '화', '수', '목', '금', '토'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const displayStatus = (status: string) => statusMap[status]?.[lang] || status;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  const [currentTab, setCurrentTab] = useState<'calendar' | 'profile' | 'guide' | 'create' | 'assign' | 'users'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [formData, setFormData] = useState({ 
    name: '', phone: '', address: '', zone: 'zone1', rideType: 'Need a Ride', capacity: '4', isVan: false,
    regFri: false, regSatPraise: false, regSunPraise: false, regSun: false 
  });
  const [saving, setSaving] = useState(false);

  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [userApplications, setUserApplications] = useState<Record<string, Application>>({});
  const [driverDetails, setDriverDetails] = useState<Record<string, Application>>({});
  const [myPassengers, setMyPassengers] = useState<Application[]>([]);
  
  const [newEvent, setNewEvent] = useState({ title: '', date: '', destination: '', type: 'regular' });
  const [creatingEvent, setCreatingEvent] = useState(false);

  const [adminSelectedEventId, setAdminSelectedEventId] = useState<string>('');
  const [eventAttendees, setEventAttendees] = useState<Application[]>([]);
  const [allUsersList, setAllUsersList] = useState<(UserProfile & {id: string})[]>([]);
  const [rideDirection, setRideDirection] = useState<'to' | 'from'>('to');
  
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [customMsg, setCustomMsg] = useState<Record<string, string>>({});
  const prevAppsRef = useRef<Record<string, Application>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingGuest, setIsAddingGuest] = useState(false);
  const [guestData, setGuestData] = useState({ 
    name: '', phone: '', address: '', zone: 'zone6', rideType: 'Need a Ride', capacity: '4', isVan: false,
    regFri: false, regSatPraise: false, regSunPraise: false, regSun: false 
  });

  const [applyEvent, setApplyEvent] = useState<ChurchEvent | null>(null);
  const [applyData, setApplyData] = useState({ rideType: '', capacity: '', isVan: false });
  const [sortByAddress, setSortByAddress] = useState(true);

  const canManage = profile?.isAdmin || profile?.rideType === 'Can Drive';

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(err => console.error(err));
    }
  }, []);

  const showLocalNotification = (title: string, body: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icon.png' });
    } else {
      alert(`${title}\n${body}`);
    }
  };

  useEffect(() => {
    let unsubscribeAll: () => void;

    const setupRealtime = (uid: string) => {
      const q = query(collection(db, 'applications'));
      unsubscribeAll = onSnapshot(q, (snapshot) => {
        const appliedMap: Record<string, Application> = {};
        const driversMap: Record<string, Application> = {};
        const passengersArr: Application[] = [];
        
        snapshot.forEach((docSnap) => {
          const data = { ...docSnap.data(), id: docSnap.id } as Application;
          if (data.userId === uid) appliedMap[data.eventId] = data;
          if (data.role === 'driver') driversMap[data.id] = data;
          if (data.carIdTo?.endsWith(uid) || data.carIdFrom?.endsWith(uid)) passengersArr.push(data);
        });

        snapshot.docChanges().forEach((change) => {
          const data = { ...change.doc.data(), id: change.doc.id } as Application;
          const prevData = prevAppsRef.current[data.id];
          
          if (change.type === 'modified' && prevData) {
            if (data.userId === uid && data.role === 'rider') {
              if ((!prevData.carIdTo && data.carIdTo) || (!prevData.carIdFrom && data.carIdFrom)) showLocalNotification(t.assignedTitle, t.assignedBody);
            }
            if (data.role === 'driver') {
              const myApp = appliedMap[data.eventId];
              if (myApp) {
                if (myApp.carIdTo === data.id && prevData.statusTo !== data.statusTo && data.statusTo) showLocalNotification(t.alertTitle, data.statusTo);
                if (myApp.carIdFrom === data.id && prevData.statusFrom !== data.statusFrom && data.statusFrom) showLocalNotification(t.alertTitle, data.statusFrom);
              }
            }
          }
          prevAppsRef.current[data.id] = data;
        });

        setUserApplications(appliedMap);
        setDriverDetails(driversMap);
        setMyPassengers(passengersArr);
      });
    };

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchUserProfile(currentUser.uid);
        await fetchEvents();
        setupRealtime(currentUser.uid);
      } else {
        setProfile(null); setUserApplications({}); setDriverDetails({}); setMyPassengers([]); setLoading(false);
        if (unsubscribeAll) unsubscribeAll();
      }
    });
    return () => { unsubscribeAuth(); };
  }, [lang]);

  const togglePushNotification = async () => {
    if (!user || !profile) return;
    if (profile.fcmToken) {
      if (confirm(t.disablePushConfirm)) {
        try {
          await updateDoc(doc(db, 'users', user.uid), { fcmToken: '' });
          setProfile({ ...profile, fcmToken: '' });
        } catch (error) { console.error(error); }
      }
      return;
    }
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert(lang === 'ko' ? '아이폰은 화면 하단 공유 버튼을 눌러 [홈 화면에 추가]를 해야 푸시 알림을 켤 수 있습니다.' : 'Please add this app to your Home Screen to enable push notifications.');
      return;
    }
    if (!messaging) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, { vapidKey: 'BJk6feu2WhkttIgPvgw977NbtMd_1RfEfMFqpYECAZgSxeeqSVmGRXnkYDABCXFMWcN9-fEnGUXStxjSX_QOvcU' });
        if (token) {
          await updateDoc(doc(db, 'users', user.uid), { fcmToken: token });
          setProfile({ ...profile, fcmToken: token });
        }
      } else alert(lang === 'ko' ? '알림 권한이 거부되었습니다. 기기 설정에서 알림을 허용해주세요.' : 'Notification permission denied.');
    } catch (error) { console.error(error); alert(lang === 'ko' ? '알림 설정 중 오류가 발생했습니다.' : 'Error setting up notifications.'); }
  };

  const fetchUserProfile = async (uid: string) => {
    try {
      const docSnap = await getDoc(doc(db, 'users', uid));
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        setFormData({ 
          name: data.name || '', phone: data.phone || '', address: data.address || '', 
          zone: data.zone || 'zone6', rideType: data.rideType || 'Need a Ride', capacity: data.capacity || '4', isVan: data.isVan || false,
          regFri: data.regFri || false, regSatPraise: data.regSatPraise || false, regSunPraise: data.regSunPraise || false, regSun: data.regSun || false
        });
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchEvents = async () => {
    try {
      const q = query(collection(db, 'events'), orderBy('date', 'asc'));
      const querySnapshot = await getDocs(q);
      setEvents(querySnapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id })) as ChurchEvent[]);
    } catch (error) { console.error(error); }
  };

  const fetchAllUsers = async () => {
    if (!profile?.isAdmin) return;
    try {
      const q = query(collection(db, 'users'));
      const querySnapshot = await getDocs(q);
      setAllUsersList(querySnapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id })) as (UserProfile & {id: string})[]);
    } catch (error) { console.error(error); }
  };

  // 정기 참석자 자동 신청 핵심 로직 (미래 이벤트들에 일괄 꽂아줌)
  const autoEnrollFutureEvents = async (uid: string, data: any, latestEvents: ChurchEvent[]) => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const futureEvents = latestEvents.filter(e => e.date >= todayStr);

    for (const ev of futureEvents) {
      let shouldApply = false;
      if ((ev.title.includes('금요') || ev.title.includes('Friday')) && data.regFri) shouldApply = true;
      if ((ev.title.includes('토요') || ev.title.includes('Saturday')) && data.regSatPraise) shouldApply = true;
      if ((ev.title.includes('12 PM') || ev.title.includes('Early')) && data.regSunPraise) shouldApply = true;
      if ((ev.title.includes('주일예배') || ev.title.includes('Sunday Worship')) && data.regSun) shouldApply = true;

      if (shouldApply) {
        const appRef = doc(db, 'applications', `${ev.id}_${uid}`);
        const appSnap = await getDoc(appRef);
        if (!appSnap.exists()) {
          await setDoc(appRef, {
            eventId: ev.id, userId: uid, name: data.name, phone: data.phone, address: data.address, zone: data.zone || 'zone6',
            rideType: data.rideType, capacity: data.capacity, role: data.rideType.includes('Drive') ? 'driver' : 'rider',
            carIdTo: null, carIdFrom: null, statusTo: '', statusFrom: '', isVan: data.isVan || false, appliedAt: serverTimestamp()
          });
        }
      }
    }
  };

  useEffect(() => {
    let unsubAdmin: () => void;
    if (adminSelectedEventId) {
      const q = query(collection(db, 'applications'), where('eventId', '==', adminSelectedEventId));
      unsubAdmin = onSnapshot(q, (snapshot) => {
        setEventAttendees(snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id })) as Application[]);
      });
      setSelectedRiderId(null);
    } else setEventAttendees([]);
    return () => { if (unsubAdmin) unsubAdmin(); };
  }, [adminSelectedEventId]);

  useEffect(() => { if (profile?.isAdmin && (currentTab === 'users' || currentTab === 'assign')) fetchAllUsers(); }, [currentTab, profile?.isAdmin]);

  const handleLogin = () => signInWithPopup(auth, googleProvider);
  const handleLogout = () => { signOut(auth); setProfile(null); setCurrentTab('calendar'); };
  const handleRefresh = () => window.location.reload();

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user) return; setSaving(true);
    try {
      const newProfile = { ...formData, isAdmin: profile?.isAdmin || false, fcmToken: profile?.fcmToken || '' };
      await setDoc(doc(db, 'users', user.uid), newProfile);
      setProfile(newProfile as UserProfile);
      setIsEditingProfile(false);
      
      // 최신 이벤트 목록 가져와서 정기참석 일괄 등록
      const evQ = query(collection(db, 'events'));
      const evSnap = await getDocs(evQ);
      const allEvs = evSnap.docs.map(d => ({id: d.id, ...d.data()})) as ChurchEvent[];
      await autoEnrollFutureEvents(user.uid, newProfile, allEvs);

      if (!profile) setCurrentTab('calendar');
    } finally { setSaving(false); }
  };

  const openEditProfile = () => {
    if (!profile) return;
    setFormData({ 
      name: profile.name, phone: profile.phone, address: profile.address, zone: profile.zone || 'zone6', 
      rideType: profile.rideType, capacity: profile.capacity || '4', isVan: profile.isVan || false,
      regFri: profile.regFri || false, regSatPraise: profile.regSatPraise || false, regSunPraise: profile.regSunPraise || false, regSun: profile.regSun || false
    });
    setIsEditingProfile(true);
  };

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.isAdmin) return;
    try {
      const docRef = await addDoc(collection(db, 'users'), { ...guestData, isAdmin: false, isGuest: true, fcmToken: '' });
      
      const evQ = query(collection(db, 'events'));
      const evSnap = await getDocs(evQ);
      const allEvs = evSnap.docs.map(d => ({id: d.id, ...d.data()})) as ChurchEvent[];
      await autoEnrollFutureEvents(docRef.id, guestData, allEvs);

      setIsAddingGuest(false);
      setGuestData({ name: '', phone: '', address: '', zone: 'zone6', rideType: 'Need a Ride', capacity: '4', isVan: false, regFri: false, regSatPraise: false, regSunPraise: false, regSun: false });
      fetchAllUsers();
      alert(lang === 'ko' ? '새 교인이 성공적으로 등록되었습니다.' : 'User added successfully.');
    } catch (error) { console.error(error); }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault(); setCreatingEvent(true);
    try {
      await addDoc(collection(db, 'events'), newEvent);
      setNewEvent({ title: '', date: '', destination: '', type: 'regular' });
      await fetchEvents();
      setCurrentTab('calendar');
    } finally { setCreatingEvent(false); }
  };

  const handleAutoGenerateEvents = async () => {
    if (!confirm(t.autoGenConfirm)) return;
    setCreatingEvent(true);
    try {
      const today = new Date();
      for (let i = 0; i <= 30; i++) {
        const targetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
        const day = targetDate.getDay();
        const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

        if (day === 5) {
          const exists = events.some(e => e.date === dateStr && (e.title.includes('금요') || e.title.includes('Friday')));
          if (!exists) {
            await addDoc(collection(db, 'events'), {
              title: '금요예배 / Friday Worship (6 PM)', date: dateStr, destination: 'MU 옆 서클 / MU Circle', type: 'regular', isLocked: false
            });
          }
        }
        
        if (day === 6) {
          const exists = events.some(e => e.date === dateStr && (e.title.includes('토요') || e.title.includes('Saturday')));
          if (!exists) {
            await addDoc(collection(db, 'events'), {
              title: '토요 찬양팀 연습 / Saturday Praise Team (6:30 PM)', date: dateStr, destination: '자택 순차 픽업 / Sequential Pickup', type: 'special', isLocked: false
            });
          }
        }

        if (day === 0) {
          const earlyExists = events.some(e => e.date === dateStr && (e.title.includes('12 PM') || e.title.includes('Early')));
          if (!earlyExists) {
            await addDoc(collection(db, 'events'), {
              title: '주일 찬양팀 (12 PM) / Praise Team Early', date: dateStr, destination: '자택 순차 픽업 / Sequential Pickup', type: 'special', isLocked: false
            });
          }
          const regularExists = events.some(e => e.date === dateStr && (e.title.includes('주일예배') || e.title.includes('Sunday Worship')));
          if (!regularExists) {
            await addDoc(collection(db, 'events'), {
              title: '주일예배 / Sunday Worship (1 PM)', date: dateStr, destination: '체이즌 뮤지엄 앞 / Chazen Museum', type: 'regular', isLocked: false
            });
          }
        }
      }
      
      // 방금 생성한 이벤트 다시 로드
      const evQ = query(collection(db, 'events'));
      const evSnap = await getDocs(evQ);
      const allEvs = evSnap.docs.map(d => ({id: d.id, ...d.data()})) as ChurchEvent[];
      
      // 정기참석 켜둔 모든 유저 불러와서 자동 배정
      const uQ = query(collection(db, 'users'));
      const uSnap = await getDocs(uQ);
      const allUs = uSnap.docs.map(d => ({id: d.id, ...d.data()})) as (UserProfile & {id: string})[];

      for (const u of allUs) {
        if (u.regFri || u.regSatPraise || u.regSunPraise || u.regSun) {
          await autoEnrollFutureEvents(u.id, u, allEvs);
        }
      }

      await fetchEvents();
      alert(t.autoGenDone);
      setCurrentTab('calendar');
    } catch (error) { console.error(error); } finally { setCreatingEvent(false); }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (confirm(t.confirmDeleteEvt)) {
      try {
        await deleteDoc(doc(db, 'events', eventId));
        const appQ = query(collection(db, 'applications'), where('eventId', '==', eventId));
        const appSnap = await getDocs(appQ);
        appSnap.forEach(d => deleteDoc(d.ref));
        setAdminSelectedEventId('');
        await fetchEvents();
      } catch (error) { console.error(error); }
    }
  };

  const handleToggleLock = async (eventId: string, currentLockStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'events', eventId), { isLocked: !currentLockStatus });
      await fetchEvents();
    } catch (error) { console.error(error); }
  };

  const openApplyModal = (event: ChurchEvent) => {
    if (!profile) return;
    setApplyData({ rideType: profile.rideType, capacity: profile.capacity || '4', isVan: profile.isVan || false });
    setApplyEvent(event);
  };

  const confirmApply = async () => {
    if (!user || !profile || !applyEvent) return;
    try {
      await setDoc(doc(db, 'applications', `${applyEvent.id}_${user.uid}`), {
        eventId: applyEvent.id, userId: user.uid, name: profile.name, phone: profile.phone, address: profile.address, zone: profile.zone || 'zone6',
        rideType: applyData.rideType, capacity: applyData.capacity, role: applyData.rideType.includes('Drive') ? 'driver' : 'rider',
        carIdTo: null, carIdFrom: null, statusTo: '', statusFrom: '', isVan: applyData.isVan, appliedAt: serverTimestamp()
      });
      setApplyEvent(null);
    } catch (error) { console.error(error); }
  };

  const handleProxyApply = async (guestUser: UserProfile & {id: string}) => {
    if (!adminSelectedEventId || !profile?.isAdmin) return;
    try {
      await setDoc(doc(db, 'applications', `${adminSelectedEventId}_${guestUser.id}`), {
        eventId: adminSelectedEventId, userId: guestUser.id, name: guestUser.name, phone: guestUser.phone, address: guestUser.address, zone: guestUser.zone || 'zone6',
        rideType: guestUser.rideType, capacity: guestUser.capacity, role: guestUser.rideType.includes('Drive') ? 'driver' : 'rider',
        carIdTo: null, carIdFrom: null, statusTo: '', statusFrom: '', isVan: guestUser.isVan || false, appliedAt: serverTimestamp()
      });
      setSearchQuery('');
      alert(`${guestUser.name}` + (lang === 'ko' ? '님이 대기 명단에 추가되었습니다.' : ' has been added to the waiting list.'));
    } catch (error) { console.error(error); }
  };

  const handleCancelApplication = async (eventId: string) => { if (user) await deleteDoc(doc(db, 'applications', `${eventId}_${user.uid}`)); };

  const updateVehicle = async (appId: string, isVan: boolean, capacity: string) => {
    try { await updateDoc(doc(db, 'applications', appId), { isVan, capacity }); } catch (error) { console.error(error); }
  };

  const adjustCapacity = async (appId: string, currentCap: string, delta: number) => {
    const newCap = Math.max(1, parseInt(currentCap || '4') + delta);
    try { await updateDoc(doc(db, 'applications', appId), { capacity: newCap.toString() }); } catch (error) { console.error(error); }
  };

  const sendPushToUser = async (targetUserId: string, title: string, body: string) => {
    try {
      const snap = await getDoc(doc(db, 'users', targetUserId));
      const token = snap.data()?.fcmToken;
      if (token) await fetch('/api/send-notification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, title, body }) });
    } catch (error) { console.error("Push failed", error); }
  };

  const updateStatus = async (userApp: Application, direction: 'to' | 'from', statusMsg: string, isCustomMsg = false) => {
    try {
      await updateDoc(doc(db, 'applications', userApp.id), { [direction === 'to' ? 'statusTo' : 'statusFrom']: statusMsg });
      const title = isCustomMsg ? t.newMsg : t.alertTitle;
      const body = `${userApp.name}: ${statusMsg}`;
      
      if (userApp.role === 'driver') {
        const passengers = eventAttendees.filter(a => direction === 'to' ? a.carIdTo === userApp.id : a.carIdFrom === userApp.id);
        for (const p of passengers) await sendPushToUser(p.userId, title, body);
      } else {
        const driverAppId = direction === 'to' ? userApp.carIdTo : userApp.carIdFrom;
        const driverApp = eventAttendees.find(a => a.id === driverAppId);
        if (driverApp) await sendPushToUser(driverApp.userId, title, body);
      }
      alert(isCustomMsg ? t.msgSent : t.statusUpdated);
    } catch (error) { console.error(error); }
  };

  const handleSendCustomMsg = (userApp: Application, direction: 'to' | 'from') => {
    const key = `${userApp.id}_${direction}`;
    const msg = customMsg[key];
    if (msg && msg.trim() !== '') {
      updateStatus(userApp, direction, msg, true);
      setCustomMsg(prev => ({ ...prev, [key]: '' }));
    }
  };

  const handleAssignToCar = async (carId: string, capacityStr?: string) => {
    if (!selectedRiderId) return;
    if (carId && capacityStr) {
      const limit = parseInt(capacityStr) || 4;
      if (eventAttendees.filter(a => rideDirection === 'to' ? a.carIdTo === carId : a.carIdFrom === carId).length >= limit) {
        alert(t.full); return;
      }
    }
    await updateDoc(doc(db, 'applications', selectedRiderId), { [rideDirection === 'to' ? 'carIdTo' : 'carIdFrom']: carId });
    const pSnap = await getDoc(doc(db, 'applications', selectedRiderId));
    const pUserId = pSnap.data()?.userId;
    if (pUserId) await sendPushToUser(pUserId, t.assignedTitle, t.assignedBody);
    setSelectedRiderId(null); 
  };

  const handleRemoveFromCar = async (passengerId: string) => {
    await updateDoc(doc(db, 'applications', passengerId), { [rideDirection === 'to' ? 'carIdTo' : 'carIdFrom']: null });
  };

  const openNavigation = (driverAppId: string) => {
    const passengers = eventAttendees.filter(a => rideDirection === 'to' ? a.carIdTo === driverAppId : a.carIdFrom === driverAppId);
    if (passengers.length === 0) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(passengers[0].address)}&waypoints=${passengers.slice(1).map(p => encodeURIComponent(p.address)).join('|')}&destination=Livingstone+Church`;
    window.open(url, '_blank');
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>{t.loading}</div>;

  const year = currentDate.getFullYear(); const month = currentDate.getMonth();
  const blanks = Array.from({ length: new Date(year, month, 1).getDay() }, (_, i) => i);
  const days = Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => i + 1);
  const monthNames = lang === 'ko' ? ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"] : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  
  const drivers = eventAttendees.filter(a => a.role === 'driver');
  const riders = eventAttendees.filter(a => a.role === 'rider');
  const unassignedRiders = riders.filter(r => rideDirection === 'to' ? r.carIdTo === null : r.carIdFrom === null);
  
  const sortedUnassignedRiders = [...unassignedRiders].sort((a, b) => {
    if (sortByAddress) {
      const zA = a.zone || 'zone6';
      const zB = b.zone || 'zone6';
      if (zA !== zB) return zA.localeCompare(zB);
      return (a.address || '').localeCompare(b.address || '');
    }
    return (a.name || '').localeCompare(b.name || '');
  });

  const hasPushEnabled = !!profile?.fcmToken;
  const totalRiders = riders.length;
  const totalSeats = drivers.reduce((sum, d) => sum + parseInt(d.capacity || '4'), 0);
  const availableSeats = totalSeats - totalRiders;
  const currentAdminEvent = events.find(e => e.id === adminSelectedEventId);

  return (
    <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto', background: '#f4f4f5', minHeight: '100vh', paddingBottom: '80px', fontFamily: 'sans-serif' }}>
      
      <header style={{ background: '#ffffff', padding: '15px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e4e4e7' }}>
        <h1 style={{ margin: 0, fontSize: '18px', color: '#18181b', fontWeight: 'bold' }}>{t.appTitle}</h1>
        <div style={{ display: 'flex', gap: '5px' }}>
          {user && profile && !isEditingProfile && (
            <>
              <button onClick={() => setCurrentTab('profile')} style={{ padding: '6px 8px', background: '#e4e4e7', borderRadius: '6px', border: 'none', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>{t.navProf}</button>
              <button onClick={() => setCurrentTab('guide')} style={{ padding: '6px 8px', background: '#e4e4e7', borderRadius: '6px', border: 'none', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>{t.navGuide}</button>
            </>
          )}
          <button onClick={handleRefresh} disabled={isRefreshing} style={{ padding: '6px 8px', background: '#e4e4e7', borderRadius: '6px', border: 'none', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', opacity: isRefreshing ? 0.5 : 1 }}>↻</button>
          <button onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')} style={{ padding: '6px 8px', background: '#e4e4e7', borderRadius: '6px', border: 'none', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>{lang === 'ko' ? 'EN' : 'KR'}</button>
        </div>
      </header>

      <main style={{ padding: '20px' }}>
        {!user ? (
          <div style={{ background: '#ffffff', padding: '30px', borderRadius: '12px', textAlign: 'center' }}>
            <p style={{ marginBottom: '20px' }}>{t.loginReq}</p>
            <button onClick={handleLogin} style={{ width: '100%', padding: '14px', background: '#3b82f6', color: 'white', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>{t.loginBtn}</button>
          </div>
        ) : !profile || isEditingProfile ? (
          // ==================== PROFILE CREATION / EDITING ====================
          <div style={{ background: '#ffffff', padding: '25px', borderRadius: '12px' }}>
            <h2 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>{isEditingProfile ? t.editProfile : t.createProfile}</h2>
            <form onSubmit={handleSaveProfile}>
              <div style={{ marginBottom: '15px' }}><label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>{t.name}</label><input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>
              <div style={{ marginBottom: '15px' }}><label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>{t.phone}</label><input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>{t.zoneL}</label>
                <select value={formData.zone} onChange={e => setFormData({...formData, zone: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px', background: '#f8fafc' }}>
                  <option value="zone1">{t.zone1}</option><option value="zone2">{t.zone2}</option><option value="zone3">{t.zone3}</option>
                  <option value="zone4">{t.zone4}</option><option value="zone5">{t.zone5}</option><option value="zone6">{t.zone6}</option>
                </select>
              </div>
              <div style={{ marginBottom: '15px' }}><label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>{t.address}</label><input required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Room 101, 123 Main St" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>{t.rideType}</label>
                <select value={formData.rideType} onChange={e => setFormData({...formData, rideType: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
                  <option value="Need a Ride">{t.needRide}</option><option value="Can Drive">{t.canDrive}</option><option value="Drive Self">{t.driveSelf}</option>
                </select>
              </div>
              {formData.rideType === 'Can Drive' && (
                <>
                  <div style={{ marginBottom: '15px' }}><label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>{t.capacity}</label><input type="number" value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>
                  <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
                    <input type="checkbox" id="isVan" checked={formData.isVan} onChange={e => setFormData({...formData, isVan: e.target.checked})} />
                    <label htmlFor="isVan" style={{ fontSize: '13px', fontWeight: 'bold' }}>{t.van}</label>
                  </div>
                </>
              )}
              
              {/* 정기 참석 옵션 */}
              <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #bbf7d0' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', color: '#166534' }}>{t.regLabel}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}><input type="checkbox" checked={formData.regFri} onChange={e => setFormData({...formData, regFri: e.target.checked})} /> {t.regFri}</label>
                  <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}><input type="checkbox" checked={formData.regSun} onChange={e => setFormData({...formData, regSun: e.target.checked})} /> {t.regSun}</label>
                  <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}><input type="checkbox" checked={formData.regSatPraise} onChange={e => setFormData({...formData, regSatPraise: e.target.checked})} /> {t.regSatPraise}</label>
                  <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}><input type="checkbox" checked={formData.regSunPraise} onChange={e => setFormData({...formData, regSunPraise: e.target.checked})} /> {t.regSunPraise}</label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '14px', background: '#18181b', color: 'white', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>{saving ? t.saving : t.save}</button>
                {isEditingProfile && (
                  <button type="button" onClick={() => setIsEditingProfile(false)} style={{ flex: 1, padding: '14px', background: '#f4f4f5', color: '#ef4444', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>{t.cancelEdit}</button>
                )}
              </div>
            </form>
          </div>
        ) : (
          <>
            {/* -------------------- 1. CALENDAR TAB -------------------- */}
            {currentTab === 'calendar' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: '#fff', padding: '15px', borderRadius: '16px' }}>
                  <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>{t.prev}</button>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{year} {monthNames[month]}</h2>
                  <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>{t.next}</button>
                </div>
                
                <div style={{ background: '#fff', padding: '20px', borderRadius: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
                    {weekDays.map((wd, index) => (
                      <div key={wd} style={{ textAlign: 'center', fontSize: '12px', fontWeight: 'bold', color: index === 0 ? '#ef4444' : index === 6 ? '#3b82f6' : '#64748b', marginBottom: '10px' }}>{wd}</div>
                    ))}
                    {blanks.map(b => <div key={`blank-${b}`} />)}
                    {days.map(day => {
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const hasEvent = events.some(e => e.date === dateStr);
                      const dayOfWeek = new Date(year, month, day).getDay();
                      const textColor = selectedDate === dateStr ? '#fff' : (dayOfWeek === 0 ? '#ef4444' : dayOfWeek === 6 ? '#3b82f6' : '#18181b');
                      
                      return (
                        <div key={day} onClick={() => setSelectedDate(dateStr)} style={{ height: '45px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: '8px', background: selectedDate === dateStr ? '#18181b' : hasEvent ? '#f3f4f6' : 'transparent', color: textColor, fontWeight: hasEvent ? 'bold' : 'normal' }}>
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
                          {event.isLocked && <span style={{ fontSize: '11px', background: '#fef3c7', color: '#d97706', padding: '5px 10px', borderRadius: '12px', fontWeight: 'bold', marginLeft: '5px' }}>{t.evtLocked}</span>}
                          
                          <h4 style={{ margin: '12px 0', fontSize: '18px' }}>{event.title}</h4>
                          
                          {/* 운전자 화면 */}
                          {userApp?.role === 'driver' && (
                            <div style={{ marginBottom: '15px', background: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{t.vehicleType}:</span>
                                <select value={userApp.isVan ? 'van' : 'car'} onChange={(e) => updateVehicle(userApp.id, e.target.value === 'van', e.target.value === 'van' ? '15' : profile.capacity)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px' }}>
                                  <option value="car">{t.personalCar} ({profile.capacity}{t.seats})</option>
                                  <option value="van">{t.churchVan}</option>
                                </select>
                              </div>
                              <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px dashed #cbd5e1' }}>
                                <h5 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#2563eb' }}>{t.toEvt}</h5>
                                {myPassengers.filter(p => p.eventId === event.id && p.carIdTo === userApp.id).map(p => (
                                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#fff', borderRadius: '6px', marginBottom: '5px', border: '1px solid #e2e8f0' }}>
                                    <div><span style={{ fontSize: '13px', fontWeight: 'bold' }}>{p.name}</span> {p.statusTo && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold', marginLeft: '5px' }}>({displayStatus(p.statusTo)})</span>}</div>
                                    <a href={`tel:${p.phone}`} style={{ fontSize: '12px', color: '#2563eb', fontWeight: 'bold', textDecoration: 'none' }}>{t.call}</a>
                                  </div>
                                ))}
                                {myPassengers.filter(p => p.eventId === event.id && p.carIdTo === userApp.id).length === 0 && <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>{t.noPass}</p>}
                                <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                                  <button onClick={() => updateStatus(userApp, 'to', 'Departed')} style={{ flex: 1, padding: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>{t.departed}</button>
                                  <button onClick={() => updateStatus(userApp, 'to', 'Arrived')} style={{ flex: 1, padding: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>{t.arrived}</button>
                                </div>
                                <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                  <input type="text" placeholder={t.msgPlaceholder} value={customMsg[`${userApp.id}_to`] || ''} onChange={e => setCustomMsg({...customMsg, [`${userApp.id}_to`]: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px' }} />
                                  <button onClick={() => handleSendCustomMsg(userApp, 'to')} style={{ padding: '8px 15px', background: '#18181b', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>{t.sendBtn}</button>
                                </div>
                              </div>
                              <div>
                                <h5 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#059669' }}>{t.fromEvt}</h5>
                                {myPassengers.filter(p => p.eventId === event.id && p.carIdFrom === userApp.id).map(p => (
                                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#fff', borderRadius: '6px', marginBottom: '5px', border: '1px solid #e2e8f0' }}>
                                    <div><span style={{ fontSize: '13px', fontWeight: 'bold' }}>{p.name}</span> {p.statusFrom && <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold', marginLeft: '5px' }}>({displayStatus(p.statusFrom)})</span>}</div>
                                    <a href={`tel:${p.phone}`} style={{ fontSize: '12px', color: '#2563eb', fontWeight: 'bold', textDecoration: 'none' }}>{t.call}</a>
                                  </div>
                                ))}
                                {myPassengers.filter(p => p.eventId === event.id && p.carIdFrom === userApp.id).length === 0 && <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>{t.noPass}</p>}
                                <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                                  <button onClick={() => updateStatus(userApp, 'from', 'Departed')} style={{ flex: 1, padding: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>{t.departed}</button>
                                  <button onClick={() => updateStatus(userApp, 'from', 'Arrived')} style={{ flex: 1, padding: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>{t.arrived}</button>
                                </div>
                                <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                  <input type="text" placeholder={t.msgPlaceholder} value={customMsg[`${userApp.id}_from`] || ''} onChange={e => setCustomMsg({...customMsg, [`${userApp.id}_from`]: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px' }} />
                                  <button onClick={() => handleSendCustomMsg(userApp, 'from')} style={{ padding: '8px 15px', background: '#18181b', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>{t.sendBtn}</button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 탑승자 화면 */}
                          {userApp?.role === 'rider' && (
                            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                              <h5 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>{t.myAssignment}</h5>
                              {!userApp.carIdTo && !userApp.carIdFrom && ( <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>{t.noPass}</p> )}

                              {userApp.carIdTo && (
                                <div style={{ marginBottom: userApp.carIdFrom ? '15px' : '0', paddingBottom: userApp.carIdFrom ? '15px' : '0', borderBottom: userApp.carIdFrom ? '1px dashed #cbd5e1' : 'none' }}>
                                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#2563eb' }}>{t.toEvt} ({t.driverTxt}: {driverDetails[userApp.carIdTo]?.name || '...'})</span>
                                  {driverDetails[userApp.carIdTo]?.statusTo && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', margin: '5px 0' }}>{t.statusTxt}: {displayStatus(driverDetails[userApp.carIdTo].statusTo)}</div>}
                                  <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                    <button onClick={() => updateStatus(userApp, 'to', 'Waiting at pickup area')} style={{ flex: 1, padding: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>{t.waitPickup}</button>
                                  </div>
                                  <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                    <input type="text" placeholder={t.msgPlaceholder} value={customMsg[`${userApp.id}_to`] || ''} onChange={e => setCustomMsg({...customMsg, [`${userApp.id}_to`]: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px' }} />
                                    <button onClick={() => handleSendCustomMsg(userApp, 'to')} style={{ padding: '8px 15px', background: '#18181b', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>{t.sendBtn}</button>
                                  </div>
                                </div>
                              )}

                              {userApp.carIdFrom && (
                                <div>
                                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#059669' }}>{t.fromEvt} ({t.driverTxt}: {driverDetails[userApp.carIdFrom]?.name || '...'})</span>
                                  {driverDetails[userApp.carIdFrom]?.statusFrom && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', margin: '5px 0' }}>{t.statusTxt}: {displayStatus(driverDetails[userApp.carIdFrom].statusFrom)}</div>}
                                  <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                    <button onClick={() => updateStatus(userApp, 'from', 'Waiting at pickup area')} style={{ flex: 1, padding: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>{t.waitPickup}</button>
                                  </div>
                                  <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                    <input type="text" placeholder={t.msgPlaceholder} value={customMsg[`${userApp.id}_from`] || ''} onChange={e => setCustomMsg({...customMsg, [`${userApp.id}_from`]: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px' }} />
                                    <button onClick={() => handleSendCustomMsg(userApp, 'from')} style={{ padding: '8px 15px', background: '#18181b', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>{t.sendBtn}</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {event.isLocked ? (
                            <div style={{ width: '100%', padding: '12px', background: '#f1f5f9', color: '#64748b', textAlign: 'center', borderRadius: '8px', fontWeight: 'bold' }}>{t.evtLocked}</div>
                          ) : (
                            <div style={{ display: 'flex', gap: '10px' }}>
                              {!userApp ? (
                                <button onClick={() => openApplyModal(event)} style={{ flex: 1, padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{t.applyBtn}</button>
                              ) : (
                                <>
                                  <div style={{ flex: 1, padding: '12px', background: '#10b981', color: '#fff', textAlign: 'center', borderRadius: '8px', fontWeight: 'bold' }}>{t.appliedBtn}</div>
                                  <button onClick={() => handleCancelApplication(event.id)} style={{ flex: 1, padding: '12px', background: '#f4f4f5', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{t.cancelBtn}</button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {events.filter(e => e.date === selectedDate).length === 0 && <div style={{ padding: '30px', textAlign: 'center', color: '#a1a1aa' }}>{t.noEvent}</div>}
                  </div>
                )}
              </div>
            )}

            {/* -------------------- 2. CREATE EVENT TAB -------------------- */}
            {currentTab === 'create' && canManage && (
              <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px' }}>
                <h2 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>{t.adminNew}</h2>
                <form onSubmit={handleCreateEvent}>
                  <div style={{ marginBottom: '15px' }}><label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>{t.titleL}</label><input required value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>
                  <div style={{ marginBottom: '15px' }}><label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>{t.dateL}</label><input required type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>
                  <div style={{ marginBottom: '15px' }}><label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>{t.destL}</label><input required value={newEvent.destination} onChange={e => setNewEvent({...newEvent, destination: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>
                  <button type="submit" style={{ width: '100%', padding: '12px', background: '#3b82f6', color: 'white', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>{creatingEvent ? t.creatingBtn : t.createBtn}</button>
                </form>
                <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #e4e4e7' }} />
                <button onClick={handleAutoGenerateEvents} disabled={creatingEvent} style={{ width: '100%', padding: '12px', background: '#10b981', color: 'white', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>{creatingEvent ? t.creatingBtn : t.autoGenBtn}</button>
              </div>
            )}

            {/* -------------------- 3. ASSIGN TAB -------------------- */}
            {currentTab === 'assign' && canManage && (
              <div>
                <h2 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>{t.adminAssign}</h2>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                  <select value={adminSelectedEventId} onChange={e => setAdminSelectedEventId(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc', minWidth: '0' }}>
                    <option value="">{t.selectEvt}</option>
                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.date} - {ev.title}</option>)}
                  </select>
                  {currentAdminEvent && (
                    <button onClick={() => handleToggleLock(currentAdminEvent.id, !!currentAdminEvent.isLocked)} style={{ padding: '0 15px', background: currentAdminEvent.isLocked ? '#f59e0b' : '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {currentAdminEvent.isLocked ? t.unlockEvt : t.lockEvt}
                    </button>
                  )}
                  {adminSelectedEventId && (
                    <button onClick={() => handleDeleteEvent(adminSelectedEventId)} style={{ padding: '0 15px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {t.deleteEvt}
                    </button>
                  )}
                </div>

                {adminSelectedEventId && (
                  <>
                    {profile.isAdmin && (
                      <div style={{ marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#334155' }}>[+] {t.proxyApplyTitle}</h4>
                        <input type="text" placeholder={t.searchPlaceholder} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px' }} />
                        {searchQuery && (
                          <div style={{ marginTop: '5px', maxHeight: '150px', overflowY: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                            {allUsersList.filter(u => u.name.includes(searchQuery)).map(u => (
                              <div key={u.id} onClick={() => handleProxyApply(u)} style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span><strong>{u.name}</strong> <span style={{fontSize: '11px', color: '#64748b'}}>({(t[u.zone || 'zone6'] || '').split(' ')[0]})</span></span>
                                <span style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '11px', background: '#dbeafe', padding: '4px 8px', borderRadius: '4px' }}>{t.addBtn}</span>
                              </div>
                            ))}
                            {allUsersList.filter(u => u.name.includes(searchQuery)).length === 0 && <div style={{ padding: '10px', fontSize: '13px', color: '#94a3b8' }}>{t.noResult}</div>}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ padding: '15px', background: availableSeats >= 0 ? '#ecfdf5' : '#fef2f2', borderRadius: '8px', marginBottom: '20px', border: `1px solid ${availableSeats >= 0 ? '#10b981' : '#ef4444'}`, display: 'flex', justifyContent: 'space-around', fontWeight: 'bold', fontSize: '13px' }}>
                      <div style={{ textAlign: 'center' }}><span style={{ display: 'block', color: '#64748b', fontSize: '11px', marginBottom: '2px' }}>{t.statsTxt}</span>{totalRiders}</div>
                      <div style={{ textAlign: 'center' }}><span style={{ display: 'block', color: '#64748b', fontSize: '11px', marginBottom: '2px' }}>{t.statsSeats}</span>{totalSeats}</div>
                      <div style={{ textAlign: 'center', color: availableSeats >= 0 ? '#059669' : '#dc2626' }}><span style={{ display: 'block', fontSize: '11px', marginBottom: '2px' }}>{availableSeats >= 0 ? t.statsAvail : t.statsShort}</span>{Math.abs(availableSeats)}</div>
                    </div>

                    <div style={{ display: 'flex', background: '#e4e4e7', padding: '4px', borderRadius: '10px', marginBottom: '20px' }}>
                      <button onClick={() => setRideDirection('to')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: rideDirection === 'to' ? '#fff' : 'transparent', fontWeight: 'bold', cursor: 'pointer' }}>{t.toEvt}</button>
                      <button onClick={() => setRideDirection('from')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: rideDirection === 'from' ? '#fff' : 'transparent', fontWeight: 'bold', cursor: 'pointer' }}>{t.fromEvt}</button>
                    </div>

                    <div style={{ background: '#dbeafe', color: '#1e3a8a', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', marginBottom: '15px', textAlign: 'center' }}>
                      {t.selectToAssign}
                    </div>

                    <div style={{ background: '#fff', padding: '15px', borderRadius: '12px', border: '1px solid #e4e4e7', marginBottom: '20px', minHeight: '100px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h4 style={{ margin: 0 }}>{t.waitList} ({unassignedRiders.length})</h4>
                        <button onClick={() => setSortByAddress(!sortByAddress)} style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 'bold', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}>
                          {sortByAddress ? t.sortByName : t.sortByAddr}
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {sortedUnassignedRiders.map(r => {
                          const zColor = zoneColors[r.zone || 'zone6'];
                          const zNameShort = (t[r.zone || 'zone6'] || '').split(' (')[0];
                          const isSelected = selectedRiderId === r.id;
                          return (
                            <div key={r.id} onClick={() => setSelectedRiderId(isSelected ? null : r.id)} style={{ padding: '8px 12px', background: isSelected ? '#eff6ff' : '#f8fafc', border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1', borderLeft: isSelected ? '5px solid #2563eb' : `5px solid ${zColor}`, borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center', transform: isSelected ? 'scale(1.05)' : 'scale(1)', transition: 'all 0.1s' }}>
                              <div style={{ fontSize: '10px', color: isSelected ? '#2563eb' : zColor, marginBottom: '2px' }}>{zNameShort}</div>
                              <div>{r.name}</div>
                              {sortByAddress && <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'normal', marginTop: '4px', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.address}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <h4 style={{ margin: 0 }}>{t.cars}</h4>
                      {drivers.map(driver => {
                        const passengers = riders.filter(r => rideDirection === 'to' ? r.carIdTo === driver.id : r.carIdFrom === driver.id);
                        const isFull = passengers.length >= parseInt(driver.capacity || '4');
                        return (
                          <div key={driver.id} onClick={() => handleAssignToCar(driver.id, driver.capacity)} style={{ background: isFull ? '#fff1f2' : (selectedRiderId ? '#ecfdf5' : '#fff'), padding: '15px', borderRadius: '12px', border: isFull ? '2px solid #fecaca' : (selectedRiderId ? '2px dashed #10b981' : '1px solid #e4e4e7'), position: 'relative', cursor: selectedRiderId ? 'pointer' : 'default' }}>
                            {isFull && <div style={{ position: 'absolute', right: '-25px', top: '15px', background: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '4px 30px', transform: 'rotate(45deg)' }}>{t.full}</div>}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <div style={{ fontWeight: 'bold' }}>{driver.isVan ? <span style={{ color: '#2563eb' }}>[Van] </span> : 'Car: '}{driver.name}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <button onClick={(e) => { e.stopPropagation(); openNavigation(driver.id); }} style={{ padding: '6px 10px', background: '#18181b', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>{t.mapNav}</button>
                                <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                                  <button onClick={(e) => { e.stopPropagation(); adjustCapacity(driver.id, driver.capacity, -1); }} style={{ padding: '4px 8px', border: 'none', background: '#e2e8f0', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                                  <span style={{ padding: '0 8px', fontSize: '12px', fontWeight: 'bold' }}>{driver.capacity}</span>
                                  <button onClick={(e) => { e.stopPropagation(); adjustCapacity(driver.id, driver.capacity, 1); }} style={{ padding: '4px 8px', border: 'none', background: '#e2e8f0', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                                </div>
                                <span style={{ color: isFull ? '#ef4444' : '#166534', fontWeight: 'bold', fontSize: '13px' }}>{passengers.length} / {driver.capacity}</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '40px', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                              {passengers.map(p => {
                                const zColor = zoneColors[p.zone || 'zone6'];
                                return (
                                  <div key={p.id} onClick={(e) => { e.stopPropagation(); handleRemoveFromCar(p.id); }} style={{ padding: '6px 12px', background: zColor, color: '#fff', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                                    {p.name} ✕
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ background: '#ffffff', padding: '15px', borderRadius: '12px', marginTop: '30px', overflowX: 'auto', border: '1px solid #e4e4e7' }}>
                      <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>{t.dailyRoster} ({eventAttendees.length})</h3>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '400px' }}>
                        <thead>
                          <tr style={{ background: '#f4f4f5', borderBottom: '2px solid #e4e4e7' }}>
                            <th style={{ padding: '10px', textAlign: 'left' }}>{t.name}</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>{t.rideType}</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>Zone</th>
                            <th style={{ padding: '10px', textAlign: 'left' }}>{t.phone}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {eventAttendees.map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid #e4e4e7' }}>
                              <td style={{ padding: '10px', fontWeight: 'bold' }}>{u.name}</td>
                              <td style={{ padding: '10px', color: u.role === 'driver' ? '#2563eb' : '#64748b', fontWeight: 'bold' }}>{u.rideType}</td>
                              <td style={{ padding: '10px', color: zoneColors[u.zone || 'zone6'], fontWeight: 'bold' }}>{(t[u.zone || 'zone6'] || '').split(' ')[0]}</td>
                              <td style={{ padding: '10px' }}><a href={`tel:${u.phone}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{u.phone}</a></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* -------------------- 4. USERS TAB -------------------- */}
            {currentTab === 'users' && profile.isAdmin && (
              <div style={{ background: '#ffffff', padding: '15px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>{t.adminUsers} ({allUsersList.length})</h3>
                  <button onClick={() => setIsAddingGuest(!isAddingGuest)} style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                    {isAddingGuest ? t.cancelBtn : '[+] ' + t.addGuestBtn}
                  </button>
                </div>

                {isAddingGuest && (
                  <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                    <form onSubmit={handleAddGuest}>
                      <div style={{ marginBottom: '10px' }}><label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '3px' }}>{t.name}</label><input required value={guestData.name} onChange={e => setGuestData({...guestData, name: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }} /></div>
                      <div style={{ marginBottom: '10px' }}><label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '3px' }}>{t.phone}</label><input required type="tel" value={guestData.phone} onChange={e => setGuestData({...guestData, phone: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }} /></div>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '3px' }}>{t.zoneL}</label>
                        <select value={guestData.zone} onChange={e => setGuestData({...guestData, zone: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}>
                          <option value="zone1">{t.zone1}</option><option value="zone2">{t.zone2}</option><option value="zone3">{t.zone3}</option>
                          <option value="zone4">{t.zone4}</option><option value="zone5">{t.zone5}</option><option value="zone6">{t.zone6}</option>
                        </select>
                      </div>
                      <div style={{ marginBottom: '10px' }}><label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '3px' }}>{t.address}</label><input required value={guestData.address} onChange={e => setGuestData({...guestData, address: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }} /></div>
                      <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '3px' }}>{t.rideType}</label>
                        <select value={guestData.rideType} onChange={e => setGuestData({...guestData, rideType: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}>
                          <option value="Need a Ride">{t.needRide}</option><option value="Can Drive">{t.canDrive}</option><option value="Drive Self">{t.driveSelf}</option>
                        </select>
                      </div>
                      <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '6px', marginBottom: '15px', border: '1px solid #bbf7d0' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#166534' }}>{t.regLabel}</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}><input type="checkbox" checked={guestData.regFri} onChange={e => setGuestData({...guestData, regFri: e.target.checked})} /> {t.regFri}</label>
                          <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}><input type="checkbox" checked={guestData.regSun} onChange={e => setGuestData({...guestData, regSun: e.target.checked})} /> {t.regSun}</label>
                          <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}><input type="checkbox" checked={guestData.regSatPraise} onChange={e => setGuestData({...guestData, regSatPraise: e.target.checked})} /> {t.regSatPraise}</label>
                          <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}><input type="checkbox" checked={guestData.regSunPraise} onChange={e => setGuestData({...guestData, regSunPraise: e.target.checked})} /> {t.regSunPraise}</label>
                        </div>
                      </div>
                      <button type="submit" style={{ width: '100%', padding: '10px', background: '#18181b', color: 'white', borderRadius: '6px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>{t.addBtn}</button>
                    </form>
                  </div>
                )}

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '400px' }}>
                    <thead>
                      <tr style={{ background: '#f4f4f5', borderBottom: '2px solid #e4e4e7' }}>
                        <th style={{ padding: '10px', textAlign: 'left' }}>{t.name}</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Zone</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>{t.phone}</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>{t.rideType}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsersList.map(u => (
                        <tr key={u.id} style={{ borderBottom: '1px solid #e4e4e7' }}>
                          <td style={{ padding: '10px', fontWeight: 'bold' }}>{u.name} {u.isGuest && <span style={{ color: '#059669', fontSize: '10px', marginLeft: '4px' }}>(Guest)</span>} {u.isAdmin && <span style={{ color: '#ef4444', fontSize: '10px', marginLeft: '4px' }}>(Admin)</span>}</td>
                          <td style={{ padding: '10px', color: zoneColors[u.zone || 'zone6'], fontWeight: 'bold' }}>{(t[u.zone || 'zone6'] || '').split(' ')[0]}</td>
                          <td style={{ padding: '10px' }}><a href={`tel:${u.phone}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{u.phone}</a></td>
                          <td style={{ padding: '10px' }}>{u.rideType}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* -------------------- PROFILE TAB -------------------- */}
            {currentTab === 'profile' && (
              <div style={{ background: '#ffffff', padding: '25px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0, fontSize: '18px' }}>{t.myProfile}</h2>
                  <button onClick={openEditProfile} style={{ padding: '6px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>{t.editProfile}</button>
                </div>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}><strong>{t.name}:</strong> {profile.name}</p>
                  <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}><strong>{t.phone}:</strong> {profile.phone}</p>
                  <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}><strong>{t.zoneL}:</strong> {t[profile.zone || 'zone6']}</p>
                  <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}><strong>{t.address}:</strong> {profile.address}</p>
                  <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}><strong>{t.rideType}:</strong> {profile.rideType}</p>
                  
                  <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e2e8f0' }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 'bold', color: '#166534' }}>{t.regLabel}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                      <span style={{ color: profile.regFri ? '#2563eb' : '#94a3b8' }}>{profile.regFri ? '✓' : '✗'} {t.regFri}</span>
                      <span style={{ color: profile.regSun ? '#2563eb' : '#94a3b8' }}>{profile.regSun ? '✓' : '✗'} {t.regSun}</span>
                      <span style={{ color: profile.regSatPraise ? '#2563eb' : '#94a3b8' }}>{profile.regSatPraise ? '✓' : '✗'} {t.regSatPraise}</span>
                      <span style={{ color: profile.regSunPraise ? '#2563eb' : '#94a3b8' }}>{profile.regSunPraise ? '✓' : '✗'} {t.regSunPraise}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e2e8f0' }}>
                    <button onClick={togglePushNotification} style={{ width: '100%', padding: '10px', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', background: hasPushEnabled ? '#10b981' : '#0284c7' }}>
                      {hasPushEnabled ? t.pushEnabled : t.pushDisabled}
                    </button>
                  </div>
                </div>
                <button onClick={handleLogout} style={{ width: '100%', padding: '12px', background: '#f4f4f5', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{t.signOut}</button>
              </div>
            )}
            
            {/* -------------------- GUIDE TAB -------------------- */}
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
            
            {/* -------------------- 맞춤 신청 팝업 -------------------- */}
            {applyEvent && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                <div style={{ background: '#fff', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '350px' }}>
                  <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>{applyEvent.title} {t.applyModalTitle}</h3>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>이번 주 탑승 형태</label>
                    <select value={applyData.rideType} onChange={e => setApplyData({...applyData, rideType: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
                      <option value="Need a Ride">{t.needRide}</option><option value="Can Drive">{t.canDrive}</option><option value="Drive Self">{t.driveSelf}</option>
                    </select>
                  </div>
                  {applyData.rideType === 'Can Drive' && (
                    <>
                      <div style={{ marginBottom: '15px' }}><label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>{t.capacity}</label><input type="number" value={applyData.capacity} onChange={e => setApplyData({...applyData, capacity: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>
                      <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
                        <input type="checkbox" id="applyVan" checked={applyData.isVan} onChange={e => setApplyData({...applyData, isVan: e.target.checked})} />
                        <label htmlFor="applyVan" style={{ fontSize: '13px', fontWeight: 'bold' }}>{t.van}</label>
                      </div>
                    </>
                  )}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={confirmApply} style={{ flex: 1, padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{t.confirmApply}</button>
                    <button onClick={() => setApplyEvent(null)} style={{ flex: 1, padding: '12px', background: '#f4f4f5', color: '#ef4444', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{t.close}</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* -------------------- BOTTOM NAVIGATION -------------------- */}
      {user && profile && !isEditingProfile && (
        <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: '#ffffff', display: 'flex', borderTop: '1px solid #e4e4e7' }}>
          <button onClick={() => setCurrentTab('calendar')} style={{ flex: 1, padding: '15px 0', background: 'none', border: 'none', color: currentTab === 'calendar' ? '#18181b' : '#a1a1aa', fontWeight: currentTab === 'calendar' ? 'bold' : 'normal', fontSize: '13px', cursor: 'pointer' }}>{t.navCal}</button>
          {canManage && <button onClick={() => setCurrentTab('create')} style={{ flex: 1, padding: '15px 0', background: 'none', border: 'none', color: currentTab === 'create' ? '#18181b' : '#a1a1aa', fontWeight: currentTab === 'create' ? 'bold' : 'normal', fontSize: '13px', cursor: 'pointer' }}>{t.adminNew}</button>}
          {canManage && <button onClick={() => setCurrentTab('assign')} style={{ flex: 1, padding: '15px 0', background: 'none', border: 'none', color: currentTab === 'assign' ? '#18181b' : '#a1a1aa', fontWeight: currentTab === 'assign' ? 'bold' : 'normal', fontSize: '13px', cursor: 'pointer' }}>{t.adminAssign}</button>}
          {profile.isAdmin && <button onClick={() => setCurrentTab('users')} style={{ flex: 1, padding: '15px 0', background: 'none', border: 'none', color: currentTab === 'users' ? '#18181b' : '#a1a1aa', fontWeight: currentTab === 'users' ? 'bold' : 'normal', fontSize: '13px', cursor: 'pointer' }}>{t.adminUsers}</button>}
        </nav>
      )}
    </div>
  );
}