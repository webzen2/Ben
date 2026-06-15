const MAX_ENTRIES = 200;

const activities = [];
const errors = [];

export function logActivity(agent, action, success = true, details = '') {
  const entry = { agent, action, success, details, timestamp: new Date().toISOString() };
  activities.unshift(entry);
  if (activities.length > MAX_ENTRIES) activities.pop();
  if (!success) {
    errors.unshift({ ts: entry.timestamp, level: 'ERROR', message: `[${agent}] ${action}: ${details}` });
    if (errors.length > MAX_ENTRIES) errors.pop();
  }
  return entry;
}

export function logError(message, level = 'ERROR') {
  errors.unshift({ ts: new Date().toISOString(), level, message });
  if (errors.length > MAX_ENTRIES) errors.pop();
}

export function getActivities(limit = 50) {
  return activities.slice(0, limit);
}

export function getErrors(limit = 50) {
  return errors.slice(0, limit);
}
