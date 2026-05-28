import React, { useState } from 'react';
import { ChevronDown, ChevronUp, LogOut, Plus, Save, Search, Trash2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Input } from './input';
import { Textarea } from './textarea';
import { Badge } from './badge';

import {
  DEFAULT_TOTAL_SENSORS,
  activeAlarmCategories,
  categories,
  hardwareIssueTypes,
  issueOptions,
} from '../../constants';

const normalizeUrl = (value) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
};

export function Header({
  currentUser,
  isEditMode,
  setIsEditMode,
  canEdit,
  isPrimaryAdmin,
  setShowLogin,
  setShowAdminManager,
  handleLogout,
  saveDashboard,
  exportToPDF,
  lastSaved,
}) {
  return (
    <Card className="rounded-2xl shadow-lg overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-slate-950 px-4 py-2.5 border border-slate-800">
          <div className="flex items-center gap-3 text-center lg:text-left">
            <div className="flex items-end gap-[3px] h-12 px-3.5 py-1 rounded-md bg-slate-900 border border-slate-800 shadow-inner">
              {[12, 22, 16, 32, 20, 40, 18, 30].map((height, index) => (
                <div
                  key={index}
                  className="w-[5px] rounded-full bg-gradient-to-t from-cyan-500 via-sky-400 to-blue-300 opacity-95"
                  style={{ height: `${height}px` }}
                />
              ))}
            </div>
            <div>
              <h1 className="text-base md:text-xl font-semibold text-white uppercase leading-none">STL8 CBM Crew</h1>
              <p className="text-slate-400 text-xs mt-0.5">Condition Based Monitoring Program</p>
              <p className="text-slate-500 text-[10px] uppercase mt-0.5">Shift Report · Active Alarms · Sensor Health Overview</p>
              <p className="text-slate-500 text-[10px] mt-0.5">Signed in as: {currentUser.name}</p>
              <p className="text-slate-600 text-[10px] mt-0.5">Last saved: {lastSaved}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 print:hidden">
            <Button
              onClick={() => (canEdit ? setIsEditMode(!isEditMode) : setShowLogin(true))}
              className={`${isEditMode ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-700 hover:bg-slate-800'} text-white h-8 text-xs px-3`}
            >
              {isEditMode ? 'Edit Mode Enabled' : canEdit ? 'View Only Mode' : 'Admin Login / Edit'}
            </Button>

            {canEdit && isEditMode && (
              <Button onClick={saveDashboard} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs px-3">
                <Save className="mr-2 h-4 w-4" /> Save Report
              </Button>
            )}

            <Button onClick={exportToPDF} className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs px-3">
              Export PDF
            </Button>

            {canEdit && isPrimaryAdmin && (
              <Button onClick={() => setShowAdminManager(true)} className="bg-purple-700 hover:bg-purple-800 text-white h-8 text-xs px-3">
                Manage Admin Access
              </Button>
            )}

            {canEdit && (
              <Button onClick={handleLogout} className="bg-red-700 hover:bg-red-800 text-white h-8 text-xs px-3">
                <LogOut className="mr-2 h-4 w-4" /> Exit Admin
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ShiftInfoCard({ reportInfo, setReportInfo, isEditMode }) {
  return (
    <Card className="rounded-2xl shadow-lg">
      <CardHeader><CardTitle>Shift Information</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Input type="date" value={reportInfo.date} disabled={!isEditMode} onChange={(e) => setReportInfo({ ...reportInfo, date: e.target.value })} />
        <Textarea placeholder="Shift Summary / Notes" value={reportInfo.summary} disabled={!isEditMode} onChange={(e) => setReportInfo({ ...reportInfo, summary: e.target.value })} className="min-h-[140px]" />
      </CardContent>
    </Card>
  );
}

export function AddAlarmCard({ canEdit, isEditMode, newAlarm, setNewAlarm, addAlarm, alarmEntryMessage }) {
  if (!canEdit) return null;

  return (
    <Card className="rounded-2xl shadow-lg">
      <CardHeader><CardTitle>Add Active Alarm</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {alarmEntryMessage && <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-700">{alarmEntryMessage}</div>}
        {!isEditMode && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">Edit Mode is currently off.</div>}

        <Input placeholder="Asset / Conveyor ID" value={newAlarm.asset} disabled={!isEditMode} onChange={(e) => setNewAlarm({ ...newAlarm, asset: e.target.value })} />
        <Input placeholder="Component" value={newAlarm.component} disabled={!isEditMode} onChange={(e) => setNewAlarm({ ...newAlarm, component: e.target.value })} />
        <Input placeholder="WO# Link" value={newAlarm.workOrder || ''} disabled={!isEditMode} onChange={(e) => setNewAlarm({ ...newAlarm, workOrder: e.target.value })} />

        <select className="w-full border rounded-lg p-2" value={newAlarm.issue} disabled={!isEditMode} onChange={(e) => setNewAlarm({ ...newAlarm, issue: e.target.value })}>
          <option value="">Select Issue Description</option>
          {issueOptions.map((issue) => <option key={issue} value={issue}>{issue}</option>)}
        </select>

        <select className="w-full border rounded-lg p-2" value={newAlarm.category} disabled={!isEditMode} onChange={(e) => setNewAlarm({ ...newAlarm, category: e.target.value })}>
          {categories.map((cat) => <option key={cat.name} value={cat.name}>{cat.name}</option>)}
        </select>

        <Button onClick={addAlarm} disabled={!isEditMode || !newAlarm.asset.trim() || !newAlarm.issue} className="w-full">
          <Plus className="mr-2 h-4 w-4" /> Add Alarm
        </Button>
      </CardContent>
    </Card>
  );
}

export function SensorHealthCard({ sensorHealthData, activeAlarmCount, normalSensorCount, activeAlarmPercent, normalSensorPercent }) {
  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader className="py-3"><CardTitle className="text-lg">Sensor Health Overview</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center">
          <div className="lg:col-span-2 flex justify-center overflow-x-auto">
            <PieChart width={520} height={260}>
              <Pie data={sensorHealthData} cx="50%" cy="100%" startAngle={0} endAngle={180} outerRadius={120} innerRadius={70} paddingAngle={2} dataKey="value">
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
  );
}

export function DTWTable({ isEditMode, canEdit, newDTW, setNewDTW, addDTWRepair, sortedScheduledDTW, updateDTWRepair, removeDTWRepair }) {
  return (
    <Card className="rounded-2xl shadow-lg">
      <CardHeader className="py-3"><CardTitle className="text-lg">Next Day Scheduled DTW</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {isEditMode && canEdit && (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2 rounded-xl border bg-slate-50 p-3">
            <select className="rounded-lg border p-2 text-sm" value={newDTW.category} onChange={(e) => setNewDTW({ ...newDTW, category: e.target.value })}>{categories.map((cat) => <option key={cat.name} value={cat.name}>{cat.name}</option>)}</select>
            <Input placeholder="Asset" value={newDTW.asset} onChange={(e) => setNewDTW({ ...newDTW, asset: e.target.value })} />
            <Input placeholder="Component" value={newDTW.component} onChange={(e) => setNewDTW({ ...newDTW, component: e.target.value })} />
            <Input placeholder="WO# Link" value={newDTW.workOrder || ''} onChange={(e) => setNewDTW({ ...newDTW, workOrder: e.target.value })} />
            <select className="rounded-lg border p-2 text-sm" value={newDTW.issue} onChange={(e) => setNewDTW({ ...newDTW, issue: e.target.value })}>
              <option value="">Select Issue</option>
              {issueOptions.map((issue) => <option key={issue} value={issue}>{issue}</option>)}
              <option value="Custom">Custom Issue</option>
            </select>
            <Input placeholder="Custom issue" value={newDTW.customIssue} disabled={newDTW.issue !== 'Custom'} onChange={(e) => setNewDTW({ ...newDTW, customIssue: e.target.value })} />
            <Button onClick={addDTWRepair}><Plus className="mr-2 h-4 w-4" /> Add DTW</Button>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[1050px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-3 py-2 text-left">Severity</th>
                <th className="px-3 py-2 text-left">Asset</th>
                <th className="px-3 py-2 text-left">Component</th>
                <th className="px-3 py-2 text-left">Issue</th>
                <th className="px-3 py-2 text-left">WO#</th>
                <th className="px-3 py-2 text-left">Repair Description</th>
                {isEditMode && canEdit && <th className="px-3 py-2 text-center">Remove</th>}
              </tr>
            </thead>
            <tbody>
              {sortedScheduledDTW.length > 0 ? sortedScheduledDTW.map((repair) => (
                <tr key={repair.id} className="border-t bg-white align-top">
                  <td className="px-3 py-2"><Badge className={`${categories.find((cat) => cat.name === repair.category)?.color} text-white`}>{repair.category}</Badge></td>
                  <td className="px-3 py-2">{isEditMode && canEdit ? <Input value={repair.asset} onChange={(e) => updateDTWRepair(repair.id, 'asset', e.target.value)} /> : repair.asset}</td>
                  <td className="px-3 py-2">{isEditMode && canEdit ? <Input value={repair.component} onChange={(e) => updateDTWRepair(repair.id, 'component', e.target.value)} /> : repair.component}</td>
                  <td className="px-3 py-2">{isEditMode && canEdit ? <Input value={repair.issue} onChange={(e) => updateDTWRepair(repair.id, 'issue', e.target.value)} /> : repair.issue}</td>
                  <td className="px-3 py-2">
                    {isEditMode && canEdit ? (
                      <Input value={repair.workOrder || ''} onChange={(e) => updateDTWRepair(repair.id, 'workOrder', e.target.value)} />
                    ) : repair.workOrder ? (
                      <a href={normalizeUrl(repair.workOrder)} target="_blank" rel="noreferrer" className="text-blue-600 underline">WO Link</a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-3 py-2"><Textarea value={repair.repairNotes} disabled={!isEditMode || !canEdit} onChange={(e) => updateDTWRepair(repair.id, 'repairNotes', e.target.value)} className="min-h-[64px] text-xs" /></td>
                  {isEditMode && canEdit && <td className="px-3 py-2 text-center"><Button variant="destructive" size="icon" onClick={() => removeDTWRepair(repair.id)}><Trash2 className="w-3 h-3" /></Button></td>}
                </tr>
              )) : <tr><td colSpan={isEditMode && canEdit ? 7 : 6} className="px-3 py-6 text-center text-sm text-slate-500">No scheduled downtime window repairs added.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function ActiveAlarmsTable({
  filteredAlarms,
  countByCategory,
  categoryFilter,
  setCategoryFilter,
  searchTerm,
  setSearchTerm,
  isEditMode,
  canEdit,
  toggleAlarmDetails,
  removeAlarm,
  updateAlarmDeepDive,
  updateAlarmField,
  uploadSensorSnapshot,
  removeSensorSnapshot,
  addAlarmToDTW,
}) {
  return (
    <Card className="rounded-2xl shadow-lg">
      <CardHeader><CardTitle>Active Alarms</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
          {activeAlarmCategories.map((cat) => (
            <div key={cat.name} className={`px-3 py-2 rounded-lg text-white ${cat.color}`}>
              <h3 className="text-xs font-semibold uppercase">{cat.name}</h3>
              <p className="text-lg font-bold">{countByCategory(cat.name)}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-4 print:hidden">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input placeholder="Search asset, issue, component, or location" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <select className="rounded-lg border p-2 text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="All">All Severities</option>
            {activeAlarmCategories.map((cat) => <option key={cat.name} value={cat.name}>{cat.name}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[1300px] border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white uppercase">
                <th className="px-3 py-2 text-left">Severity</th>
                <th className="px-3 py-2 text-left">Asset</th>
                <th className="px-3 py-2 text-left">Issue</th>
                <th className="px-3 py-2 text-left">Component</th>
                <th className="px-3 py-2 text-left">WO#</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Created</th>
                <th className="px-3 py-2 text-center">Details</th>
                {isEditMode && canEdit && (
                  <>
                    <th className="px-3 py-2 text-center">Remove</th>
                    <th className="px-3 py-2 text-center">Add to DTW</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredAlarms.map((alarm) => (
                <React.Fragment key={alarm.id}>
                  <tr className="border-t hover:bg-slate-50">
                    <td className="px-3 py-2"><Badge className={`${categories.find((cat) => cat.name === alarm.category)?.color} text-white text-[10px]`}>{alarm.category}</Badge></td>
                    <td className="px-3 py-2 font-semibold">{alarm.asset}</td>
                    <td className="px-3 py-2">{alarm.issue}</td>
                    <td className="px-3 py-2">{alarm.component || '-'}</td>
                    <td className="px-3 py-2">
                      {alarm.workOrder ? (
                        <a href={normalizeUrl(alarm.workOrder)} target="_blank" rel="noreferrer" className="text-blue-600 underline">WO Link</a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-3 py-2"><Badge className="bg-slate-700 text-white text-[10px]">{alarm.status}</Badge></td>
                    <td className="px-3 py-2 text-[11px] text-slate-500">{alarm.createdAt}</td>
                    <td className="px-3 py-2 text-center"><Button variant="outline" onClick={() => toggleAlarmDetails(alarm.id)} className="h-7 text-[11px] px-2">{alarm.showDetails ? <><ChevronUp className="mr-2 w-4 h-4" /> Hide</> : <><ChevronDown className="mr-2 w-4 h-4" /> View</>}</Button></td>
                    {isEditMode && canEdit && (
                      <>
                        <td className="px-3 py-2 text-center"><Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => removeAlarm(alarm.id)}><Trash2 className="w-3 h-3" /></Button></td>
                        <td className="px-3 py-2 text-center"><Button variant="outline" className="h-7 text-[11px] px-2" onClick={() => addAlarmToDTW(alarm)}>Add</Button></td>
                      </>
                    )}
                  </tr>

                  {alarm.showDetails && (
                    <tr className="bg-slate-50 border-t">
                      <td colSpan={isEditMode && canEdit ? 10 : 8} className="p-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <Input placeholder="Area / Location" disabled={!isEditMode} value={alarm.deepDive.location} onChange={(e) => updateAlarmDeepDive(alarm.id, 'location', e.target.value)} />
                          <Textarea placeholder="Thermal findings / notes" disabled={!isEditMode} value={alarm.deepDive.thermographicNotes} onChange={(e) => updateAlarmDeepDive(alarm.id, 'thermographicNotes', e.target.value)} />
                          <Textarea placeholder="Vibration findings / notes" disabled={!isEditMode} value={alarm.deepDive.vibrationNotes} onChange={(e) => updateAlarmDeepDive(alarm.id, 'vibrationNotes', e.target.value)} />

                          <select className="rounded-lg border p-3" disabled={!isEditMode} value={alarm.deepDive.trend} onChange={(e) => updateAlarmDeepDive(alarm.id, 'trend', e.target.value)}>
                            <option>Stable</option><option>Rising</option><option>Falling</option><option>Intermittent Spikes</option>
                          </select>

                          <select className="rounded-lg border p-3" disabled={!isEditMode} value={alarm.status} onChange={(e) => updateAlarmField(alarm.id, 'status', e.target.value)}>
                            <option>Open</option><option>Acknowledged</option><option>Monitoring</option><option>Resolved</option>
                          </select>

                          <div>
                            {isEditMode && canEdit && (
                              <label className="inline-flex w-full cursor-pointer items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 print:hidden">
                                Upload Sensor Snapshot
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadSensorSnapshot(alarm.id, e)} />
                              </label>
                            )}
                            <div className="mt-3 grid grid-cols-1 gap-3">
                              {(alarm.deepDive.images || []).map((image) => (
                                <div key={image.id} className="rounded-lg border bg-white p-2">
                                  <a href={image.url} target="_blank" rel="noreferrer"><img src={image.url} alt={image.name} className="h-32 w-full rounded-md border object-cover" /></a>
                                  {isEditMode && canEdit && <Button variant="destructive" size="sm" className="mt-2" onClick={() => removeSensorSnapshot(alarm.id, image.id)}>Remove Image</Button>}
                                </div>
                              ))}
                            </div>
                          </div>
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
  );
}

export function HardwareIssuesTable({ hardwareIssueCounts, totalHardwareIssues, alarms, isEditMode, canEdit, updateAlarmField }) {
  const [openIssueType, setOpenIssueType] = useState(null);
  const [selectedHardwareIds, setSelectedHardwareIds] = useState([]);

  const getHardwareDetails = (issueType) =>
    alarms.filter((alarm) => alarm.category === 'Hardware Issue' && alarm.issue === issueType && alarm.status !== 'Resolved');

  const toggleSelectedHardware = (alarmId) => {
    setSelectedHardwareIds((current) =>
      current.includes(alarmId) ? current.filter((id) => id !== alarmId) : [...current, alarmId]
    );
  };

  const removeSelectedHardwareIssues = () => {
    selectedHardwareIds.forEach((alarmId) => {
      updateAlarmField(alarmId, 'status', 'Resolved');
    });
    setSelectedHardwareIds([]);
  };

  return (
    <Card className="rounded-2xl shadow-lg">
      <CardHeader className="py-3"><CardTitle className="text-lg">Hardware Issues</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[950px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-900 text-white">
                {hardwareIssueTypes.map((issueType) => (
                  <th key={issueType} className="px-3 py-2 text-center">
                    <button type="button" onClick={() => setOpenIssueType(openIssueType === issueType ? null : issueType)} className="w-full rounded-md px-2 py-1 text-xs font-semibold hover:bg-slate-700">
                      {issueType} <span className="ml-1">{openIssueType === issueType ? '▲' : '▼'}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t bg-white">
                {hardwareIssueTypes.map((issueType) => (
                  <td key={issueType} className="px-3 py-4 text-center align-top">
                    <div className="text-2xl font-bold text-slate-800">{hardwareIssueCounts[issueType] || 0}</div>

                    {openIssueType === issueType && (
                      <div className="mt-3 rounded-lg border bg-slate-50 p-2 text-left text-xs shadow-sm">
                        {getHardwareDetails(issueType).length > 0 ? (
                          getHardwareDetails(issueType).map((alarm) => (
                            <label key={alarm.id} className="mb-2 flex cursor-pointer gap-2 rounded-md border bg-white p-2 last:mb-0">
                              {isEditMode && canEdit && (
                                <input
                                  type="checkbox"
                                  checked={selectedHardwareIds.includes(alarm.id)}
                                  onChange={() => toggleSelectedHardware(alarm.id)}
                                  className="mt-1"
                                />
                              )}
                              <div>
                                <p className="font-semibold text-slate-800">Asset: {alarm.asset || 'N/A'}</p>
                                <p className="text-slate-600">Component: {alarm.component || 'N/A'}</p>
                                <p className="text-slate-500">Added: {alarm.createdAt || 'N/A'}</p>
                                {alarm.workOrder && (
                                  <a href={normalizeUrl(alarm.workOrder)} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                                    WO Link
                                  </a>
                                )}
                              </div>
                            </label>
                          ))
                        ) : (
                          <p className="text-center text-slate-500">No active items.</p>
                        )}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {isEditMode && canEdit && (
          <Button variant="destructive" disabled={selectedHardwareIds.length === 0} onClick={removeSelectedHardwareIssues} className="mt-3">
            Remove Selected Hardware Issues
          </Button>
        )}

        <p className="mt-2 text-xs text-slate-500">
          Total active hardware issues: {totalHardwareIssues}. Click a header, select completed hardware items, then click Remove Selected Hardware Issues. Click Save Report afterward.
        </p>
      </CardContent>
    </Card>
  );
}
