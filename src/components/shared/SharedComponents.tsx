import React from 'react';
import styles from './SharedStyles.module.css';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({ children, className = '' }) => (
  <div className={`${styles.pageContainer} ${className}`}>
    {children}
  </div>
);

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, children }) => (
  <div className={styles.pageHeader}>
    <h2 className="dashboard-title">{title}</h2>
    {children}
  </div>
);

interface StatCardProps {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ value, label, icon, className = '' }) => (
  <div className={`${styles.statCard} ${className}`}>
    {icon && <span className="stat-icon">{icon}</span>}
    <div className={styles.statValue}>{value}</div>
    <div className={styles.statLabel}>{label}</div>
  </div>
);

interface ModalContentProps {
  children: React.ReactNode;
  title: string;
  onClose?: () => void;
}

export const ModalContent: React.FC<ModalContentProps> = ({ children, title, onClose }) => (
  <div className="modal-bg">
    <div className={`${styles.modalContent} ModalContent`}>
      <div className={styles.modalHeader}>
        <h3>{title}</h3>
        {onClose && <button className="btn-outline" onClick={onClose}>Close</button>}
      </div>
      {children}
    </div>
  </div>
);

interface CardGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const CardGrid = React.forwardRef<HTMLDivElement, CardGridProps>(
  ({ children, className = '', ...props }, ref) => (
    <div ref={ref} className={`${styles.cardGrid} ${className}`} {...props}>
      {children}
    </div>
  )
);

CardGrid.displayName = 'CardGrid';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`${styles.card} ${className}`}>
    {children}
  </div>
);

interface GridFormProps {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
}

export const GridForm: React.FC<GridFormProps> = ({ children, onSubmit, className = '' }) => (
  <form className={`${styles.gridForm} ${className}`} onSubmit={onSubmit}>
    {children}
  </form>
);
