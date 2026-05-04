/**
 * IssueBadge Component
 * Displays a colored badge for issue types
 */
import React from 'react';
import { Bug, AlertTriangle, Lightbulb, ShieldAlert, Zap } from 'lucide-react';
import { getIssueTypeStyle } from '../utils/issues';

const iconMap = {
  bug: Bug,
  warning: AlertTriangle,
  suggestion: Lightbulb,
  security: ShieldAlert,
  performance: Zap,
};

const IssueBadge = ({ type, size = 'sm' }) => {
  const style = getIssueTypeStyle(type);
  const Icon = iconMap[type] || Lightbulb;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border font-medium ${style.color} ${sizeClasses[size]}`}
    >
      <Icon className="w-3 h-3" />
      {style.label}
    </span>
  );
};

export default IssueBadge;
