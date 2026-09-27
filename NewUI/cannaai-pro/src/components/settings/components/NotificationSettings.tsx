import React from 'react';
import { Bell, Volume2, Smartphone, Mail } from 'lucide-react';
import SettingToggle from './SettingToggle';
import { SettingsCard, SettingRow } from './SettingsPrimitives';
import { useSettingsStore } from '../store';

const NotificationSettings: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const notifications = settings?.notifications;
  const updateNotificationSettings = (updates: Partial<NonNullable<typeof notifications>>) => {
    if (notifications) updateSettings({ notifications: { ...notifications, ...updates } });
  };

  const channels = [
    {
      icon: Bell,
      title: 'Enable Notifications',
      description: 'Receive system alerts and updates',
      checked: notifications?.enabled ?? true,
      onChange: (enabled: boolean) => updateNotificationSettings({ enabled }),
    },
    {
      icon: Volume2,
      title: 'Sound Notifications',
      description: 'Play sound for important alerts',
      checked: notifications?.sound ?? false,
      onChange: (sound: boolean) => updateNotificationSettings({ sound }),
    },
    {
      icon: Smartphone,
      title: 'Desktop Notifications',
      description: 'Show desktop notifications',
      checked: notifications?.desktop ?? true,
      onChange: (desktop: boolean) => updateNotificationSettings({ desktop }),
    },
    {
      icon: Mail,
      title: 'Email Notifications',
      description: 'Receive alerts via email',
      checked: notifications?.email ?? false,
      onChange: (email: boolean) => updateNotificationSettings({ email }),
    },
  ];

  const types = [
    { name: 'System Alerts', description: 'Critical system notifications', enabled: true },
    { name: 'Analysis Complete', description: 'When plant analysis finishes', enabled: true },
    { name: 'Automation Triggered', description: 'Automation system actions', enabled: false },
    { name: 'Data Updates', description: 'New sensor data available', enabled: false },
  ];

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Bell}
        title="Notifications"
        subtitle="Configure how and when you receive notifications from CannaAI Pro"
      >
        <div className="space-y-3">
          {channels.map((c) => (
            <SettingRow
              key={c.title}
              icon={c.icon}
              title={c.title}
              description={c.description}
              control={<SettingToggle label={c.title} checked={c.checked} onCheckedChange={c.onChange} />}
            />
          ))}
        </div>
      </SettingsCard>

      <SettingsCard
        icon={Mail}
        title="Notification Types"
        subtitle="Pick which events deserve your attention"
      >
        <div className="space-y-3">
          {types.map((type) => (
            <SettingRow
              key={type.name}
              title={type.name}
              description={type.description}
              control={
                <SettingToggle
                  label={type.name}
                  checked={notifications?.notificationTypes?.find((item) => item.name === type.name)?.enabled ?? type.enabled}
                  onCheckedChange={(enabled) =>
                    updateNotificationSettings({
                      notificationTypes: (notifications?.notificationTypes || []).map((item) =>
                        item.name === type.name ? { ...item, enabled } : item
                      ),
                    })
                  }
                />
              }
            />
          ))}
        </div>
      </SettingsCard>
    </div>
  );
};

export default NotificationSettings;
