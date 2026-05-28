import React, { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { auth, db, storage } from './firebase';
import {
  DEFAULT_TOTAL_SENSORS,
  PRIMARY_ADMIN_EMAIL,
  REPORT_DOC_PATH,
  USER_ROLES,
  createDeepDiveTemplate,
  hardwareIssueTypes,
  severityOrder,
} from './constants';

import {
  Header,
  ShiftInfoCard,
  AddAlarmCard,
  SensorHealthCard,
  HardwareIssuesTable,
  DTWTable,
  ActiveAlarmsTable,
} from './components/ui/Sections';
import { LoginModal, AdminManagerModal } from './components/ui/Modals';

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

  const [reportInfo, setReportInfo] = useState({ date: new Date().toISOString().split('T')[0], summary: '' });
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
      setCurrentUser({ name: email, email, role: adminUser ? USER_ROLES.ADMIN : USER_ROLES.VIEWER });
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
      setLoginError('Unable to login with Firebase. Check email, password, and Authentication settings.');
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

    const updatedAdmins = [...approvedAdmins, { email: normalizedEmail, role: USER_ROLES.ADMIN, approvedAt: new Date().toLocaleString() }];

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
    await setDoc(doc(db, ...REPORT_DOC_PATH), { approvedAdmins: updatedAdmins }, { merge: true });
  };

  const sendPasswordSetupEmail = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      setAdminAccessMessage(`Firebase password setup/reset email sent to ${email}.`);
    } catch (error) {
      console.error('Password setup email failed:', error);
      setAdminAccessMessage(`${email} must exist in Firebase Authentication before a setup/reset email can be sent.`);
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
    setScheduledDTW([...scheduledDTW, { ...newDTW, issue: finalIssue, customIssue: '', id: Date.now() }]);
    setNewDTW({ category: 'Critical', asset: '', component: '', issue: '', customIssue: '', repairNotes: '' });
  };

  const addAlarmToDTW = (alarm) => {
    if (!canEdit || !isEditMode) return;

    const alreadyScheduled = scheduledDTW.some(
      (repair) =>
        repair.sourceAlarmId === alarm.id ||
        (repair.asset === alarm.asset &&
          repair.component === alarm.component &&
          repair.issue === alarm.issue)
    );

    if (alreadyScheduled) {
      setSaveMessage('This alarm is already listed in Next Day Scheduled DTW.');
      setTimeout(() => setSaveMessage(''), 5000);
      return;
    }

    setScheduledDTW([
      ...scheduledDTW,
      {
        id: Date.now(),
        sourceAlarmId: alarm.id,
        category: alarm.category,
        asset: alarm.asset,
        component: alarm.component || '',
        issue: alarm.issue,
        customIssue: '',
        repairNotes: `Added from Active Alarm created ${alarm.createdAt || ''}`.trim(),
      },
    ]);

    setSaveMessage('Active Alarm added to Next Day Scheduled DTW. Click Save Report to save this change.');
    setTimeout(() => setSaveMessage(''), 5000);
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
            ? { ...alarm, deepDive: { ...alarm.deepDive, images: [...(alarm.deepDive.images || []), uploadedSnapshot] } }
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
          ? { ...alarm, deepDive: { ...alarm.deepDive, images: (alarm.deepDive.images || []).filter((image) => image.id !== imageId) } }
          : alarm
      )
    );
    setSnapshotUploadMessage('Snapshot removed from report. Click Save Report to save this change.');
    setTimeout(() => setSnapshotUploadMessage(''), 5000);
  };

  const resolveOneHardwareIssue = (issueType) => {
    if (!canEdit || !isEditMode) return;

    const matchingAlarm = alarms.find(
      (alarm) =>
        alarm.category === 'Hardware Issue' &&
        alarm.issue === issueType &&
        alarm.status !== 'Resolved'
    );

    if (!matchingAlarm) return;

    setAlarms((currentAlarms) =>
      currentAlarms.map((alarm) =>
        alarm.id === matchingAlarm.id
          ? {
              ...alarm,
              status: 'Resolved',
              resolvedAt: new Date().toLocaleString(),
              showDetails: false,
            }
          : alarm
      )
    );

    setSaveMessage(`${issueType} count reduced by 1. Click Save Report to save this change.`);
    setTimeout(() => setSaveMessage(''), 5000);
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
      counts[issueType] = alarms.filter((alarm) => alarm.category === 'Hardware Issue' && alarm.status !== 'Resolved' && alarm.issue === issueType).length;
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
        <Header
          currentUser={currentUser}
          isEditMode={isEditMode}
          setIsEditMode={setIsEditMode}
          canEdit={canEdit}
          isPrimaryAdmin={isPrimaryAdmin}
          setShowLogin={setShowLogin}
          setShowAdminManager={setShowAdminManager}
          handleLogout={handleLogout}
          saveDashboard={saveDashboard}
          exportToPDF={exportToPDF}
          lastSaved={lastSaved}
        />

        {saveMessage && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{saveMessage}</div>}
        {snapshotUploadMessage && <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-700">{snapshotUploadMessage}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ShiftInfoCard reportInfo={reportInfo} setReportInfo={setReportInfo} isEditMode={isEditMode} />
          <AddAlarmCard canEdit={canEdit} isEditMode={isEditMode} newAlarm={newAlarm} setNewAlarm={setNewAlarm} addAlarm={addAlarm} alarmEntryMessage={alarmEntryMessage} />
        </div>

        <SensorHealthCard sensorHealthData={sensorHealthData} activeAlarmCount={activeAlarmCount} normalSensorCount={normalSensorCount} activeAlarmPercent={activeAlarmPercent} normalSensorPercent={normalSensorPercent} />
        <DTWTable isEditMode={isEditMode} canEdit={canEdit} newDTW={newDTW} setNewDTW={setNewDTW} addDTWRepair={addDTWRepair} sortedScheduledDTW={sortedScheduledDTW} updateDTWRepair={updateDTWRepair} removeDTWRepair={removeDTWRepair} />
        <ActiveAlarmsTable filteredAlarms={filteredAlarms} countByCategory={countByCategory} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} searchTerm={searchTerm} setSearchTerm={setSearchTerm} isEditMode={isEditMode} canEdit={canEdit} toggleAlarmDetails={toggleAlarmDetails} removeAlarm={removeAlarm} updateAlarmDeepDive={updateAlarmDeepDive} updateAlarmField={updateAlarmField} uploadSensorSnapshot={uploadSensorSnapshot} removeSensorSnapshot={removeSensorSnapshot} addAlarmToDTW={addAlarmToDTW} />

        <HardwareIssuesTable hardwareIssueCounts={hardwareIssueCounts} totalHardwareIssues={totalHardwareIssues} alarms={alarms} isEditMode={isEditMode} canEdit={canEdit} updateAlarmField={updateAlarmField} resolveOneHardwareIssue={resolveOneHardwareIssue} />

        <LoginModal showLogin={showLogin} loginEmail={loginEmail} setLoginEmail={setLoginEmail} loginPassword={loginPassword} setLoginPassword={setLoginPassword} loginError={loginError} setLoginError={setLoginError} setShowLogin={setShowLogin} handleLogin={handleLogin} />
        <AdminManagerModal showAdminManager={showAdminManager} setShowAdminManager={setShowAdminManager} newAdminEmail={newAdminEmail} setNewAdminEmail={setNewAdminEmail} grantAdminAccess={grantAdminAccess} adminAccessMessage={adminAccessMessage} setAdminAccessMessage={setAdminAccessMessage} approvedAdmins={approvedAdmins} sendPasswordSetupEmail={sendPasswordSetupEmail} removeAdminAccess={removeAdminAccess} />
      </div>
    </div>
  );
}
