'use client';

import Link from 'next/link';
import { ArrowLeft, Bell, Clock, Calendar } from 'lucide-react';
import { clsx } from 'clsx';

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-hw-charcoal">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-hw-charcoal/95 backdrop-blur-sm border-b border-hw-surface px-4 py-4">
        <div className="flex items-center gap-4 max-w-2xl mx-auto">
          <Link
            href="/settings"
            className="p-2 -ml-2 text-gray-400 hover:text-white rounded-lg hover:bg-hw-surface transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-white">Notifications</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Practice Reminders Section */}
        <section>
          <h2 className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-3 px-1">
            Practice Reminders
          </h2>
          <div className="bg-hw-surface rounded-xl overflow-hidden divide-y divide-hw-charcoal">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-hw-charcoal flex items-center justify-center">
                  <Bell className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Daily reminders</p>
                  <p className="text-sm text-gray-400">Get reminded to practice</p>
                </div>
              </div>
              <div className={clsx(
                'w-12 h-7 rounded-full p-1 transition-colors cursor-not-allowed opacity-50',
                'bg-gray-600'
              )}>
                <div className="w-5 h-5 rounded-full bg-white shadow transition-transform" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-hw-charcoal flex items-center justify-center">
                  <Clock className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Reminder time</p>
                  <p className="text-sm text-gray-400">7:00 PM</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-hw-charcoal flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Reminder days</p>
                  <p className="text-sm text-gray-400">Every day</p>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 px-1">
            Notification features coming soon
          </p>
        </section>

        {/* Other Notifications */}
        <section>
          <h2 className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-3 px-1">
            Other Notifications
          </h2>
          <div className="bg-hw-surface rounded-xl overflow-hidden divide-y divide-hw-charcoal">
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-white">Sync notifications</p>
                <p className="text-sm text-gray-400">When sync completes or fails</p>
              </div>
              <div className={clsx(
                'w-12 h-7 rounded-full p-1 transition-colors cursor-not-allowed opacity-50',
                'bg-hw-brass'
              )}>
                <div className="w-5 h-5 rounded-full bg-white shadow transition-transform translate-x-5" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-white">Collaboration updates</p>
                <p className="text-sm text-gray-400">When someone shares with you</p>
              </div>
              <div className={clsx(
                'w-12 h-7 rounded-full p-1 transition-colors cursor-not-allowed opacity-50',
                'bg-hw-brass'
              )}>
                <div className="w-5 h-5 rounded-full bg-white shadow transition-transform translate-x-5" />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
