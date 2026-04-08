'use client'
import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <Settings size={48} className="text-gray-600 mb-4" />
      <h1 className="text-xl font-bold text-gray-200 mb-2">Settings</h1>
      <p className="text-gray-500 text-sm">Rental settings management coming soon.</p>
    </div>
  )
}
