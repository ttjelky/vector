import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, BellOff } from 'lucide-react';
import styles from './NotificationStack.module.css';

const MotionCard = motion.div;

// Порт beui NotificationStack (MIT) на CSS-модулі:
// компактний стек карток, що пружиною розгортається в список
// по ховеру, фокусу або тапу. Без Tailwind-залежностей.
const STACK_PEEK = 8;
const STACK_INSET = 12;

export function NotificationStack({
  items = [],
  renderItem,
  onItemClick,
  onViewAll,
  getItemClassName,
  maxPreview = 3,
  collapsedLabel = 'Сповіщення',
  expandedLabel = 'Прочитати всі',
  emptyLabel = 'Сповіщень поки немає',
}) {
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef(null);
  const reduce = useReducedMotion();

  // Тап поза стеком згортає його назад
  useEffect(() => {
    if (!expanded) return;
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setExpanded(false);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [expanded]);

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <BellOff size={32} strokeWidth={1.5} aria-hidden="true" />
        <p>{emptyLabel}</p>
      </div>
    );
  }

  const preview = items.slice(0, Math.max(1, maxPreview));
  const shown = expanded ? items : preview;
  const transition = reduce ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] };

  return (
    <div
      ref={rootRef}
      className={styles.stack}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setExpanded(true); }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setExpanded(false); }}
      onFocus={() => setExpanded(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setExpanded(false); }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          setExpanded(false);
        }
      }}
      onClick={() => { if (!expanded) setExpanded(true); }}
    >
      <div className={styles.cards}>
        {shown.map((item, index) => {
          const isPrimary = index === 0;
          return (
            <MotionCard
              key={item.id ?? index}
              layout={reduce ? false : 'position'}
              initial={false}
              animate={{
                y: expanded ? 0 : index * STACK_PEEK,
                clipPath: expanded
                  ? 'inset(0px 0px round 16px)'
                  : `inset(0px ${index * STACK_INSET}px round 16px)`,
              }}
              transition={transition}
              className={[
                styles.card,
                (!isPrimary && !expanded) ? styles.cardHidden : '',
                getItemClassName ? getItemClassName(item) : '',
              ].filter(Boolean).join(' ')}
              style={{
                zIndex: shown.length - index,
                gridColumn: 1,
                gridRow: expanded ? index + 1 : 1,
              }}
              onClick={(e) => { e.stopPropagation(); onItemClick?.(item); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onItemClick?.(item);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={typeof item.ariaLabel === 'string' ? item.ariaLabel : undefined}
            >
              {renderItem(item)}
            </MotionCard>
          );
        })}
      </div>
      <div className={styles.footer}>
        <span className={styles.count} aria-hidden="true">{items.length}</span>
        {expanded && onViewAll ? (
          <button
            type="button"
            className={styles.viewAll}
            onClick={(e) => { e.stopPropagation(); onViewAll(); }}
          >
            {expandedLabel} <ArrowUpRight size={16} aria-hidden="true" />
          </button>
        ) : (
          <span className={styles.collapsedLabel}>{collapsedLabel}</span>
        )}
      </div>
    </div>
  );
}
