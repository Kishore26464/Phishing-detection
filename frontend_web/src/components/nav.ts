export interface NavItem {
  label: string;
  path: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: 'dashboard' },
  { label: 'Scan URL', path: '/scan/url', icon: 'link' },
  { label: 'Scan SMS', path: '/scan/sms', icon: 'sms' },
  { label: 'Scan QR', path: '/scan/qr', icon: 'qr_code' },
  { label: 'Bulk Scan', path: '/scan/bulk', icon: 'layers' },
  { label: 'History', path: '/history', icon: 'history' },
  { label: 'Analytics', path: '/analytics', icon: 'monitoring' },
  { label: 'Report', path: '/report', icon: 'description' },
];

export const MOBILE_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: 'dashboard' },
  { label: 'History', path: '/history', icon: 'history' },
  { label: 'Report', path: '/report', icon: 'description' },
  { label: 'Settings', path: '/settings', icon: 'settings' },
];
