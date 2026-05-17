import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Plus, Trash2, ChevronDown, ChevronUp, Save, RotateCcw, CheckCircle2, Clock, Search, LogIn, LogOut, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'

const severityOrder = { Critical: 0, High: 1, Standard: 2, 'Hardware Issue': 3 }
const categories = [
  { name: 'Critical', color: 'bg-red-600', chartColor: '#dc2626' },
  { name: 'High', color: 'bg-orange-500', chartColor: '#f97316' },
  { name: 'Standard', color: 'bg-yellow-500', chartColor: '#eab308' },
  { name: 'Hardware Issue', color: 'bg-blue-500', chartColor: '#2563eb' },
]
const issueOptions = [
  'Increasing Temperature','Increasing Vibration','Increasing Velocity','Increasing Acceleration',
  'Node Reboot','Replace Batteries','Port Swap','Port Reseat','Replace Sensor','Detached Sensor',
  'Belt Catenary','Pin Drift'
]
const TOTAL_SENSORS = 2887
const STORAGE_KEY = 'stl8-cbm-dashboard'
const USERS = [
  { name: 'Admin User', role: 'Admin', pin: '1111' },
  { name: 'Editor User', role: 'Editor', pin: '2222' },
  { name: 'Viewer User', role: 'Viewer', pin: '3333' },
]
const newDeepDive = (asset = '') => ({
  equipmentId: asset, location: '', thermographicNotes: '', vibrationNotes: '', trend: 'Stable', images: []
})

export default function App() {
  const reportRef = useRef(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [loginName, setLoginName] = useState(USERS[0].name)
  const [loginPin, setLoginPin] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)
  const canEdit = currentUser?.role === 'Admin' || currentUser?.role === 'Editor'

  const [lastSaved, setLastSaved] = useState('Not saved yet')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [reportInfo, setReportInfo] = useState({ date: new Date().toISOString().split('T')[0], summary: '' })
  const [alarms, setAlarms] = useState([])
  const [scheduledDTW, setScheduledDTW] = useState([])
  const [newAlarm, setNewAlarm] = useState({ asset: '', component: '', issue: '', category: 'Critical' })
  const [newDTW, setNewDTW] = useState({ category: 'Critical', asset: '', component: '', issue: '', customIssue: '', repairNotes: '' })

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    try {
      const parsed = JSON.parse(saved)
      setReportInfo(parsed.reportInfo || { date: new Date().toISOString().split('T')[0], summary: '' })
      setAlarms(parsed.alarms || [])
      setScheduledDTW(parsed.scheduledDTW || [])
      setLastSaved(parsed.lastSaved || 'Recovered saved report')
    } catch (err) {
      console.error('Saved report could not be loaded', err)
    }
  }, [])

  const saveDashboard = () => {
    const savedTime = new Date().toLocaleString()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ reportInfo, alarms, scheduledDTW, lastSaved: savedTime }))
    setLastSaved(savedTime)
  }

  useEffect(() => {
    const t = setTimeout(saveDashboard, 800)
    return () => clearTimeout(t)
  }, [reportInfo, alarms, scheduledDTW])

  const login = () => {
    const match = USERS.find((u) => u.name === loginName && u.pin === loginPin)
    if (!match) {
      setLoginError('Invalid PIN for selected user.')
      return
    }
    setCurrentUser(match)
    setLoginPin('')
    setLoginError('')
    setIsEditMode(match.role !== 'Viewer')
  }

  const logout = () => {
    setCurrentUser(null)
    setIsEditMode(false)
    setLoginPin('')
    setLoginError('')
  }

  const resetDashboard = () => {
    if (!canEdit || !isEditMode) return
    if (!window.confirm('Clear this shift report and start a new one?')) return
    localStorage.removeItem(STORAGE_KEY)
    setReportInfo({ date: new Date().toISOString().split('T')[0], summary: '' })
    setAlarms([])
    setScheduledDTW([])
    setLastSaved('New report started')
  }

  const addAlarm = () => {
    if (!newAlarm.asset || !newAlarm.issue) return
    setAlarms([...alarms, {
      ...newAlarm, id: Date.now(), status: 'Open', createdAt: new Date().toLocaleString(),
      acknowledgedAt: '', resolvedAt: '', showDetails: false, deepDive: newDeepDive(newAlarm.asset)
    }])
    setNewAlarm({ asset: '', component: '', issue: '', category: 'Critical' })
  }

  const addDTWRepair = () => {
    const finalIssue = newDTW.issue === 'Custom' ? newDTW.customIssue : newDTW.issue
    if (!newDTW.asset || !finalIssue) return
    setScheduledDTW([...scheduledDTW, { ...newDTW, issue: finalIssue, customIssue: '', id: Date.now() }])
    setNewDTW({ category: 'Critical', asset: '', component: '', issue: '', customIssue: '', repairNotes: '' })
  }

  const updateDTWRepair = (id, field, value) => setScheduledDTW(scheduledDTW.map((r) => r.id === id ? { ...r, [field]: value } : r))
  const removeDTWRepair = (id) => setScheduledDTW(scheduledDTW.filter((r) => r.id !== id))
  const removeAlarm = (id) => setAlarms(alarms.filter((a) => a.id !== id))
  const toggleDetails = (id) => setAlarms(alarms.map((a) => a.id === id ? { ...a, showDetails: !a.showDetails } : a))

  const updateAlarmField = (id, field, value) => {
    setAlarms(alarms.map((a) => {
      if (a.id !== id) return a
      const updates = { [field]: value }
      if (field === 'status' && value === 'Acknowledged') updates.acknowledgedAt = new Date().toLocaleString()
      if (field === 'status' && value === 'Resolved') {
        updates.resolvedAt = new Date().toLocaleString()
        updates.showDetails = false
      }
      return { ...a, ...updates }
    }))
  }

  const updateDeepDive = (id, field, value) => setAlarms(alarms.map((a) => a.id === id ? { ...a, deepDive: { ...a.deepDive, [field]: value } } : a))

  const uploadSnapshot = (alarmId, event) => {
    const files = Array.from(event.target.files || [])
    const images = files.map((file) => ({ id: `${file.name}-${Date.now()}-${Math.random()}`, name: file.name, url: URL.createObjectURL(file) }))
    setAlarms(alarms.map((a) => a.id === alarmId ? { ...a, deepDive: { ...a.deepDive, images: [...a.deepDive.images, ...images] } } : a))
    event.target.value = ''
  }

  const removeSnapshot = (alarmId, imageId) => {
    setAlarms(alarms.map((a) => a.id === alarmId ? { ...a, deepDive: { ...a.deepDive, images: a.deepDive.images.filter((i) => i.id !== imageId) } } : a))
  }

  const exportPDF = () => {
    const originalMode = isEditMode
    const originalAlarms = alarms
    setIsEditMode(false)
    setAlarms(alarms.map((a) => ({ ...a, showDetails: true })))
    setTimeout(() => {
      window.print()
      setIsEditMode(originalMode)
      setAlarms(originalAlarms)
    }, 250)
  }

  const activeAlarmCount = alarms.filter((a) => a.status !== 'Resolved').length
  const normalSensorCount = Math.max(TOTAL_SENSORS - activeAlarmCount, 0)
  const activeAlarmPercent = ((activeAlarmCount / TOTAL_SENSORS) * 100).toFixed(2)
  const normalSensorPercent = ((normalSensorCount / TOTAL_SENSORS) * 100).toFixed(2)
  const countByCategory = (cat) => alarms.filter((a) => a.category === cat && a.status !== 'Resolved').length

  const filteredAlarms = useMemo(() => alarms
    .filter((a) => {
      const q = searchTerm.toLowerCase()
      const matchesSearch = a.asset.toLowerCase().includes(q) || a.issue.toLowerCase().includes(q) || (a.component || '').toLowerCase().includes(q) || (a.deepDive?.location || '').toLowerCase().includes(q)
      const matchesCategory = categoryFilter === 'All' || a.category === categoryFilter
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => severityOrder[a.category] - severityOrder[b.category] || new Date(b.createdAt) - new Date(a.createdAt)), [alarms, searchTerm, categoryFilter])

  const sortedScheduledDTW = useMemo(() => [...scheduledDTW].sort((a, b) => severityOrder[a.category] - severityOrder[b.category] || String(a.asset).localeCompare(String(b.asset))), [scheduledDTW])

  const sensorHealthData = [
    { name: 'Critical', value: Math.max(countByCategory('Critical'), 2), realValue: countByCategory('Critical'), fill: '#dc2626' },
    { name: 'High', value: Math.max(countByCategory('High'), 2), realValue: countByCategory('High'), fill: '#f97316' },
    { name: 'Standard', value: Math.max(countByCategory('Standard'), 2), realValue: countByCategory('Standard'), fill: '#eab308' },
    { name: 'Hardware Issue', value: Math.max(countByCategory('Hardware Issue'), 2), realValue: countByCategory('Hardware Issue'), fill: '#2563eb' },
    { name: 'Normal Sensors', value: Math.max(normalSensorCount * 0.08, 10), realValue: normalSensorCount, fill: '#22c55e' },
  ]

  if (!currentUser) return (
    <div className="min-h-screen bg-slate-100 p-6 flex items-center justify-center">
      <Card className="w-full max-w-md rounded-2xl shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white"><ShieldCheck className="h-6 w-6" /></div>
          <CardTitle className="text-2xl">STL8 CBM Crew Login</CardTitle>
          <p className="text-sm text-slate-500">Condition Based Monitoring Program</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <select className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm" value={loginName} onChange={(e) => setLoginName(e.target.value)}>
            {USERS.map((u) => <option key={u.name} value={u.name}>{u.name} — {u.role}</option>)}
          </select>
          <Input type="password" placeholder="Enter PIN" value={loginPin} onChange={(e) => setLoginPin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login()} />
          {loginError && <p className="text-sm text-red-600">{loginError}</p>}
          <Button onClick={login} className="w-full"><LogIn className="mr-2 h-4 w-4 inline" /> Login</Button>
          <div className="rounded-xl bg-slate-50 border p-3 text-xs text-slate-600">
            <p className="font-semibold">Demo access:</p>
            <p>Admin PIN: 1111</p><p>Editor PIN: 2222</p><p>Viewer PIN: 3333</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div ref={reportRef} className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-2">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex flex-col lg:flex-row justify-between items-center gap-3 bg-slate-950 rounded-2xl px-4 py-3 mb-4 shadow-lg border border-slate-800">
          <div className="flex items-center gap-4">
            <div className="flex items-end gap-[2px] h-8 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">
              {[10,18,12,24,16,28,14,22].map((h, i) => <div key={i} className="w-[4px] rounded-full bg-gradient-to-t from-cyan-500 via-sky-400 to-blue-300" style={{ height: `${h}px` }} />)}
            </div>
            <div>
              <h1 className="text-lg md:text-2xl font-semibold text-white tracking-tight uppercase leading-none">STL8 CBM Crew</h1>
              <p className="text-slate-400 text-[11px] md:text-sm font-medium tracking-wide mt-1">Condition Based Monitoring Program</p>
              <p className="text-slate-500 text-[10px] md:text-xs tracking-[0.18em] font-medium uppercase">Shift Report · Active Alarms · Sensor Health Overview</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Badge className="bg-slate-800 text-white border border-slate-700">{currentUser.name} · {currentUser.role}</Badge>
            <Button onClick={() => canEdit && setIsEditMode(!isEditMode)} disabled={!canEdit} className={`${isEditMode ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-700 hover:bg-slate-800'} text-white h-9 text-sm px-3`}>{isEditMode ? 'Edit Mode Enabled' : 'View Only Mode'}</Button>
            <Button onClick={saveDashboard} className="bg-slate-700 hover:bg-slate-800 h-9 text-sm px-3"><Save className="mr-2 h-4 w-4 inline" /> Save</Button>
            <Button onClick={resetDashboard} disabled={!canEdit || !isEditMode} className="bg-slate-600 hover:bg-slate-700 h-9 text-sm px-3"><RotateCcw className="mr-2 h-4 w-4 inline" /> New Shift</Button>
            <Button onClick={exportPDF} className="bg-blue-600 hover:bg-blue-700 h-9 text-sm px-3">Export PDF</Button>
            <Button onClick={logout} className="bg-red-700 hover:bg-red-800 h-9 text-sm px-3"><LogOut className="mr-2 h-4 w-4 inline" /> Logout</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="rounded-2xl shadow-lg">
            <CardHeader><CardTitle>Shift Information</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input type="date" value={reportInfo.date} disabled={!isEditMode} onChange={(e) => setReportInfo({ ...reportInfo, date: e.target.value })} />
              <Textarea placeholder="Shift Summary / Notes" value={reportInfo.summary} disabled={!isEditMode} onChange={(e) => setReportInfo({ ...reportInfo, summary: e.target.value })} className="min-h-[140px]" />
            </CardContent>
          </Card>

          {isEditMode && canEdit && (
            <Card className="rounded-2xl shadow-lg">
              <CardHeader><CardTitle>Add Active Alarm</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Asset / Conveyor ID" value={newAlarm.asset} onChange={(e) => setNewAlarm({ ...newAlarm, asset: e.target.value })} />
                <Input placeholder="Component" value={newAlarm.component} onChange={(e) => setNewAlarm({ ...newAlarm, component: e.target.value })} />
                <select className="w-full border rounded-lg p-2" value={newAlarm.issue} onChange={(e) => setNewAlarm({ ...newAlarm, issue: e.target.value })}>
                  <option value="">Select Issue Description</option>{issueOptions.map((x) => <option key={x}>{x}</option>)}
                </select>
                <select className="w-full border rounded-lg p-2" value={newAlarm.category} onChange={(e) => setNewAlarm({ ...newAlarm, category: e.target.value })}>{categories.map((c) => <option key={c.name}>{c.name}</option>)}</select>
                <Button onClick={addAlarm} className="w-full"><Plus className="mr-2 w-4 h-4 inline" /> Add Alarm</Button>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="rounded-2xl shadow-md mb-6">
          <CardHeader className="py-3"><CardTitle className="text-lg">Sensor Health Overview</CardTitle></CardHeader>
          <CardContent className="pb-4">
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
                <div className="rounded-xl bg-white border p-3"><p className="text-xs font-semibold text-slate-700 uppercase">Total Sensors</p><p className="text-2xl font-bold text-slate-800">{TOTAL_SENSORS}</p><p className="text-xs text-slate-500">Monitored</p></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-lg mb-6">
          <CardHeader className="py-3"><CardTitle className="text-lg">Next Day Scheduled DTW</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {isEditMode && canEdit && (
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2 rounded-xl border bg-slate-50 p-3">
                <select className="rounded-lg border border-slate-300 bg-white p-2 text-sm" value={newDTW.category} onChange={(e) => setNewDTW({ ...newDTW, category: e.target.value })}>{categories.map((c) => <option key={c.name}>{c.name}</option>)}</select>
                <Input placeholder="Asset" value={newDTW.asset} onChange={(e) => setNewDTW({ ...newDTW, asset: e.target.value })} />
                <Input placeholder="Component" value={newDTW.component} onChange={(e) => setNewDTW({ ...newDTW, component: e.target.value })} />
                <select className="rounded-lg border border-slate-300 bg-white p-2 text-sm" value={newDTW.issue} onChange={(e) => setNewDTW({ ...newDTW, issue: e.target.value })}>
                  <option value="">Select Issue</option>{issueOptions.map((x) => <option key={x}>{x}</option>)}<option value="Custom">Custom Issue</option>
                </select>
                <Input placeholder="Custom issue" value={newDTW.customIssue} disabled={newDTW.issue !== 'Custom'} onChange={(e) => setNewDTW({ ...newDTW, customIssue: e.target.value })} />
                <Button onClick={addDTWRepair} className="h-10"><Plus className="mr-2 h-4 w-4 inline" /> Add DTW</Button>
              </div>
            )}
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead><tr className="bg-slate-900 text-white"><th className="px-3 py-2 text-left">Severity</th><th className="px-3 py-2 text-left">Asset</th><th className="px-3 py-2 text-left">Component</th><th className="px-3 py-2 text-left">Issue</th><th className="px-3 py-2 text-left">Repair Description</th>{isEditMode && canEdit && <th className="px-3 py-2">Remove</th>}</tr></thead>
                <tbody>
                  {sortedScheduledDTW.length ? sortedScheduledDTW.map((r) => (
                    <tr key={r.id} className="border-t bg-white align-top">
                      <td className="px-3 py-2">{isEditMode && canEdit ? <select className="w-full rounded-lg border p-2 text-xs" value={r.category} onChange={(e) => updateDTWRepair(r.id, 'category', e.target.value)}>{categories.map((c) => <option key={c.name}>{c.name}</option>)}</select> : <Badge className={`${categories.find((c) => c.name === r.category)?.color} text-white`}>{r.category}</Badge>}</td>
                      <td className="px-3 py-2">{isEditMode && canEdit ? <Input value={r.asset} onChange={(e) => updateDTWRepair(r.id, 'asset', e.target.value)} className="h-8 text-xs" /> : r.asset}</td>
                      <td className="px-3 py-2">{isEditMode && canEdit ? <Input value={r.component} onChange={(e) => updateDTWRepair(r.id, 'component', e.target.value)} className="h-8 text-xs" /> : r.component}</td>
                      <td className="px-3 py-2">{isEditMode && canEdit ? <Input value={r.issue} onChange={(e) => updateDTWRepair(r.id, 'issue', e.target.value)} className="h-8 text-xs" /> : r.issue}</td>
                      <td className="px-3 py-2"><Textarea value={r.repairNotes} disabled={!isEditMode || !canEdit} onChange={(e) => updateDTWRepair(r.id, 'repairNotes', e.target.value)} className="min-h-[64px] text-xs" /></td>
                      {isEditMode && canEdit && <td className="px-3 py-2"><Button variant="destructive" size="icon" onClick={() => removeDTWRepair(r.id)}><Trash2 className="w-3 h-3" /></Button></td>}
                    </tr>
                  )) : <tr><td colSpan={isEditMode && canEdit ? 6 : 5} className="px-3 py-6 text-center text-sm text-slate-500">No scheduled downtime window repairs added.</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-lg">
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle /> Active Alarms</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">{categories.map((c) => <div key={c.name} className={`px-3 py-2 rounded-lg text-white ${c.color}`}><h3 className="text-xs font-semibold uppercase">{c.name}</h3><p className="text-lg font-bold">{countByCategory(c.name)}</p></div>)}</div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-4 print:hidden">
              <div className="relative lg:col-span-2"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input placeholder="Search asset, issue, component, or location" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" /></div>
              <select className="rounded-lg border p-2 text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option>All</option>{categories.map((c) => <option key={c.name}>{c.name}</option>)}</select>
            </div>
            <div className="space-y-4">
              {filteredAlarms.map((alarm) => (
                <div key={alarm.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 px-3 py-2 border-b bg-slate-50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1">
                      <div><p className="text-[10px] uppercase text-slate-500 font-semibold">Asset</p><p className="font-semibold text-sm">{alarm.asset}</p></div>
                      <div><p className="text-[10px] uppercase text-slate-500 font-semibold">Issue</p><p className="text-xs">{alarm.issue}</p></div>
                      <div><p className="text-[10px] uppercase text-slate-500 font-semibold">Severity</p><Badge className={`${categories.find((c) => c.name === alarm.category)?.color} text-white mt-1`}>{alarm.category}</Badge></div>
                      <div><p className="text-[10px] uppercase text-slate-500 font-semibold">Component / Status</p>{alarm.component && <p className="text-xs">{alarm.component}</p>}<Badge className="bg-slate-700 text-white text-[10px] px-2 py-0">{alarm.status}</Badge></div>
                    </div>
                    <div className="flex items-center gap-2"><Button variant="outline" onClick={() => toggleDetails(alarm.id)} className="h-8 text-xs px-3">{alarm.showDetails ? <><ChevronUp className="mr-2 w-4 h-4 inline" /> Hide Details</> : <><ChevronDown className="mr-2 w-4 h-4 inline" /> View Details</>}</Button>{isEditMode && canEdit && <Button variant="destructive" size="icon" onClick={() => removeAlarm(alarm.id)}><Trash2 className="w-3 h-3" /></Button>}</div>
                  </div>
                  {alarm.showDetails && (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1100px] border-collapse">
                        <thead><tr className="bg-slate-900 text-white text-sm"><th className="border px-4 py-3 text-left">Location</th><th className="border px-4 py-3 text-left text-orange-300">Thermographic Analysis</th><th className="border px-4 py-3 text-left text-blue-300">Vibration Analysis</th><th className="border px-4 py-3 text-left">Trend</th><th className="border px-4 py-3 text-left">Status / Component</th><th className="border px-4 py-3 text-left">Sensor Data Snapshot</th></tr></thead>
                        <tbody><tr className="align-top">
                          <td className="border p-3"><Input placeholder="Area / Location" disabled={!isEditMode} value={alarm.deepDive.location} onChange={(e) => updateDeepDive(alarm.id, 'location', e.target.value)} /></td>
                          <td className="border p-3 bg-orange-50"><Textarea placeholder="Thermal findings / notes" disabled={!isEditMode} value={alarm.deepDive.thermographicNotes} onChange={(e) => updateDeepDive(alarm.id, 'thermographicNotes', e.target.value)} className="min-h-[120px]" /></td>
                          <td className="border p-3 bg-blue-50"><Textarea placeholder="Vibration findings / notes" disabled={!isEditMode} value={alarm.deepDive.vibrationNotes} onChange={(e) => updateDeepDive(alarm.id, 'vibrationNotes', e.target.value)} className="min-h-[120px]" /></td>
                          <td className="border p-3"><select className="w-full rounded-lg border p-3" disabled={!isEditMode} value={alarm.deepDive.trend} onChange={(e) => updateDeepDive(alarm.id, 'trend', e.target.value)}><option>Stable</option><option>Rising</option><option>Falling</option><option>Intermittent Spikes</option></select></td>
                          <td className="border p-3 space-y-3"><select className="w-full rounded-lg border p-3" disabled={!isEditMode} value={alarm.status} onChange={(e) => updateAlarmField(alarm.id, 'status', e.target.value)}><option>Open</option><option>Acknowledged</option><option>Monitoring</option><option>Resolved</option></select><Input placeholder="Component" disabled={!isEditMode} value={alarm.component} onChange={(e) => updateAlarmField(alarm.id, 'component', e.target.value)} /><div className="text-xs text-slate-500"><p><Clock className="inline w-3 h-3 mr-1" />Created: {alarm.createdAt}</p>{alarm.acknowledgedAt && <p><CheckCircle2 className="inline w-3 h-3 mr-1" />Ack: {alarm.acknowledgedAt}</p>}{alarm.resolvedAt && <p><CheckCircle2 className="inline w-3 h-3 mr-1" />Resolved: {alarm.resolvedAt}</p>}</div></td>
                          <td className="border p-3">{isEditMode && canEdit && <label className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm text-white cursor-pointer w-full">Upload Screenshots<input type="file" accept="image/*" multiple className="hidden" onChange={(e) => uploadSnapshot(alarm.id, e)} /></label>}<div className="grid grid-cols-2 gap-2 mt-3">{alarm.deepDive.images.map((img) => <div key={img.id} className="relative rounded-lg border bg-slate-50 p-1"><img src={img.url} alt={img.name} className="h-20 w-full object-cover rounded-md border" />{isEditMode && canEdit && <Button variant="destructive" size="icon" className="absolute -right-2 -top-2 h-5 w-5" onClick={() => removeSnapshot(alarm.id, img.id)}><Trash2 className="w-3 h-3" /></Button>}</div>)}</div>{alarm.deepDive.images.length === 0 && <div className="rounded-lg border border-dashed p-4 mt-3 text-center text-xs text-slate-500">No screenshots uploaded.</div>}</td>
                        </tr></tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {filteredAlarms.length === 0 && <div className="rounded-xl border border-dashed bg-slate-50 p-8 text-center text-slate-500">No alarms match the current filters.</div>}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
