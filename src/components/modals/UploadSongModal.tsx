'use client';

import React, { useState, useRef } from 'react';
import { useLibrary } from '@/context/LibraryContext';
import { useAudio } from '@/context/AudioContext';
import { X, UploadCloud, FileAudio, CheckCircle2 } from 'lucide-react';

interface UploadSongModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadSongModal({ isOpen, onClose }: UploadSongModalProps) {
  const { handleUploadSong } = useLibrary();
  const { playSong } = useAudio();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-extract title from file name
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      if (cleanName.includes('-')) {
        const parts = cleanName.split('-');
        setArtist(parts[0].trim());
        setTitle(parts.slice(1).join('-').trim());
      } else {
        setTitle(cleanName);
        setArtist('Nghệ sĩ của tôi');
      }
      setAlbum('Nhạc Tải Lên');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setSelectedFile(file);
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      setTitle(cleanName);
      setArtist('Nghệ sĩ của tôi');
      setAlbum('Nhạc Tải Lên');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    const newSong = await handleUploadSong(selectedFile, title, artist, album);
    setIsUploading(false);

    if (newSong) {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        // Prompt play
        playSong(newSong);
      }, 1200);
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

        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <UploadCloud className="w-6 h-6 text-[#1ed760]" />
          Tải Nhạc Của Bạn Lên
        </h2>
        <p className="text-xs text-zinc-400 mb-6">
          File nhạc MP3 của bạn sẽ được lưu trực tiếp vào cơ sở dữ liệu trình duyệt (IndexedDB), giúp bạn nghe offline mọi lúc mà không tốn dung lượng máy chủ.
        </p>

        {isSuccess ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <CheckCircle2 className="w-16 h-16 text-[#1ed760] animate-bounce" />
            <h3 className="text-lg font-bold text-white">Tải Lên Thành Công!</h3>
            <p className="text-xs text-zinc-400">Đang khởi chạy bài hát của bạn...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
              className="hidden"
              onChange={handleFileChange}
            />

            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-zinc-600 hover:border-[#1ed760] rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-zinc-800/40 hover:bg-zinc-800/80 group"
              >
                <div className="p-4 rounded-full bg-zinc-700 group-hover:bg-[#1ed760]/20 mb-3 transition-colors">
                  <FileAudio className="w-8 h-8 text-zinc-300 group-hover:text-[#1ed760]" />
                </div>
                <p className="text-sm font-semibold text-zinc-200 mb-1">
                  Nhấn để chọn file nhạc hoặc kéo thả vào đây
                </p>
                <p className="text-xs text-zinc-400">
                  Hỗ trợ MP3, WAV, AAC, M4A, FLAC
                </p>
              </div>
            ) : (
              <div className="p-4 bg-zinc-800/70 border border-zinc-700 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2.5 rounded-lg bg-[#1ed760]/20 text-[#1ed760]">
                    <FileAudio className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{selectedFile.name}</p>
                    <p className="text-xs text-zinc-400">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 transition-colors"
                >
                  Đổi file
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Tên Bài Hát *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tên bài hát"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white focus:outline-none focus:border-[#1ed760]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Nghệ Sĩ
                </label>
                <input
                  type="text"
                  placeholder="Nhập tên ca sĩ / nhóm nhạc"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white focus:outline-none focus:border-[#1ed760]"
                />
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
                disabled={!selectedFile || isUploading}
                className="px-6 py-2 rounded-full text-sm font-bold bg-[#1ed760] text-black hover:bg-[#1fdf64] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUploading ? 'Đang lưu vào máy...' : 'Tải Lên & Nghe Ngay'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
