'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Library, Heart, User } from 'lucide-react';

interface MobileNavigationProps {
  onOpenAuthModal: () => void;
}

export function MobileNavigation({ onOpenAuthModal }: MobileNavigationProps) {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Trang Chủ', icon: Home },
    { href: '/search', label: 'Tìm Kiếm', icon: Search },
    { href: '/library', label: 'Thư Viện', icon: Library },
    { href: '/liked', label: 'Yêu Thích', icon: Heart },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[calc(3.5rem+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] bg-black/90 backdrop-blur-xl border-t border-zinc-800/80 flex items-center justify-around z-40 px-1 pl-[max(0.25rem,env(safe-area-inset-left,0px))] pr-[max(0.25rem,env(safe-area-inset-right,0px))] transition-all">
      {links.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 active:scale-95 transition-all select-none ${
              isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Icon className={`w-5 h-5 transition-transform ${isActive ? 'text-[#1ed760] scale-110' : ''}`} />
            <span className={`text-[10px] font-medium mt-0.5 ${isActive ? 'text-[#1ed760] font-bold' : ''}`}>
              {item.label}
            </span>
          </Link>
        );
      })}

      <button
        onClick={onOpenAuthModal}
        className="flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 text-zinc-400 hover:text-zinc-200 active:scale-95 transition-all select-none"
        aria-label="Tài khoản cá nhân"
      >
        <User className="w-5 h-5" />
        <span className="text-[10px] font-medium mt-0.5">Tài Khoản</span>
      </button>
    </nav>
  );
}
