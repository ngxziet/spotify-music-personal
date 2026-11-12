'use client';

import React, { useState, useEffect } from 'react';
import { useAudio } from '@/context/AudioContext';
import { X, Clock, Check } from 'lucide-react';

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SleepTimerModal({ isOpen, onClose }: SleepTimerModalProps) {
  const { pauseSong } = useAudio();
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          pauseSong();
          setSelectedMinutes(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, pauseSong]);

  if (!isOpen) return null;

  const handleSelectTime = (minutes: number | null) => {
    setSelectedMinutes(minutes);
    if (minutes === null) {
      setTimeLeft(null);
    } else {
      setTimeLeft(minutes * 60);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const options = [
    { label: 'Tắt hẹn giờ', value: null },
    { label: '15 phút', value: 15 },
    { label: '30 phút', value: 30 },
    { label: '45 phút', value: 45 },
    { label: '60 phút (1 tiếng)', value: 60 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-sm bg-[#282828] text-white rounded-xl shadow-2xl p-6 border border-zinc-700/60"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#1ed760]" />
          Hẹn Giờ Tắt Nhạc
        </h3>
        <p className="text-xs text-zinc-400 mb-5">
          Tự động tạm dừng phát nhạc khi bạn ngủ hoặc làm việc.
        </p>

        {timeLeft !== null && (
          <div className="p-3 mb-4 rounded-lg bg-[#1ed760]/10 border border-[#1ed760]/30 text-center">
            <span className="text-xs text-zinc-300">Thời gian còn lại: </span>
            <span className="font-mono font-bold text-lg text-[#1ed760]">
              {formatTimer(timeLeft)}
            </span>
          </div>
        )}

        <div className="space-y-2">
          {options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => handleSelectTime(opt.value)}
              className={`w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-all ${
                selectedMinutes === opt.value
                  ? 'bg-[#1ed760] text-black font-bold'
                  : 'bg-zinc-800/60 hover:bg-zinc-800 text-zinc-200'
              }`}
            >
              <span>{opt.label}</span>
              {selectedMinutes === opt.value && <Check className="w-4 h-4 stroke-[3]" />}
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full text-xs font-semibold bg-zinc-700 hover:bg-zinc-600 text-white"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
