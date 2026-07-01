'use client';

import { useState, useEffect } from 'react';
import { getTeamMembers, inviteTeamMember, revokeInvite, removeTeamMember } from '@/lib/api/team';
import { ShieldAlert, Users, Trash2, Mail, Copy, CheckCircle2, Palette, FileText, Image as ImageIcon, Save, PenTool } from 'lucide-react';
import { useRole } from '@/hooks/useRole';

export default function SettingsPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  
  const { canManageTeam, isOwnerOrAdmin } = useRole();

  useEffect(() => {
    fetchTeam();
  }, [isOwnerOrAdmin]);



  const fetchTeam = async () => {
    try {
      const data = await getTeamMembers();
      setMembers(data.users);
      setInvites(data.invites);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const invite = await inviteTeamMember(inviteEmail, inviteRole);
      setGeneratedLink(`${window.location.origin}/register?invite=${invite.token}`);
      setInviteEmail('');
      fetchTeam();
    } catch (e) {
      console.error(e);
      alert('Failed to invite user');
    }
  };

  const handleRemoveMember = async (id: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    try {
      await removeTeamMember(id);
      fetchTeam();
    } catch (e) {
      console.error(e);
      alert('Failed to remove member');
    }
  };

  const handleRevokeInvite = async (id: string) => {
    try {
      await revokeInvite(id);
      fetchTeam();
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold font-heading text-white">Team Settings</h1>
          <p className="text-gray-400 mt-2">Manage your organization members and roles.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-6 rounded-xl">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-brand-500" />
              Active Members
            </h2>
            <div className="space-y-4">
              {members.map(member => (
                <div key={member.id} className="flex justify-between items-center p-4 bg-gray-900 rounded-lg border border-gray-700">
                  <div>
                    <p className="font-medium text-white">{member.firstName} {member.lastName}</p>
                    <p className="text-sm text-gray-400">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-800 text-gray-300 border border-gray-600">
                      {member.role}
                    </span>
                    {canManageTeam && member.role !== 'OWNER' && (
                      <button onClick={() => handleRemoveMember(member.id)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {invites.length > 0 && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-6 rounded-xl">
              <h2 className="text-xl font-bold text-white mb-6">Pending Invites</h2>
              <div className="space-y-4">
                {invites.map(invite => (
                  <div key={invite.id} className="flex justify-between items-center p-4 bg-gray-900 rounded-lg border border-gray-700">
                    <div>
                      <p className="font-medium text-white">{invite.email}</p>
                      <p className="text-sm text-gray-400">Expires: {new Date(invite.expiresAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-800 text-gray-300 border border-gray-600">
                        {invite.role}
                      </span>
                      {canManageTeam && (
                        <button onClick={() => handleRevokeInvite(invite.id)} className="text-sm text-red-400 hover:text-red-300">
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}


        </div>

        {canManageTeam && (
          <div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-6 rounded-xl sticky top-6">
            <h2 className="text-xl font-bold text-white mb-6">Invite Member</h2>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="colleague@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="ADMIN">Admin (Full Access)</option>
                  <option value="MEMBER">Member (Create Reports)</option>
                  <option value="VIEWER">Viewer (Read Only)</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium py-2 rounded-lg transition-colors"
              >
                Generate Invite Link
              </button>
            </form>

            {generatedLink && (
              <div className="mt-6 p-4 bg-brand-500/10 border border-brand-500/30 rounded-lg">
                <p className="text-sm text-brand-300 font-medium mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Link Generated!
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 px-3 text-white text-sm"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                    title="Copy Link"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
            
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-200">
              <ShieldAlert className="w-5 h-5 mb-2 text-blue-400" />
              <strong>Roles Explained:</strong>
              <ul className="mt-2 space-y-1 ml-4 list-disc text-blue-300/80">
                <li><strong>Admin:</strong> Can add data sources, configure models, and manage team.</li>
                <li><strong>Member:</strong> Can view data and trigger AI reports.</li>
                <li><strong>Viewer:</strong> Can only view reports.</li>
              </ul>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
