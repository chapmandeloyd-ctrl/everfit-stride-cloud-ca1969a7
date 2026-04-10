export const notificationQueryKeys = {
  dashboardEvents: (clientId: string | null | undefined) =>
    ["dashboard-notification-events", clientId] as const,
  bellNotifications: (clientId: string | null | undefined) =>
    ["notification-bell-items", clientId] as const,
};