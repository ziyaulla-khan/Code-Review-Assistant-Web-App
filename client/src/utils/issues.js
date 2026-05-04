/**
 * Issue type utilities
 * Color coding and icons for different issue types
 */
export const ISSUE_TYPES = {
  bug: {
    label: 'Bug',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: 'bug',
  },
  warning: {
    label: 'Warning',
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    icon: 'alert-triangle',
  },
  suggestion: {
    label: 'Suggestion',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: 'lightbulb',
  },
  security: {
    label: 'Security',
    color: 'bg-red-600/20 text-red-500 border-red-600/30',
    icon: 'shield-alert',
  },
  performance: {
    label: 'Performance',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    icon: 'zap',
  },
};

export const getIssueTypeStyle = (type) => {
  return ISSUE_TYPES[type] || ISSUE_TYPES.suggestion;
};
