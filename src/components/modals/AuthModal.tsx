'use client';

import React, { useState } from 'react';
import { useLibrary } from '@/context/LibraryContext';
import { X, User, UserPlus, Check, Download, Upload, ShieldCheck } from 'lucide-react';
import Image from 'next/image';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
];

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const {
    currentUser,
    registeredUsers,
    switchUser,
    registerUser,
    updateUserProfile,
    exportBackupData,
    importBackupData,
  } = useLibrary();

  const [tab, setTab] = useState<'profile' | 'switch' | 'register' | 'backup'>('profile');
  const [name, setName] = useState(currentUser.name);
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatar, setAvatar] = useState(currentUser.avatar);

  // New user form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAvatar, setNewAvatar] = useState(AVATAR_PRESETS[1]);

  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({ name, bio, avatar });
    onClose();
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    registerUser(newName.trim(), newEmail.trim(), newAvatar);
    setNewName('');
    setNewEmail('');
    setTab('profile');
  };

  const handleExport = () => {
    const jsonStr = exportBackupData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spotify_clone_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const ok = importBackupData(text);
        if (ok) {
          setImportStatus('Khôi phục dữ liệu thành công!');
          setTimeout(() => setImportStatus(null), 3000);
        } else {
          setImportStatus('Lỗi: File JSON không đúng định dạng!');
        }
      } catch {
        setImportStatus('Lỗi: Không thể đọc file dữ liệu!');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-[#282828] text-white rounded-xl shadow-2xl overflow-hidden border border-zinc-700/60"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab Header */}
        <div className="flex border-b border-zinc-700 bg-zinc-900/60 px-4 pt-4">
          <button
            onClick={() => setTab('profile')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors ${
              tab === 'profile'
                ? 'bg-[#282828] text-[#1ed760] border-t-2 border-[#1ed760]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Hồ Sơ
          </button>
          <button
            onClick={() => setTab('switch')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors ${
              tab === 'switch'
                ? 'bg-[#282828] text-[#1ed760] border-t-2 border-[#1ed760]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Tài Khoản ({registeredUsers.length})
          </button>
          <button
            onClick={() => setTab('register')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors ${
              tab === 'register'
                ? 'bg-[#282828] text-[#1ed760] border-t-2 border-[#1ed760]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Tạo Mới
          </button>
          <button
            onClick={() => setTab('backup')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors ${
              tab === 'backup'
                ? 'bg-[#282828] text-[#1ed760] border-t-2 border-[#1ed760]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Sao Lưu
          </button>
        </div>

        <div className="p-6">
          {/* TAB 1: Profile View & Edit */}
          {tab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[#1ed760] shadow-lg flex-shrink-0">
                  <Image src={avatar} alt="Avatar" fill className="object-cover" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    {currentUser.name}
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[#1ed760]/20 text-[#1ed760] border border-[#1ed760]/40 flex items-center gap-1 font-normal">
                      <ShieldCheck className="w-3 h-3" />
                      {currentUser.plan}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">{currentUser.email}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Chọn Avatar
                </label>
                <div className="flex gap-2">
                  {AVATAR_PRESETS.map((url, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setAvatar(url)}
                      className={`relative w-10 h-10 rounded-full overflow-hidden border-2 transition-all ${
                        avatar === url ? 'border-[#1ed760] scale-110' : 'border-transparent opacity-60'
                      }`}
                    >
                      <Image src={url} alt={`Avatar ${idx}`} fill className="object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Tên hiển thị
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white focus:outline-none focus:border-[#1ed760]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Tiểu sử (Bio)
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white focus:outline-none focus:border-[#1ed760] resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="submit"
                  className="px-6 py-2 rounded-full text-sm font-bold bg-[#1ed760] text-black hover:bg-[#1fdf64] transition-all"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Switch User */}
          {tab === 'switch' && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400 mb-2">
                Chọn tài khoản bạn muốn chuyển đổi:
              </p>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {registeredUsers.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => {
                      switchUser(u.id);
                      onClose();
                    }}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                      currentUser.id === u.id
                        ? 'bg-[#1ed760]/15 border border-[#1ed760]/50'
                        : 'bg-zinc-800/60 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-full overflow-hidden border border-zinc-700">
                        <Image src={u.avatar} alt={u.name} fill className="object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{u.name}</p>
                        <p className="text-xs text-zinc-400">{u.email}</p>
                      </div>
                    </div>
                    {currentUser.id === u.id && (
                      <span className="flex items-center gap-1 text-xs text-[#1ed760] font-bold">
                        <Check className="w-4 h-4" /> Đang dùng
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Register New User */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#1ed760]" />
                Tạo Tài Khoản Mới
              </h3>
              <p className="text-xs text-zinc-400">
                Tạo một profile nghe nhạc độc lập để lưu danh sách phát và album yêu thích riêng.
              </p>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Tên người dùng *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Alex Music"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white focus:outline-none focus:border-[#1ed760]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="alex@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white focus:outline-none focus:border-[#1ed760]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Chọn Avatar
                </label>
                <div className="flex gap-2">
                  {AVATAR_PRESETS.map((url, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setNewAvatar(url)}
                      className={`relative w-10 h-10 rounded-full overflow-hidden border-2 transition-all ${
                        newAvatar === url ? 'border-[#1ed760] scale-110' : 'border-transparent opacity-60'
                      }`}
                    >
                      <Image src={url} alt={`Avatar ${idx}`} fill className="object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={!newName.trim()}
                  className="px-6 py-2 rounded-full text-sm font-bold bg-[#1ed760] text-black hover:bg-[#1fdf64] transition-all disabled:opacity-50"
                >
                  Tạo Tài Khoản
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: Backup / Export / Import */}
          {tab === 'backup' && (
            <div className="space-y-4">
              <h3 className="font-bold text-base text-white">Sao Lưu & Khôi Phục Dữ Liệu</h3>
              <p className="text-xs text-zinc-400">
                Xuất toàn bộ danh sách bài hát yêu thích, playlist cá nhân và lịch sử nghe nhạc dưới dạng file JSON để chuyển sang máy khác.
              </p>

              {importStatus && (
                <div className="p-2.5 rounded bg-emerald-500/20 text-emerald-300 text-xs border border-emerald-500/30">
                  {importStatus}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleExport}
                  className="p-4 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 flex flex-col items-center justify-center gap-2 group transition-all"
                >
                  <Download className="w-6 h-6 text-[#1ed760] group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white">Xuất File JSON</span>
                  <span className="text-[10px] text-zinc-400">Tải về dữ liệu của bạn</span>
                </button>

                <label className="p-4 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 flex flex-col items-center justify-center gap-2 group transition-all cursor-pointer">
                  <Upload className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-white">Khôi Phục JSON</span>
                  <span className="text-[10px] text-zinc-400">Chọn file backup</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handleImportFile}
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
