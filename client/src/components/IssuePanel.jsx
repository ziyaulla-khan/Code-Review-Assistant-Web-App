/**
 * IssuePanel Component
 * Sidebar panel showing all review issues with filtering
 */
import React, { useState } from 'react';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import IssueBadge from './IssueBadge';

const IssuePanel = ({ issues, onClose, onApplyFix, onNavigateToLine }) => {
  const [filter, setFilter] = useState('all');
  const [expandedIssue, setExpandedIssue] = useState(null);

  const filteredIssues =
    filter === 'all' ? issues : issues.filter((i) => i.type === filter);

  const issueCounts = {
    all: issues.length,
    bug: issues.filter((i) => i.type === 'bug').length,
    warning: issues.filter((i) => i.type === 'warning').length,
    suggestion: issues.filter((i) => i.type === 'suggestion').length,
    security: issues.filter((i) => i.type === 'security').length,
    performance: issues.filter((i) => i.type === 'performance').length,
  };

  const filterButtons = [
    { key: 'all', label: `All (${issueCounts.all})` },
    { key: 'bug', label: `Bugs (${issueCounts.bug})` },
    { key: 'security', label: `Security (${issueCounts.security})` },
    { key: 'warning', label: `Warnings (${issueCounts.warning})` },
    { key: 'performance', label: `Perf (${issueCounts.performance})` },
    { key: 'suggestion', label: `Suggestions (${issueCounts.suggestion})` },
  ];

  return (
    <div className="flex flex-col h-full bg-panel-bg border-l border-gray-700 w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold">Issues</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Summary */}
      <div className="p-4 border-b border-gray-700">
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="bg-red-500/10 rounded p-2">
            <div className="text-red-400 font-bold text-lg">{issueCounts.bug}</div>
            <div className="text-gray-400 text-xs">Bugs</div>
          </div>
          <div className="bg-yellow-500/10 rounded p-2">
            <div className="text-yellow-400 font-bold text-lg">{issueCounts.warning}</div>
            <div className="text-gray-400 text-xs">Warnings</div>
          </div>
          <div className="bg-blue-500/10 rounded p-2">
            <div className="text-blue-400 font-bold text-lg">{issueCounts.suggestion}</div>
            <div className="text-gray-400 text-xs">Tips</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1 p-3 border-b border-gray-700">
        {filterButtons.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-2 py-1 text-xs rounded transition ${
              filter === key
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-gray-700/50 text-gray-400 border border-gray-600 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Issues List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredIssues.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No issues found</div>
        ) : (
          filteredIssues.map((issue, index) => (
            <div
              key={index}
              className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden"
            >
              <button
                onClick={() => {
                  setExpandedIssue(expandedIssue === index ? null : index);
                  onNavigateToLine?.(issue.line);
                }}
                className="w-full flex items-start gap-3 p-3 text-left hover:bg-gray-700/30 transition"
              >
                {expandedIssue === index ? (
                  <ChevronDown className="w-4 h-4 mt-0.5 text-gray-500 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 mt-0.5 text-gray-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <IssueBadge type={issue.type} size="sm" />
                    <span className="text-xs text-gray-500">Line {issue.line}</span>
                  </div>
                  <p className="text-sm text-gray-300 truncate">{issue.message}</p>
                </div>
              </button>

              {expandedIssue === index && (
                <div className="px-3 pb-3 pl-10">
                  <div className="text-sm text-gray-400 mb-2">
                    <span className="text-gray-500">Suggestion: </span>
                    {issue.suggestion}
                  </div>
                  {issue.code && (
                    <div className="bg-gray-900 rounded p-2 mb-2">
                      <div className="text-xs text-gray-500 mb-1">Current code:</div>
                      <code className="text-xs text-red-300 font-mono block">
                        {issue.code}
                      </code>
                    </div>
                  )}
                  {issue.fixedCode && (
                    <div className="bg-gray-900 rounded p-2 mb-2">
                      <div className="text-xs text-gray-500 mb-1">Suggested fix:</div>
                      <code className="text-xs text-green-300 font-mono block">
                        {issue.fixedCode}
                      </code>
                    </div>
                  )}
                  {onApplyFix && issue.fixedCode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onApplyFix(issue);
                      }}
                      className="mt-2 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded transition"
                    >
                      Apply Fix
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default IssuePanel;
