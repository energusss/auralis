import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { X, Music2 } from "lucide-react";
import { useTranslation } from "react-i18next";
export function IconButton({
  label,
  children,
  onClick,
  active,
  disabled = false,
  className = "",
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`icon-button ${active ? "active" : ""} ${className}`}
    >
      {children}
    </button>
  );
}
export function Artwork({
  src,
  title,
  className = "",
}: {
  src?: string;
  title: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? (
    <img
      className={`artwork ${className}`}
      src={src}
      alt={title}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <div className={`artwork fallback ${className}`}>
      <Music2 size={40} />
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.section
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="modal glass"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Tab") {
            const els = Array.from(
              e.currentTarget.querySelectorAll<HTMLElement>(
                "button,input,select,textarea,a[href]",
              ),
            ).filter((x) => !x.hasAttribute("disabled"));
            const first = els[0],
              last = els.at(-1);
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <header>
          <h2>{title}</h2>
          <IconButton label={t("close")} onClick={onClose}>
            <X />
          </IconButton>
        </header>
        {children}
      </motion.section>
    </div>
  );
}
export const time = (seconds: number) =>
  `${Math.floor((seconds || 0) / 60)}:${String(Math.floor((seconds || 0) % 60)).padStart(2, "0")}`;
export function Empty({ children }: { children?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="empty">
      <Music2 size={40} />
      <h3>{t("empty")}</h3>
      <p>{children || t("emptyHint")}</p>
    </div>
  );
}
export function Skeleton() {
  return (
    <div className="cards">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}
