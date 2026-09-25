/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Layers, Shield, Sparkles, User as UserIcon, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  user: User | null;
  hasWorkspaceToken: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  activeProjectName: string;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  hasWorkspaceToken,
  onSignIn,
  onSignOut,
  activeProjectName,
}) => {
  return (
    <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-40 px-4 lg:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Project Info */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base tracking-tight">
                  AI Drawing Intelligence
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  CAD / MEP / QS
                </span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="truncate max-w-[280px] font-medium text-slate-300">{activeProjectName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Connection & User Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {/* Workspace Status Tag */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs">
            {hasWorkspaceToken ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-medium">Workspace Active</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-300 font-medium">Chưa kết nối Workspace</span>
              </>
            )}
          </div>

          {/* User Sign In / User Profile */}
          {user && hasWorkspaceToken ? (
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg p-1 pr-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-7 h-7 rounded-full border border-slate-600"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
              )}
              <div className="text-left hidden lg:block">
                <div className="text-xs font-medium text-white truncate max-w-[140px]">
                  {user.displayName || user.email}
                </div>
                <div className="text-[10px] text-slate-400">Google Workspace</div>
              </div>
              <button
                onClick={onSignOut}
                title="Đăng xuất"
                className="ml-2 text-slate-400 hover:text-rose-400 p-1 rounded transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Official Google Sign In Button conforming to workspace skill specifications */
            <button
              onClick={onSignIn}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-800 px-3.5 py-1.5 rounded-lg font-medium text-xs shadow transition active:scale-[0.98] border border-slate-200"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
              <span>Kết nối Google Workspace</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
