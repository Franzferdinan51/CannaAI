import React from 'react';
import { Bell, Volume2, VolumeX, Mail, Smartphone } from 'lucide-react';
import SettingToggle from './SettingToggle';
import { useSettingsStore } from '../store';

const NotificationSettings: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const notifications = settings?.notifications;
  const updateNotificationSettings = (updates: Partial<NonNullable<typeof notifications>>) => {
    if (notifications) updateSettings({ notifications: { ...notifications, ...updates } });
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-emerald-400" />
          Notification Settings
        </h2>
        <p className="text-gray-400 mb-6">
          Configure how and when you receive notifications from CannaAI Pro
        </p>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-400" />
              <div>
                <h3 className="font-medium text-white">Enable Notifications</h3>
                <p className="text-sm text-gray-400">Receive system alerts and updates</p>
              </div>
            </div>
            <SettingToggle label="Enable Notifications" checked={notifications?.enabled ?? true} onCheckedChange={(enabled) => updateNotificationSettings({ enabled })} />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-gray-400" />
              <div>
                <h3 className="font-medium text-white">Sound Notifications</h3>
                <p className="text-sm text-gray-400">Play sound for important alerts</p>
              </div>
            </div>
            <SettingToggle label="Sound Notifications" checked={notifications?.sound ?? false} onCheckedChange={(sound) => updateNotificationSettings({ sound })} />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-gray-400" />
              <div>
                <h3 className="font-medium text-white">Desktop Notifications</h3>
                <p className="text-sm text-gray-400">Show desktop notifications</p>
              </div>
            </div>
            <SettingToggle label="Desktop Notifications" checked={notifications?.desktop ?? true} onCheckedChange={(desktop) => updateNotificationSettings({ desktop })} />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <h3 className="font-medium text-white">Email Notifications</h3>
                <p className="text-sm text-gray-400">Receive alerts via email</p>
              </div>
            </div>
            <SettingToggle label="Email Notifications" checked={notifications?.email ?? false} onCheckedChange={(email) => updateNotificationSettings({ email })} />
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Notification Types</h3>
        <div className="space-y-4">
          {[
            { name: 'System Alerts', description: 'Critical system notifications', enabled: true },
            { name: 'Analysis Complete', description: 'When plant analysis finishes', enabled: true },
            { name: 'Automation Triggered', description: 'Automation system actions', enabled: false },
            { name: 'Data Updates', description: 'New sensor data available', enabled: false },
          ].map((type, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
              <div>
                <h4 className="font-medium text-white">{type.name}</h4>
                <p className="text-sm text-gray-400">{type.description}</p>
              </div>
              <SettingToggle
                label={type.name}
                checked={notifications?.notificationTypes?.find((item) => item.name === type.name)?.enabled ?? type.enabled}
                onCheckedChange={(enabled) => updateNotificationSettings({
                  notificationTypes: (notifications?.notificationTypes || []).map((item) => item.name === type.name ? { ...item, enabled } : item)
                })}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
