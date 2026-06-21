import React from 'react';
import { Dashboard } from './Dashboard';
import { CarbonActivity } from '../types';

interface MemoizedDashboardProps {
  activities: CarbonActivity[];
  totalFootprint: number;
  streak: number;
  greenPoints: number;
  hideTopCard?: boolean;
}

export const MemoizedDashboard = React.memo(
  (props: MemoizedDashboardProps) => <Dashboard {...props} />,
  (prevProps, nextProps) => {
    // Return true if props are equal (skip re-render), false to re-render
    return (
      prevProps.totalFootprint === nextProps.totalFootprint &&
      prevProps.streak === nextProps.streak &&
      prevProps.greenPoints === nextProps.greenPoints &&
      prevProps.activities.length === nextProps.activities.length &&
      prevProps.hideTopCard === nextProps.hideTopCard
    );
  }
);

MemoizedDashboard.displayName = 'MemoizedDashboard';
