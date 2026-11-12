'use client';

import React, { useState } from 'react';
import { useLibrary } from '@/context/LibraryContext';
import { X, Music, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (playlistId: string) => void;
}

const PRESET_COVERS = [
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1520523839898-507127045c47?w=800&auto=format&fit=crop&q=80',
];

export function CreatePlaylistModal({ isOpen, onClose, onSuccess }: CreatePlaylistModalProps) {
  const { createPlaylist } = useLibrary();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState(PRESET_COVERS[0]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newPl = createPlaylist(title.trim(), description.trim(), coverUrl);
    setTitle('');
    setDescription('');
    onClose();
    if (onSuccess) {
      onSuccess(newPl.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-[#282828] text-white rounded-xl shadow-2xl p-6 border border-zinc-700/60"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Music className="w-6 h-6 text-[#1ed760]" />
          Tạo Playlist Mới
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4 items-start">
            <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0 border border-zinc-700">
              <Image src={coverUrl} alt="Cover preview" fill className="object-cover" />
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Tên Playlist *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: My Favorite Songs 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white focus:outline-none focus:border-[#1ed760] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Mô Tả
                </label>
                <textarea
                  rows={2}
                  placeholder="Thêm mô tả cho playlist của bạn..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white focus:outline-none focus:border-[#1ed760] transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
              Chọn Ảnh Bìa Tuyển Chọn
            </label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_COVERS.map((url, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setCoverUrl(url)}
                  className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all ${
                    coverUrl === url ? 'border-[#1ed760] scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <Image src={url} alt={`Preset ${idx}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-700/60">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-full text-sm font-semibold text-white hover:scale-105 transition-transform"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-6 py-2 rounded-full text-sm font-bold bg-[#1ed760] text-black hover:bg-[#1fdf64] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Tạo Playlist
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
