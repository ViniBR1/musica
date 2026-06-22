'use client';

import { ReactNode } from 'react';

interface ResponsiveLayoutProps {
  children: ReactNode;
  maxWidth?: string;
  padding?: string;
}

export default function ResponsiveLayout({ 
  children, 
  maxWidth = '1200px',
  padding = '16px'
}: ResponsiveLayoutProps) {
  return (
    <div
      style={{
        maxWidth,
        margin: '0 auto',
        padding,
        width: '100%',
        minHeight: '100vh',
      }}
    >
      {children}
    </div>
  );
}