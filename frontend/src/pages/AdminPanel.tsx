import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Users,
  Activity,
  History,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Database,
  Cpu,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { AuditLogItem } from '../types';

export const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'health'>('users');

  // Users State
  const [users, setUsers] = useState<any[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  // Health State
  const [healthData, setHealthData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [uResp, aResp, hResp] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/audit-logs'),
        api.get('/admin/system-status')
      ]);
      setUsers(uResp.data.data || []);
      setAuditLogs(aResp.data.data || []);
      setHealthData(hResp.data.data || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', {
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole
      });
      setShowAddUserModal(false);
      setNewUserEmail('');
      setNewUserPassword('');
      fetchAdminData();
    } catch (e: any) {
      alert(`User creation failed: ${e.message}`);
    }
  };

  const handleRoleToggle = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      fetchAdminData();
    } catch (e: any) {
      alert(`Role change failed: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Organization Administration & Governance</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Role-based user management, regulatory audit trails, and live microservice telemetry.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 text-xs">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'users' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Users & Roles
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'audit' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Audit Trail
          </button>
          <button
            onClick={() => setActiveTab('health')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'health' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            System Health
          </button>
        </div>
      </div>

      {/* TAB 1: USERS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddUserModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center shadow-lg shadow-emerald-500/20"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
              Invite / Add User
            </button>
          </div>

          <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 text-[10px] uppercase">
                <tr>
                  <th className="p-3.5">Email Address</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Created Date</th>
                  <th className="p-3.5 text-right">Role Management</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-800/30">
                    <td className="p-3.5 font-semibold text-white">{u.email}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.role === 'admin' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="p-3.5 text-right">
                      {u._id !== user?.id && (
                        <button
                          onClick={() => handleRoleToggle(u._id, u.role)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px]"
                        >
                          Switch to {u.role === 'admin' ? 'User' : 'Admin'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
              <History className="w-4 h-4 mr-2 text-cyan-400" />
              Chronological Audit Trail
            </h3>
            <span className="text-[11px] text-slate-400">Latest 100 System Events</span>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 text-[10px] uppercase sticky top-0">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Event Action</th>
                  <th className="p-3">Entity Type</th>
                  <th className="p-3">Target ID</th>
                  <th className="p-3">Triggered By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-800/30">
                    <td className="p-3 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="p-3 font-bold text-emerald-400">{log.action}</td>
                    <td className="p-3 text-slate-300">{log.entityType}</td>
                    <td className="p-3 text-slate-400 truncate max-w-xs">{log.entityId || '—'}</td>
                    <td className="p-3 text-slate-400">{log.userId?.email || 'System'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SYSTEM HEALTH MONITOR */}
      {activeTab === 'health' && healthData && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(healthData.services || {}).map(([key, srv]: any) => (
              <div key={key} className="glass-card p-5 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{srv.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                    {srv.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {key === 'apiGateway' && 'Node.js Express HTTP server listening on Port 5000'}
                  {key === 'database' && 'MongoDB persistence engine readyState: 1'}
                  {key === 'mlMicroservice' && `FastAPI Uvicorn running on Port 8001 (Model: ${srv.details?.modelVersion})`}
                  {key === 'aiProvider' && 'Active Decarbonization Intelligence Provider'}
                  {key === 'emissionFactorSource' && 'GHG Protocol baseline table with Climatiq connector'}
                </p>
              </div>
            ))}
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800 text-xs space-y-2">
            <h4 className="font-bold text-white uppercase tracking-wider">Tenant Telemetry</h4>
            <div className="grid grid-cols-3 gap-4 text-slate-300">
              <p>Organization: <b className="text-white">{healthData.organizationStats?.companyName}</b></p>
              <p>Active Users: <b className="text-white">{healthData.organizationStats?.userCount}</b></p>
              <p>Total Activity Logs: <b className="text-white">{healthData.organizationStats?.activityCount}</b></p>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-3xl border border-slate-800 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white">Create Organization User</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="analyst@company.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="glass-input w-full px-3.5 py-2 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="glass-input w-full px-3.5 py-2 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Role Permissions</label>
                <select
                  value={newUserRole}
                  onChange={(e: any) => setNewUserRole(e.target.value)}
                  className="glass-input w-full px-3.5 py-2 rounded-xl"
                >
                  <option value="user" className="bg-slate-900">Standard User (Enter activities, view dashboard)</option>
                  <option value="admin" className="bg-slate-900">Admin (Manage users, retrain models, delete activities)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
