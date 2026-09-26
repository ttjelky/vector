import React from "react";
import {
  X, Tag, Bell, User, Trophy, Layers,
  FileText, ClipboardList, Star, Users,
} from "lucide-react";
import home from "../styles/dashboardHome.module.css";

// Іконка за ключовими словами теми/тексту (у сповіщень немає поля type)
function iconFor(n) {
  const s = `${n.subject || ""} ${n.text || ""}`.toLowerCase();
  if (s.includes("оцін"))      return { Icon: Star,          bg: "#fef9c3", color: "#a16207" };
  if (s.includes("учасник"))   return { Icon: User,          bg: "#e5f1fd", color: "#0071e3" };
  if (s.includes("команд"))    return { Icon: Users,         bg: "#ccfbf1", color: "#0f766e" };
  if (s.includes("турнір"))    return { Icon: Trophy,        bg: "#fef3c7", color: "#b45309" };
  if (s.includes("раунд"))     return { Icon: Layers,        bg: "#ede9fe", color: "#6d28d9" };
  if (s.includes("реєстрац"))  return { Icon: ClipboardList, bg: "#ffedd5", color: "#c2410c" };
  if (s.includes("здача") || s.includes("робот"))
    return { Icon: FileText, bg: "#dcfce7", color: "#15803d" };
  return { Icon: Bell, bg: "#ececf1", color: "#6e6e73" };
}

const NotifCard = ({ n, onRead, onDismiss }) => {
  const { Icon, bg, color } = iconFor(n);
  return (
    <div
      className={home.notifCard}
      onClick={() => !n.is_read && onRead(n.id)}
    >
      <button
        type="button"
        className={home.notifDismiss}
        aria-label="Прибрати сповіщення"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(n.id);
          e.currentTarget.blur();
        }}
      >
        <X size={14} strokeWidth={2} />
      </button>
      <div className={home.notifTop}>
        <span className={home.notifIcon} style={{ background: bg, color }}>
          <Icon size={20} strokeWidth={1.8} />
        </span>
        <div className={home.notifTitle}>
          {!n.is_read && <span className={home.notifDot} />}
          {n.subject || "Сповіщення"}
        </div>
      </div>
      <div className={home.notifText}>{n.text}</div>
      {n.tournament && (
        <span className={home.notifChip} title={n.tournament}>
          <Tag size={13} strokeWidth={2} />
          {n.tournament}
        </span>
      )}
    </div>
  );
};

export { NotifCard };
