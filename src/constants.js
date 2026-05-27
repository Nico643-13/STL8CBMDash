export const DEFAULT_TOTAL_SENSORS = 2887;

export const PRIMARY_ADMIN_EMAIL = 'nicopre@amazon.com';

export const REPORT_DOC_PATH = [
  'dashboards',
  'currentShiftReport',
];

export const USER_ROLES = {
  ADMIN: 'Admin',
  VIEWER: 'Viewer',
};

export const severityOrder = {
  Critical: 0,
  High: 1,
  Standard: 2,
  'Hardware Issue': 3,
};

export const categories = [
  {
    name: 'Critical',
    color: 'bg-red-600',
    chartColor: '#dc2626',
  },
  {
    name: 'High',
    color: 'bg-orange-500',
    chartColor: '#f97316',
  },
  {
    name: 'Standard',
    color: 'bg-yellow-500',
    chartColor: '#eab308',
  },
  {
    name: 'Hardware Issue',
    color: 'bg-blue-500',
    chartColor: '#2563eb',
  },
];

export const activeAlarmCategories =
  categories.filter(
    (category) => category.name !== 'Hardware Issue'
  );

export const hardwareIssueTypes = [
  'Replace Sensor',
  'Replace Node',
  'Replace Batteries',
  'Node Reboot',
  'Port Swap',
  'Port Reseat',
  'Detached Sensor',
];

export const issueOptions = [
  'Increasing Temperature',
  'Increasing Vibration',
  'Increasing Velocity',
  'Increasing Acceleration',
  'Node Reboot',
  'Replace Batteries',
  'Port Swap',
  'Port Reseat',
  'Replace Sensor',
  'Replace Node',
  'Detached Sensor',
  'Belt Catenary',
  'Pin Drift',
];

export const createDeepDiveTemplate = () => ({
  location: '',
  thermographicNotes: '',
  vibrationNotes: '',
  trend: 'Stable',
  images: [],
});
