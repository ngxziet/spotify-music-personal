'use client';

import React from 'react';
import Image from 'next/image';
import { usePwa } from '@/context/PwaContext';
import {
  X,
  Download,
  Smartphone,
  Monitor,
  WifiOff,
  Headphones,
  Share,
  PlusSquare,
  CheckCircle2,
  MoreVertical,
} from 'lucide-react';

export function InstallAppModal() {
  const {
    isInstallModalOpen,
    setIsInstallModalOpen,
    canPromptInstall,
    promptInstall,
    isStandalone,
    isIOS,
    isAndroid,
  } = usePwa();

  if (!isInstallModalOpen) return null;

  const handleInstallClick = async () => {
    await promptInstall();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => setIsInstallModalOpen(false)}
    >
      <div
        className="relative w-full max-w-md bg-[#202020] text-white rounded-2xl shadow-2xl overflow-hidden border border-zinc-700/70"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setIsInstallModalOpen(false)}
          className="absolute top-3 right-3 p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 z-10 transition-colors"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Banner */}
        <div className="p-6 pb-4 bg-gradient-to-b from-emerald-900/50 to-transparent flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-xl border border-white/15 flex-shrink-0 bg-black">
            <Image
              src="/icons/icon-192x192.png"
              alt="SoundWave App Icon"
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#1ed760]/15 text-[#1ed760] text-[10px] font-bold uppercase tracking-wider mb-1">
              <span>PWA • Standalone App</span>
            </div>
            <h2 className="text-xl font-extrabold text-white leading-tight">
              Tải App SoundWave
            </h2>
            <p className="text-xs text-zinc-300 mt-0.5">
              Cài trực tiếp lên thiết bị, dùng như ứng dụng gốc
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 space-y-4">
          {/* Benefits */}
          <div className="grid grid-cols-1 gap-2.5 bg-zinc-900/70 border border-zinc-800 rounded-xl p-3.5 text-xs">
            <div className="flex items-start gap-2.5">
              <Headphones className="w-4 h-4 text-[#1ed760] flex-shrink-0 mt-0.5" />
              <p className="text-zinc-300">
                <strong className="text-white">Cửa sổ riêng không thanh trình duyệt:</strong> Mở nhanh từ màn hình chính hoặc Desktop.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <WifiOff className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-zinc-300">
                <strong className="text-white">Hoạt động ngoại tuyến (Offline):</strong> Phát lại bài hát đã tải và file MP3 cá nhân khi mất mạng.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <Smartphone className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <p className="text-zinc-300">
                <strong className="text-white">Nhẹ & Tức thì:</strong> Không cần tải file nặng, tự động cập nhật phiên bản mới.
              </p>
            </div>
          </div>

          {isStandalone ? (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#1ed760]" />
              <span>Bạn đang sử dụng SoundWave ở chế độ Ứng dụng đã cài đặt!</span>
            </div>
          ) : canPromptInstall ? (
            <div className="space-y-2">
              <button
                onClick={handleInstallClick}
                className="w-full py-3 px-5 rounded-full bg-[#1ed760] hover:bg-[#1fdf64] text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Download className="w-5 h-5" />
                <span>Cài Đặt SoundWave Về Máy</span>
              </button>
              <p className="text-[11px] text-center text-zinc-400">
                Hỗ trợ Windows, macOS, Android (Chrome / Edge)
              </p>
            </div>
          ) : isIOS ? (
            <div className="space-y-2.5 bg-zinc-800/70 border border-zinc-700 rounded-xl p-4 text-xs">
              <p className="font-bold text-white flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-[#1ed760]" />
                Hướng dẫn cài đặt trên iPhone / iPad (Safari):
              </p>
              <ol className="space-y-2 text-zinc-300 list-decimal list-inside">
                <li className="flex items-center gap-1.5 flex-wrap">
                  <span>1. Nhấn nút</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-700 text-white font-semibold">
                    <Share className="w-3.5 h-3.5 text-blue-400" /> Chia sẻ
                  </span>
                  <span>ở thanh dưới trình duyệt Safari.</span>
                </li>
                <li className="flex items-center gap-1.5 flex-wrap">
                  <span>2. Cuộn xuống chọn</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-700 text-white font-semibold">
                    <PlusSquare className="w-3.5 h-3.5 text-[#1ed760]" /> Thêm vào MH chính
                  </span>
                </li>
                <li>3. Nhấn <strong>Thêm (Add)</strong> ở góc trên bên phải để hoàn tất.</li>
              </ol>
            </div>
          ) : (
            <div className="space-y-2.5 bg-zinc-800/70 border border-zinc-700 rounded-xl p-4 text-xs">
              <p className="font-bold text-white flex items-center gap-1.5">
                {isAndroid ? (
                  <Smartphone className="w-4 h-4 text-[#1ed760]" />
                ) : (
                  <Monitor className="w-4 h-4 text-[#1ed760]" />
                )}
                {isAndroid
                  ? 'Hướng dẫn cài đặt trên Android:'
                  : 'Hướng dẫn cài đặt trên Máy tính (Chrome / Edge):'}
              </p>
              {isAndroid ? (
                <ol className="space-y-1.5 text-zinc-300">
                  <li className="flex items-center gap-1.5 flex-wrap">
                    <span>1. Nhấn nút</span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-700 text-white font-semibold">
                      <MoreVertical className="w-3.5 h-3.5" /> Menu
                    </span>
                    <span>ở góc trên bên phải trình duyệt.</span>
                  </li>
                  <li>
                    2. Chọn <strong>&quot;Cài đặt ứng dụng&quot;</strong> hoặc <strong>&quot;Thêm vào màn hình chính&quot;</strong>.
                  </li>
                </ol>
              ) : (
                <ol className="space-y-1.5 text-zinc-300">
                  <li>
                    1. Nhấn biểu tượng <strong>Cài đặt (Install)</strong> ở góc phải thanh địa chỉ URL, hoặc mở Menu <strong>(⋮)</strong>.
                  </li>
                  <li>
                    2. Chọn <strong>&quot;Cài đặt SoundWave...&quot;</strong> (Install SoundWave) để tạo shortcut ứng dụng trên Desktop.
                  </li>
                </ol>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
