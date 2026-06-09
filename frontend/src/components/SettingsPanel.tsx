import { useState } from 'react';
import { SettingsIcon } from 'lucide-react';

export function SettingsPanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col flex-1 bg-white border-l border-gray-200">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
        <h3 className="text-lg font-medium">Settings</h3>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-full bg-gray-200 bg-opacity-50 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Toggle settings"
        >
          <SettingsIcon className="h-4 w-4 text-gray-600" />
        </button>
      </div>
      {isOpen && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Audio & Video</h4>
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 text-sm">
                <input type="checkbox" className="h-4 w-4 text-indigo-600 focus:ring-indigo-500" />
                Enable noise suppression
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input type="checkbox" className="h-4 w-4 text-indigo-600 focus:ring-indigo-500" />
                Enable echo cancellation
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Notifications</h4>
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 text-sm">
                <input type="checkbox" className="h-4 w-4 text-indigo-600 focus:ring-indigo-500" checked />
                Meeting notifications
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input type="checkbox" className="h-4 w-4 text-indigo-600 focus:ring-indigo-500" />
                Chat notifications
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Appearance</h4>
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 text-sm">
                <input type="checkbox" className="h-4 w-4 text-indigo-600 focus:ring-indigo-500" />
                Dark mode
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}