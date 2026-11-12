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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-black/95 backdrop-blur-lg border-t border-zinc-800 flex items-center justify-around z-40 px-2">
      {links.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
              isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-[#1ed760]' : ''}`} />
            <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
          </Link>
        );
      })}

      <button
        onClick={onOpenAuthModal}
        className="flex flex-col items-center justify-center flex-1 py-1 text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <User className="w-5 h-5" />
        <span className="text-[10px] font-medium mt-0.5">Tài Khoản</span>
      </button>
    </nav>
  );
}
