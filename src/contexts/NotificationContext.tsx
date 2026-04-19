import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Bell } from "lucide-react";

interface NotificationContextType {
  unreadCount: number;
  showNotificationPanel: boolean;
  setShowNotificationPanel: (v: boolean) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  // No backend notifications API yet — unread count is always 0.
  const unreadCount = 0;
  const markAllAsRead = useCallback(() => {}, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, showNotificationPanel, setShowNotificationPanel, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be inside NotificationProvider");
  return ctx;
}

export function NotificationPanel() {
  const { showNotificationPanel, setShowNotificationPanel } = useNotifications();

  if (!showNotificationPanel) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setShowNotificationPanel(false)} />
      <div className="fixed top-14 right-4 sm:right-8 z-50 w-[calc(100vw-2rem)] sm:w-80 bg-card border border-border rounded-2xl shadow-floating overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12 px-6 gap-3 text-center">
          <Bell className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No notifications yet</p>
          <p className="text-xs text-muted-foreground/60">Real-time notifications are not available in this version.</p>
        </div>
      </div>
    </>
  );
}
