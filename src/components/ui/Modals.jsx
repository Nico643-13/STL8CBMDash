import React from 'react';
import { LogIn, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PRIMARY_ADMIN_EMAIL } from '../constants';

export function LoginModal({ showLogin, loginEmail, setLoginEmail, loginPassword, setLoginPassword, loginError, setLoginError, setShowLogin, handleLogin }) {
  if (!showLogin) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 print:hidden">
      <Card className="w-full max-w-md rounded-2xl shadow-2xl">
        <CardHeader><CardTitle>Admin Login</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input type="email" placeholder="Admin email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
          <Input type="password" placeholder="Password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }} />
          {loginError && <div className="text-sm text-red-600">{loginError}</div>}
          <div className="flex gap-2">
            <Button onClick={handleLogin} className="flex-1 bg-slate-950 text-white"><LogIn className="mr-2 h-4 w-4" /> Login</Button>
            <Button variant="outline" className="flex-1" onClick={() => { setShowLogin(false); setLoginError(''); }}>Cancel</Button>
          </div>
          <div className="rounded-xl bg-slate-50 border p-3 text-xs text-slate-600">Use your Firebase Authentication email and password.</div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminManagerModal({ showAdminManager, setShowAdminManager, newAdminEmail, setNewAdminEmail, grantAdminAccess, adminAccessMessage, setAdminAccessMessage, approvedAdmins, sendPasswordSetupEmail, removeAdminAccess }) {
  if (!showAdminManager) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 print:hidden">
      <Card className="w-full max-w-2xl rounded-2xl shadow-2xl">
        <CardHeader><CardTitle>Manage Admin Access</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
            <Input type="email" placeholder="Enter admin email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} />
            <Button onClick={grantAdminAccess} className="bg-purple-700 hover:bg-purple-800 text-white">Grant Access</Button>
          </div>
          {adminAccessMessage && <div className="text-sm text-slate-700 bg-slate-100 rounded-lg p-3">{adminAccessMessage}</div>}
          <div className="space-y-2">
            {approvedAdmins.map((admin) => (
              <div key={admin.email} className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                <div><p className="font-medium text-slate-900">{admin.email}</p><p className="text-xs text-slate-500">Role: {admin.role || 'Admin'} · Approved: {admin.approvedAt || 'Existing'}</p></div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => sendPasswordSetupEmail(admin.email)} className="h-8 text-xs px-3">Send Setup Email</Button>
                  {admin.email !== PRIMARY_ADMIN_EMAIL.toLowerCase() && <Button variant="destructive" size="icon" onClick={() => removeAdminAccess(admin.email)}><Trash2 className="w-4 h-4" /></Button>}
                </div>
              </div>
            ))}
            {approvedAdmins.length === 0 && <div className="text-sm text-slate-500 text-center p-6 border rounded-xl">No additional admins approved yet.</div>}
          </div>
          <div className="flex justify-end"><Button variant="outline" onClick={() => { setShowAdminManager(false); setAdminAccessMessage(''); }}>Close</Button></div>
        </CardContent>
      </Card>
    </div>
  );
}
