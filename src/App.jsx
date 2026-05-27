import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Trash2, LogIn, LogOut, Search, Plus, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { auth, db, storage } from './firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

const DEFAULT_TOTAL_SENSORS = 2887;
const PRIMARY_ADMIN_EMAIL = 'nicopre@amazon.com';
const REPORT_DOC_PATH = ['dashboards', 'currentShiftReport'];

const USER_ROLES = {
  ADMIN: 'Admin',
  VIEWER: 'Viewer',
};

const severityOrder = {
  Critical: 0,
  High: 1,
  Standard: 2,
  'Hardware Issue': 3,
};

const categories = [
  { name: 'Critical', color: 'bg-red-600', chartColor: '#dc2626' },
  { name: 'High', color: 'bg-orange-500', chartColor: '#f97316' },
  { name: 'Standard', color: 'bg-yellow-500', chartColor: '#eab308' },
  { name: 'Hardware Issue', color: 'bg-blue-500', chartColor: '#2563eb' },
];

const activeAlarmCategories = categories.filter((category) => category.name !== 'Hardware Issue');

const hardwareIssueTypes = [
  'Replace Sensor',
  'Replace Node',
  'Replace Batteries',
  'Node Reboot',
  'Port Swap',
  'Port Reseat',
  'Detached Sensor',
];

const issueOptions = [
  'Increasing Temperature',
  'Increasing Vibration',
  'Increasing Velocity',
  'Increasing Acceleration',
  'Node Reboot',
  'Replace Batteries',
  'Port Swap',
  'Port Reseat',
  'Replace Sensor',
  'Replace Node',
  'Detached Sensor',
  'Belt Catenary',
  'Pin Drift',
];

const createDeepDiveTemplate = () => ({
  location: '',
  thermographicNotes: '',
  vibrationNotes: '',
  trend: 'Stable',
  images: [],
});

export default function ShiftReportDashboard() {
  const [currentUser, setCurrentUser] = useState({ name: 'Guest Viewer', email: '', role: USER_ROLES.VIEWER });
  const [isEditMode, setIsEditMode] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showAdminManager, setShowAdminManager] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [approvedAdmins, setApprovedAdmins] = useState([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminAccessMessage, setAdminAccessMessage] = useState('');

  const [reportInfo, setReportInfo] = useState({
    date: new Date().toISOString().split('T')[0],
    summary: '',
  });

  const [alarms, setAlarms] = useState([]);
  const [scheduledDTW, setScheduledDTW] = useState([]);
  const [newAlarm, setNewAlarm] = useState({ asset: '', component: '', issue: '', category: 'Critical' });
  const [newDTW, setNewDTW] = useState({ category: 'Critical', asset: '', component: '', issue: '', customIssue: '', repairNotes: '' });

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [lastSaved, setLastSaved] = useState('Not saved yet');
  const [saveMessage, setSaveMessage] = useState('');
  const [alarmEntryMessage, setAlarmEntryMessage] = useState('');
  const [snapshotUploadMessage, setSnapshotUploadMessage] = useState('');

  const isPrimaryAdmin = currentUser.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
  const canEdit = currentUser.role === USER_ROLES.ADMIN || isPrimaryAdmin;

  useEffect(() => {
    const reportRef = doc(db, ...REPORT_DOC_PATH);

    const unsubscribe = onSnapshot(
      reportRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setLastSaved('No cloud report saved yet');
          return;
        }

        const data = snapshot.data();
        setReportInfo(data.reportInfo || { date: new Date().toISOString().split('T')[0], summary: '' });
        setAlarms(data.alarms || []);
        setScheduledDTW(data.scheduledDTW || []);
        setApprovedAdmins(data.approvedAdmins || []);
        setLastSaved(data.lastSaved || 'Recovered cloud report');
      },
      (error) => {
        console.error('Cloud report load failed:', error);
        setSaveMessage('Cloud report could not be loaded. Check Firebase Firestore rules.');
        setTimeout(() => setSaveMessage(''), 6000);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser?.email) {
        setCurrentUser({ name: 'Guest Viewer', email: '', role: USER_ROLES.VIEWER });
        setIsEditMode(false);
        return;
      }

      const email = firebaseUser.email.toLowerCase();
      const adminUser = email === PRIMARY_ADMIN_EMAIL.toLowerCase() || approvedAdmins.some((admin) => admin.email === email);

      setCurrentUser({
        name: email,
        email,
        role: adminUser ? USER_ROLES.ADMIN : USER_ROLES.VIEWER,
      });
      setIsEditMode(adminUser);
    });

    return () => unsubscribe();
  }, [approvedAdmins]);

  const handleLogin = async () => {
    const normalizedEmail = loginEmail.trim().toLowerCase();

    if (!normalizedEmail || !loginPassword) {
      setLoginError('Enter your email and password.');
      return;
    }

    if (normalizedEmail !== PRIMARY_ADMIN_EMAIL.toLowerCase() && !approvedAdmins.some((admin) => admin.email === normalizedEmail)) {
      setLoginError('This email is not approved for admin access.');
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, normalizedEmail, loginPassword);
      setShowLogin(false);
      setLoginEmail('');
      setLoginPassword('');
      setLoginError('');
    } catch (error) {
      console.error('Firebase login failed:', error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        setLoginError('Incorrect email or password.');
      } else if (error.code === 'auth/user-not-found') {
        setLoginError('User not found in Firebase Authentication.');
      } else if (error.code === 'auth/unauthorized-domain') {
        setLoginError('This Netlify domain is not authorized in Firebase Authentication settings.');
      } else {
        setLoginError('Unable to login with Firebase. Check Authentication settings.');
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser({ name: 'Guest Viewer', email: '', role: USER_ROLES.VIEWER });
    setIsEditMode(false);
    setShowAdminManager(false);
    setShowLogin(false);
  };

  const saveDashboard = async () => {
    if (!canEdit) {
      setSaveMessage('Only an admin can save the shift report.');
      setTimeout(() => setSaveMessage(''), 5000);
      return;
    }

    const savedTime = new Date().toLocaleString();

    try {
      await setDoc(
        doc(db, ...REPORT_DOC_PATH),
        {
          reportInfo,
          alarms,
          scheduledDTW,
          approvedAdmins,
          lastSaved: savedTime,
          updatedBy: currentUser.email || 'Unknown admin',
          updatedAt: savedTime,
        },
        { merge: true }
      );

      setLastSaved(savedTime);
      setSaveMessage('Report saved to Firebase. The latest shift report will now load on other computers.');
      setTimeout(() => setSaveMessage(''), 5000);
    } catch (error) {
      console.error('Cloud save failed:', error);
      setSaveMessage('Cloud save failed. Check Firebase Firestore rules and Netlify environment variables.');
      setTimeout(() => setSaveMessage(''), 6000);
    }
  };

  const grantAdminAccess = async () => {
    const normalizedEmail = newAdminEmail.trim().toLowerCase();

    if (!isPrimaryAdmin) {
      setAdminAccessMessage('Only the primary admin can grant admin access.');
      return;
    }

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setAdminAccessMessage('Enter a valid email address.');
      return;
    }

    if (approvedAdmins.some((admin) => admin.email === normalizedEmail)) {
      setAdminAccessMessage('This user is already approved.');
      return;
    }

    const updatedAdmins = [
      ...approvedAdmins,
      { email: normalizedEmail, role: USER_ROLES.ADMIN, approvedAt: new Date().toLocaleString() },
    ];

    try {
      setApprovedAdmins(updatedAdmins);
      await setDoc(doc(db, ...REPORT_DOC_PATH), { approvedAdmins: updatedAdmins }, { merge: true });
      setNewAdminEmail('');
      setAdminAccessMessage(`${normalizedEmail} approved. Create this user in Firebase Authentication if needed, then click Send Setup Email.`);
    } catch (error) {
      console.error('Admin approval save failed:', error);
      setAdminAccessMessage('Admin approval could not be saved to Firebase. Check Firestore rules.');
    }
  };

  const removeAdminAccess = async (email) => {
    const updatedAdmins = approvedAdmins.filter((admin) => admin.email !== email);
    setApprovedAdmins(updatedAdmins);

    try {
      await setDoc(doc(db, ...REPORT_DOC_PATH), { approvedAdmins: updatedAdmins }, { merge: true });
    } catch (error) {
      console.error('Admin removal save failed:', error);
      setAdminAccessMessage('Admin removal could not be saved to Firebase. Check Firestore rules.');
    }
  };

  const sendPasswordSetupEmail = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      setAdminAccessMessage(`Firebase password setup/reset email sent to ${email}.`);
    } catch (error) {
      console.error('Password setup email failed:', error);
      if (error.code === 'auth/user-not-found') {
        setAdminAccessMessage(`${email} is approved, but no Firebase Authentication account exists yet. Create this user in Firebase Authentication first, then send the setup email again.`);
      } else {
        setAdminAccessMessage('Password setup email failed. Check Firebase Authentication email settings and authorized domains.');
      }
    }
  };

  const exportToPDF = () => window.print();

  const addAlarm = () => {
    if (!canEdit || !isEditMode) {
      setAlarmEntryMessage('Edit Mode must be enabled before adding an alarm.');
      return;
    }

    if (!newAlarm.asset.trim()) {
      setAlarmEntryMessage('Enter an Asset / Conveyor ID before adding an alarm.');
      return;
    }

    if (!newAlarm.issue) {
      setAlarmEntryMessage('Select an Issue Description before adding an alarm.');
      return;
    }

    setAlarms([
      ...alarms,
      {
        ...newAlarm,
        id: Date.now(),
        status: 'Open',
        createdAt: new Date().toLocaleString(),
        acknowledgedAt: '',
        resolvedAt: '',
        showDetails: false,
        deepDive: createDeepDiveTemplate(),
      },
    ]);

    setNewAlarm({ asset: '', component: '', issue: '', category: 'Critical' });
    setAlarmEntryMessage('Alarm added. Click Save Report to save your changes.');
    setTimeout(() => setAlarmEntryMessage(''), 4000);
  };

  const addDTWRepair = () => {
    const finalIssue = newDTW.issue === 'Custom' ? newDTW.customIssue : newDTW.issue;
    if (!newDTW.asset || !finalIssue || !canEdit || !isEditMode) return;

    setScheduledDTW([
      ...scheduledDTW,
      { ...newDTW, issue: finalIssue, customIssue: '', id: Date.now() },
    ]);

    setNewDTW({ category: 'Critical', asset: '', component: '', issue: '', customIssue: '', repairNotes: '' });
  };

  const updateDTWRepair = (id, field, value) => {
    setScheduledDTW(scheduledDTW.map((repair) => (repair.id === id ? { ...repair, [field]: value } : repair)));
  };

  const removeDTWRepair = (id) => setScheduledDTW(scheduledDTW.filter((repair) => repair.id !== id));
  const removeAlarm = (id) => setAlarms(alarms.filter((alarm) => alarm.id !== id));
  const toggleAlarmDetails = (id) => setAlarms(alarms.map((alarm) => (alarm.id === id ? { ...alarm, showDetails: !alarm.showDetails } : alarm)));

  const updateAlarmField = (alarmId, field, value) => {
    setAlarms(
      alarms.map((alarm) => {
        if (alarm.id !== alarmId) return alarm;
        const updates = { [field]: value };
        if (field === 'status' && value === 'Acknowledged') updates.acknowledgedAt = new Date().toLocaleString();
        if (field === 'status' && value === 'Resolved') {
          updates.resolvedAt = new Date().toLocaleString();
          updates.showDetails = false;
        }
        return { ...alarm, ...updates };
      })
    );
  };

  const updateAlarmDeepDive = (alarmId, field, value) => {
    setAlarms(alarms.map((alarm) => (alarm.id === alarmId ? { ...alarm, deepDive: { ...alarm.deepDive, [field]: value } } : alarm)));
  };

  const uploadSensorSnapshot = async (alarmId, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!canEdit || !isEditMode) {
      setSnapshotUploadMessage('Edit Mode must be enabled before uploading a sensor snapshot.');
      setTimeout(() => setSnapshotUploadMessage(''), 5000);
      return;
    }

    try {
      setSnapshotUploadMessage('Uploading sensor data snapshot...');
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const snapshotPath = `sensorSnapshots/${alarmId}/${Date.now()}-${safeFileName}`;
      const snapshotRef = ref(storage, snapshotPath);
      await uploadBytes(snapshotRef, file);
      const downloadURL = await getDownloadURL(snapshotRef);

      const uploadedSnapshot = {
        id: `${alarmId}-${Date.now()}`,
        name: file.name,
        url: downloadURL,
        path: snapshotPath,
        uploadedAt: new Date().toLocaleString(),
        uploadedBy: currentUser.email || 'Unknown admin',
      };

      setAlarms((currentAlarms) =>
        currentAlarms.map((alarm) =>
          alarm.id === alarmId
            ? {
                ...alarm,
                deepDive: {
                  ...alarm.deepDive,
                  images: [...(alarm.deepDive.images || []), uploadedSnapshot],
                },
              }
            : alarm
        )
      );

      setSnapshotUploadMessage('Sensor data snapshot uploaded. Click Save Report to save it for other computers.');
      setTimeout(() => setSnapshotUploadMessage(''), 6000);
    } catch (error) {
      console.error('Sensor snapshot upload failed:', error);
      setSnapshotUploadMessage('Snapshot upload failed. Check Firebase Storage rules and Netlify environment variables.');
      setTimeout(() => setSnapshotUploadMessage(''), 6000);
    }
  };

  const removeSensorSnapshot = (alarmId, imageId) => {
    setAlarms((currentAlarms) =>
      currentAlarms.map((alarm) =>
        alarm.id === alarmId
          ? {
              ...alarm,
              deepDive: {
                ...alarm.deepDive,
                images: (alarm.deepDive.images || []).filter((image) => image.id !== imageId),
              },
            }
          : alarm
      )
    );
    setSnapshotUploadMessage('Snapshot removed from report. Click Save Report to save this change.');
    setTimeout(() => setSnapshotUploadMessage(''), 5000);
  };

  const activeAlarmCount = alarms.filter((alarm) => alarm.status !== 'Resolved').length;
  const normalSensorCount = Math.max(DEFAULT_TOTAL_SENSORS - activeAlarmCount, 0);
  const activeAlarmPercent = ((activeAlarmCount / DEFAULT_TOTAL_SENSORS) * 100).toFixed(2);
  const normalSensorPercent = ((normalSensorCount / DEFAULT_TOTAL_SENSORS) * 100).toFixed(2);
  const countByCategory = (category) => alarms.filter((alarm) => alarm.category === category && alarm.status !== 'Resolved').length;

  const sensorHealthData = [
    { name: 'Critical', value: Math.max(countByCategory('Critical'), 2), realValue: countByCategory('Critical'), fill: '#dc2626' },
    { name: 'High', value: Math.max(countByCategory('High'), 2), realValue: countByCategory('High'), fill: '#f97316' },
    { name: 'Standard', value: Math.max(countByCategory('Standard'), 2), realValue: countByCategory('Standard'), fill: '#eab308' },
    { name: 'Hardware Issue', value: Math.max(countByCategory('Hardware Issue'), 2), realValue: countByCategory('Hardware Issue'), fill: '#2563eb' },
    { name: 'Normal Sensors', value: Math.max(normalSensorCount * 0.08, 10), realValue: normalSensorCount, fill: '#22c55e' },
  ];

  const hardwareIssueCounts = useMemo(() => {
    return hardwareIssueTypes.reduce((counts, issueType) => {
      counts[issueType] = alarms.filter(
        (alarm) =>
          alarm.category === 'Hardware Issue' &&
          alarm.status !== 'Resolved' &&
          alarm.issue === issueType
      ).length;
      return counts;
    }, {});
  }, [alarms]);

  const totalHardwareIssues = useMemo(() => {
    return hardwareIssueTypes.reduce((total, issueType) => total + (hardwareIssueCounts[issueType] || 0), 0);
  }, [hardwareIssueCounts]);

  const filteredAlarms = useMemo(() => {
    return alarms
      .filter((alarm) => {
        if (alarm.category === 'Hardware Issue') return false;
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          alarm.asset.toLowerCase().includes(search) ||
          alarm.issue.toLowerCase().includes(search) ||
          (alarm.component || '').toLowerCase().includes(search) ||
          (alarm.deepDive?.location || '').toLowerCase().includes(search);
        const matchesCategory = categoryFilter === 'All' || alarm.category === categoryFilter;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => severityOrder[a.category] - severityOrder[b.category] || new Date(b.createdAt) - new Date(a.createdAt));
  }, [alarms, searchTerm, categoryFilter]);

  const sortedScheduledDTW = useMemo(() => {
    return [...scheduledDTW].sort((a, b) => severityOrder[a.category] - severityOrder[b.category] || String(a.asset).localeCompare(String(b.asset)));
  }, [scheduledDTW]);

  return (
    <div className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-2">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card className="rounded-2xl shadow-lg overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-slate-950 px-4 py-2.5 border border-slate-800">
              <div className="flex items-center gap-3 text-center lg:text-left">
                <div className="flex items-end gap-[3px] h-12 px-3.5 py-1 rounded-md bg-slate-900 border border-slate-800 shadow-inner">
                  {[12, 22, 16, 32, 20, 40, 18, 30].map((height, index) => (
                    <div key={index} className="w-[5px] rounded-full bg-gradient-to-t from-cyan-500 via-sky-400 to-blue-300 opacity-95 shadow-[0_0_8px_rgba(56,189,248,0.45)]" style={{ height: `${height}px` }} />
                  ))}
                </div>
                <div>
                  <h1 className="text-base md:text-xl font-semibold text-white tracking-tight uppercase leading-none">STL8 CBM Crew</h1>
                  <p className="text-slate-400 text-[10px] md:text-xs font-medium tracking-wide mt-0.5">Condition Based Monitoring Program</p>
                  <p className="text-slate-500 text-[9px] md:text-[10px] tracking-[0.16em] font-medium uppercase mt-0.5">Shift Report · Active Alarms · Sensor Health Overview</p>
                  <p className="text-slate-500 text-[10px] mt-0.5">Signed in as: {currentUser.name}</p>
                  <p className="text-slate-600 text-[10px] mt-0.5">Last saved: {lastSaved}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 print:hidden">
                <Button onClick={() => (canEdit ? setIsEditMode(!isEditMode) : setShowLogin(true))} className={`${isEditMode ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-700 hover:bg-slate-800'} text-white h-8 text-xs px-3`}>
                  {isEditMode ? 'Edit Mode Enabled' : canEdit ? 'View Only Mode' : 'Admin Login / Edit'}
                </Button>
                {canEdit && isEditMode && <Button onClick={saveDashboard} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs px-3"><Save className="mr-2 h-4 w-4" /> Save Report</Button>}
                <Button onClick={exportToPDF} className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs px-3">Export PDF</Button>
                {canEdit && isPrimaryAdmin && <Button onClick={() => setShowAdminManager(true)} className="bg-purple-700 hover:bg-purple-800 text-white h-8 text-xs px-3">Manage Admin Access</Button>}
                {canEdit && <Button onClick={handleLogout} className="bg-red-700 hover:bg-red-800 text-white h-8 text-xs px-3"><LogOut className="mr-2 h-4 w-4" /> Exit Admin</Button>}
              </div>
            </div>
          </CardContent>
        </Card>

        {saveMessage && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{saveMessage}</div>}
        {snapshotUploadMessage && <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-700">{snapshotUploadMessage}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="rounded-2xl shadow-lg">
            <CardHeader><CardTitle>Shift Information</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input type="date" value={reportInfo.date} disabled={!isEditMode} onChange={(e) => setReportInfo({ ...reportInfo, date: e.target.value })} />
              <Textarea placeholder="Shift Summary / Notes" value={reportInfo.summary} disabled={!isEditMode} onChange={(e) => setReportInfo({ ...reportInfo, summary: e.target.value })} className="min-h-[140px]" />
            </CardContent>
          </Card>

          {canEdit && (
            <Card className="rounded-2xl shadow-lg">
              <CardHeader><CardTitle>Add Active Alarm</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {alarmEntryMessage && <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-700">{alarmEntryMessage}</div>}
                {!isEditMode && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">Edit Mode is currently off. Click View Only Mode / Edit Mode in the header to enable alarm entry.</div>}
                <Input placeholder="Asset / Conveyor ID" value={newAlarm.asset} disabled={!isEditMode} onChange={(e) => setNewAlarm({ ...newAlarm, asset: e.target.value })} />
                <Input placeholder="Component" value={newAlarm.component} disabled={!isEditMode} onChange={(e) => setNewAlarm({ ...newAlarm, component: e.target.value })} />
                <select className="w-full border rounded-lg p-2 disabled:bg-slate-100 disabled:text-slate-400" value={newAlarm.issue} disabled={!isEditMode} onChange={(e) => setNewAlarm({ ...newAlarm, issue: e.target.value })}>
                  <option value="">Select Issue Description</option>
                  {issueOptions.map((issue) => <option key={issue} value={issue}>{issue}</option>)}
                </select>
                <select className="w-full border rounded-lg p-2 disabled:bg-slate-100 disabled:text-slate-400" value={newAlarm.category} disabled={!isEditMode} onChange={(e) => setNewAlarm({ ...newAlarm, category: e.target.value })}>
                  {categories.map((cat) => <option key={cat.name} value={cat.name}>{cat.name}</option>)}
                </select>
                <Button onClick={addAlarm} disabled={!isEditMode || !newAlarm.asset.trim() || !newAlarm.issue} className="w-full"><Plus className="mr-2 h-4 w-4" /> Add Alarm</Button>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="rounded-2xl shadow-md">
          <CardHeader className="py-3"><CardTitle className="text-lg">Sensor Health Overview</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center">
              <div className="lg:col-span-2 flex justify-center overflow-x-auto">
                <PieChart width={520} height={260}>
                  <Pie data={sensorHealthData} cx="50%" cy="100%" startAngle={0} endAngle={180} outerRadius={120} innerRadius={70} paddingAngle={2} dataKey="value" label={false}>
                    {sensorHealthData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [`${props.payload.realValue} sensors`, name]} />
                  <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </div>
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-red-50 border border-red-200 p-3"><p className="text-xs font-semibold text-red-700 uppercase">Active Alarms</p><p className="text-2xl font-bold text-red-700">{activeAlarmCount}</p><p className="text-xs text-red-600">{activeAlarmPercent}%</p></div>
                <div className="rounded-xl bg-green-50 border border-green-200 p-3"><p className="text-xs font-semibold text-green-700 uppercase">Normal Sensors</p><p className="text-2xl font-bold text-green-700">{normalSensorCount}</p><p className="text-xs text-green-600">{normalSensorPercent}%</p></div>
                <div className="rounded-xl bg-white border p-3"><p className="text-xs font-semibold text-slate-700 uppercase">Total Sensors</p><p className="text-2xl font-bold text-slate-800">{DEFAULT_TOTAL_SENSORS}</p><p className="text-xs text-slate-500">Monitored</p></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-lg">
          <CardHeader className="py-3"><CardTitle className="text-lg">Next Day Scheduled DTW</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {isEditMode && canEdit && (
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2 rounded-xl border bg-slate-50 p-3">
                <select className="rounded-lg border border-slate-300 bg-white p-2 text-sm" value={newDTW.category} onChange={(e) => setNewDTW({ ...newDTW, category: e.target.value })}>{categories.map((cat) => <option key={cat.name} value={cat.name}>{cat.name}</option>)}</select>
                <Input placeholder="Asset" value={newDTW.asset} onChange={(e) => setNewDTW({ ...newDTW, asset: e.target.value })} />
                <Input placeholder="Component" value={newDTW.component} onChange={(e) => setNewDTW({ ...newDTW, component: e.target.value })} />
                <select className="rounded-lg border border-slate-300 bg-white p-2 text-sm" value={newDTW.issue} onChange={(e) => setNewDTW({ ...newDTW, issue: e.target.value })}>
                  <option value="">Select Issue</option>
                  {issueOptions.map((issue) => <option key={issue} value={issue}>{issue}</option>)}
                  <option value="Custom">Custom Issue</option>
                </select>
                <Input placeholder="Custom issue" value={newDTW.customIssue} disabled={newDTW.issue !== 'Custom'} onChange={(e) => setNewDTW({ ...newDTW, customIssue: e.target.value })} />
                <Button onClick={addDTWRepair}><Plus className="mr-2 h-4 w-4" /> Add DTW</Button>
              </div>
            )}
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead><tr className="bg-slate-900 text-white"><th className="px-3 py-2 text-left">Severity</th><th className="px-3 py-2 text-left">Asset</th><th className="px-3 py-2 text-left">Component</th><th className="px-3 py-2 text-left">Issue</th><th className="px-3 py-2 text-left">Repair Description</th>{isEditMode && canEdit && <th className="px-3 py-2 text-center">Remove</th>}</tr></thead>
                <tbody>
                  {sortedScheduledDTW.length > 0 ? sortedScheduledDTW.map((repair) => (
                    <tr key={repair.id} className="border-t bg-white align-top">
                      <td className="px-3 py-2">{isEditMode && canEdit ? <select className="w-full rounded-lg border p-2 text-xs" value={repair.category} onChange={(e) => updateDTWRepair(repair.id, 'category', e.target.value)}>{categories.map((cat) => <option key={cat.name} value={cat.name}>{cat.name}</option>)}</select> : <Badge className={`${categories.find((cat) => cat.name === repair.category)?.color} text-white`}>{repair.category}</Badge>}</td>
                      <td className="px-3 py-2">{isEditMode && canEdit ? <Input value={repair.asset} onChange={(e) => updateDTWRepair(repair.id, 'asset', e.target.value)} /> : repair.asset}</td>
                      <td className="px-3 py-2">{isEditMode && canEdit ? <Input value={repair.component} onChange={(e) => updateDTWRepair(repair.id, 'component', e.target.value)} /> : repair.component}</td>
                      <td className="px-3 py-2">{isEditMode && canEdit ? <Input value={repair.issue} onChange={(e) => updateDTWRepair(repair.id, 'issue', e.target.value)} /> : repair.issue}</td>
                      <td className="px-3 py-2"><Textarea value={repair.repairNotes} disabled={!isEditMode || !canEdit} onChange={(e) => updateDTWRepair(repair.id, 'repairNotes', e.target.value)} className="min-h-[64px] text-xs" /></td>
                      {isEditMode && canEdit && <td className="px-3 py-2 text-center"><Button variant="destructive" size="icon" onClick={() => removeDTWRepair(repair.id)}><Trash2 className="w-3 h-3" /></Button></td>}
                    </tr>
                  )) : <tr><td colSpan={isEditMode && canEdit ? 6 : 5} className="px-3 py-6 text-center text-sm text-slate-500">No scheduled downtime window repairs added.</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-lg">
          <CardHeader><CardTitle>Active Alarms</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              {categories.map((cat) => <div key={cat.name} className={`px-3 py-2 rounded-lg text-white ${cat.color}`}><h3 className="text-xs font-semibold uppercase">{cat.name}</h3><p className="text-lg font-bold">{countByCategory(cat.name)}</p></div>)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-4 print:hidden">
              <div className="relative lg:col-span-2"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input placeholder="Search asset, issue, component, or location" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" /></div>
              <select className="rounded-lg border p-2 text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="All">All Severities</option>{categories.map((cat) => <option key={cat.name} value={cat.name}>{cat.name}</option>)}</select>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-[1100px] border-collapse text-xs">
                <thead><tr className="bg-slate-900 text-white uppercase tracking-wide"><th className="px-3 py-2 text-left">Severity</th><th className="px-3 py-2 text-left">Asset</th><th className="px-3 py-2 text-left">Issue</th><th className="px-3 py-2 text-left">Component</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Created</th><th className="px-3 py-2 text-center">Details</th>{isEditMode && canEdit && <th className="px-3 py-2 text-center">Remove</th>}</tr></thead>
                <tbody>
                  {filteredAlarms.map((alarm) => (
                    <React.Fragment key={alarm.id}>
                      <tr className="border-t bg-white hover:bg-slate-50 align-middle">
                        <td className="px-3 py-2"><Badge className={`${categories.find((cat) => cat.name === alarm.category)?.color} text-white text-[10px]`}>{alarm.category}</Badge></td>
                        <td className="px-3 py-2 font-semibold text-sm text-slate-800">{alarm.asset}</td>
                        <td className="px-3 py-2 text-xs text-slate-700">{alarm.issue}</td>
                        <td className="px-3 py-2 text-xs text-slate-700">{alarm.component || '-'}</td>
                        <td className="px-3 py-2"><Badge className="bg-slate-700 text-white text-[10px] px-2 py-0">{alarm.status}</Badge></td>
                        <td className="px-3 py-2 text-[11px] text-slate-500 whitespace-nowrap">{alarm.createdAt}</td>
                        <td className="px-3 py-2 text-center"><Button variant="outline" onClick={() => toggleAlarmDetails(alarm.id)} className="h-7 text-[11px] px-2">{alarm.showDetails ? <><ChevronUp className="mr-2 w-4 h-4" /> Hide Details</> : <><ChevronDown className="mr-2 w-4 h-4" /> View Details</>}</Button></td>
                        {isEditMode && canEdit && <td className="px-3 py-2 text-center"><Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => removeAlarm(alarm.id)}><Trash2 className="w-3 h-3" /></Button></td>}
                      </tr>
                      {alarm.showDetails && (
                        <tr className="bg-slate-50 border-t">
                          <td colSpan={isEditMode && canEdit ? 8 : 7} className="p-0">
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[1100px] border-collapse">
                                <thead><tr className="bg-slate-900 text-white text-sm"><th className="border px-4 py-3 text-left">Location</th><th className="border px-4 py-3 text-left text-orange-300">Thermographic Analysis</th><th className="border px-4 py-3 text-left text-blue-300">Vibration Analysis</th><th className="border px-4 py-3 text-left">Trend</th><th className="border px-4 py-3 text-left">Status / Component</th><th className="border px-4 py-3 text-left">Sensor Data Snapshot</th></tr></thead>
                                <tbody>
                                  <tr className="align-top">
                                    <td className="border p-3"><Input placeholder="Area / Location" disabled={!isEditMode} value={alarm.deepDive.location} onChange={(e) => updateAlarmDeepDive(alarm.id, 'location', e.target.value)} /></td>
                                    <td className="border p-3 bg-orange-50"><Textarea placeholder="Thermal findings / notes" disabled={!isEditMode} value={alarm.deepDive.thermographicNotes} onChange={(e) => updateAlarmDeepDive(alarm.id, 'thermographicNotes', e.target.value)} className="min-h-[120px]" /></td>
                                    <td className="border p-3 bg-blue-50"><Textarea placeholder="Vibration findings / notes" disabled={!isEditMode} value={alarm.deepDive.vibrationNotes} onChange={(e) => updateAlarmDeepDive(alarm.id, 'vibrationNotes', e.target.value)} className="min-h-[120px]" /></td>
                                    <td className="border p-3"><select className="w-full rounded-lg border p-3" disabled={!isEditMode} value={alarm.deepDive.trend} onChange={(e) => updateAlarmDeepDive(alarm.id, 'trend', e.target.value)}><option>Stable</option><option>Rising</option><option>Falling</option><option>Intermittent Spikes</option></select></td>
                                    <td className="border p-3 space-y-3"><select className="w-full rounded-lg border p-3" disabled={!isEditMode} value={alarm.status} onChange={(e) => updateAlarmField(alarm.id, 'status', e.target.value)}><option>Open</option><option>Acknowledged</option><option>Monitoring</option><option>Resolved</option></select><Input placeholder="Component" disabled={!isEditMode} value={alarm.component} onChange={(e) => updateAlarmField(alarm.id, 'component', e.target.value)} /><div className="text-xs text-slate-500"><p>Created: {alarm.createdAt}</p>{alarm.acknowledgedAt && <p>Acknowledged: {alarm.acknowledgedAt}</p>}{alarm.resolvedAt && <p>Resolved: {alarm.resolvedAt}</p>}</div></td>
                                    <td className="border p-3">
                                      {isEditMode && canEdit && (
                                        <label className="inline-flex w-full cursor-pointer items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 print:hidden">
                                          Upload Sensor Snapshot
                                          <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadSensorSnapshot(alarm.id, e)} />
                                        </label>
                                      )}

                                      <div className="mt-3 grid grid-cols-1 gap-3">
                                        {(alarm.deepDive.images || []).length > 0 ? (
                                          (alarm.deepDive.images || []).map((image) => (
                                            <div key={image.id} className="rounded-lg border bg-white p-2 shadow-sm">
                                              <a href={image.url} target="_blank" rel="noreferrer"><img src={image.url} alt={image.name} className="h-32 w-full rounded-md border object-cover" /></a>
                                              <div className="mt-2 flex items-start justify-between gap-2">
                                                <div><p className="text-[11px] font-semibold text-slate-700 truncate max-w-[180px]">{image.name}</p><p className="text-[10px] text-slate-500">Uploaded: {image.uploadedAt}</p></div>
                                                {isEditMode && canEdit && <Button variant="destructive" size="icon" className="h-6 w-6 shrink-0 print:hidden" onClick={() => removeSensorSnapshot(alarm.id, image.id)}><Trash2 className="h-3 w-3" /></Button>}
                                              </div>
                                            </div>
                                          ))
                                        ) : (
                                          <div className="rounded-lg border border-dashed bg-slate-50 p-4 text-center text-xs text-slate-500">No sensor snapshot uploaded.</div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredAlarms.length === 0 && <div className="rounded-xl border border-dashed bg-slate-50 p-8 text-center text-slate-500">No alarms match the current filters.</div>}
          </CardContent>
        </Card>
        {showLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 print:hidden">
            <Card className="w-full max-w-md rounded-2xl shadow-2xl">
              <CardHeader>
                <CardTitle>Admin Login</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  type="email"
                  placeholder="Admin email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
        
