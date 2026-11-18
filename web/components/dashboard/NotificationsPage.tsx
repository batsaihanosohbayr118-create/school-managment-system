"use client";

import { Trash2 } from "lucide-react";
import type { Language } from "@/lib/i18n";
import type { ActivityNotification } from "./dashboard-shared";

export function NotificationsPage({
  canDelete,
  language,
  notifications,
  onDelete,
  onMarkAllRead,
  onToggleRead,
  unreadCount
}: {
  canDelete: boolean;
  language: Language;
  notifications: ActivityNotification[];
  onDelete: (id: string) => void;
  onMarkAllRead: () => void;
  onToggleRead: (id: string) => void;
  unreadCount: number;
}) {
  return (
    <section className="notification-page">
      <div className="notification-page-header">
        <div>
          <h2>{language === "mn" ? "Мэдэгдэл" : "Notifications"}</h2>
          <p>{language === "mn" ? `${unreadCount} уншаагүй мэдэгдэл` : `${unreadCount} unread notifications`}</p>
        </div>
        <button disabled={unreadCount === 0} onClick={onMarkAllRead} type="button">
          {language === "mn" ? "Бүгдийг уншсан" : "Mark all read"}
        </button>
      </div>
      {notifications.length > 0 ? (
        <div className="notification-list">
          {notifications.map((item) => (
            <article className="notification-card" data-read={item.read ? "true" : "false"} data-type={item.type} key={item.id}>
              <button className="notification-content" onClick={() => onToggleRead(item.id)} type="button">
                <div>
                  {!item.read ? <span>{language === "mn" ? "Шинэ" : "New"}</span> : null}
                  <strong>{language === "mn" ? item.titleMn : item.titleEn}</strong>
                  <p>{language === "mn" ? item.detailMn : item.detailEn}</p>
                </div>
              </button>
              <time>{item.time}</time>
              {canDelete ? (
                <button
                  aria-label={language === "mn" ? "Мэдэгдэл устгах" : "Delete notification"}
                  className="notification-delete"
                  onClick={() => onDelete(item.id)}
                  type="button"
                >
                  <Trash2 size={15} />
                </button>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="notification-empty">
          <span aria-hidden="true" />
          <strong>{language === "mn" ? "Одоогоор шинэ мэдэгдэл алга" : "No notifications yet"}</strong>
          <p>{language === "mn" ? "Сурагч, багш, төлбөр зэрэг бүртгэл дээр үйлдэл хийхэд энд автоматаар нэмэгдэнэ." : "Student, teacher, payment, and other record actions will appear here automatically."}</p>
        </div>
      )}
    </section>
  );
}
