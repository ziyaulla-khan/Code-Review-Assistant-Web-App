/**
 * ReviewDetailPage Component
 * Displays a single saved review with full code and issues
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Bug, AlertTriangle, ShieldAlert, Lightbulb, Zap } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getLanguageLabel } from '../utils/languages';
import IssueBadge from '../components/IssueBadge';
import toast from 'react-hot-toast';

const ReviewDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();

  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReview();
  }, [id]);

  const fetchReview = async () => {
    try {
      const response = await api.get(`/reviews/${id}`);
      setReview(response.data.data);
    } catch (error) {
      toast.error('Failed to load review');
      navigate('/history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!review) return null;

  const codeLines = review.code.split('\n');
  const issuesByLine = {};
  review.issues?.forEach((issue) => {
    if (!issuesByLine[issue.line]) issuesByLine[issue.line] = [];
    issuesByLine[issue.line].push(issue);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/history')}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to History
        </button>

        <div className="flex items-center gap-3 flex-wrap mb-2">
          <h1 className="text-2xl font-bold">{review.title}</h1>
          <span className="px-2 py-0.5 bg-gray-700 rounded text-sm text-gray-400">
            {getLanguageLabel(review.language)}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {new Date(review.createdAt).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-panel-bg border border-gray-700 rounded-lg p-3 text-center">
          <div className="text-red-400 font-bold text-xl">{review.stats?.bugCount || 0}</div>
          <div className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-1">
            <Bug className="w-3 h-3" /> Bugs
          </div>
        </div>
        <div className="bg-panel-bg border border-gray-700 rounded-lg p-3 text-center">
          <div className="text-red-500 font-bold text-xl">{review.stats?.securityCount || 0}</div>
          <div className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-1">
            <ShieldAlert className="w-3 h-3" /> Security
          </div>
        </div>
        <div className="bg-panel-bg border border-gray-700 rounded-lg p-3 text-center">
          <div className="text-yellow-400 font-bold text-xl">{review.stats?.warningCount || 0}</div>
          <div className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-1">
            <AlertTriangle className="w-3 h-3" /> Warnings
          </div>
        </div>
        <div className="bg-panel-bg border border-gray-700 rounded-lg p-3 text-center">
          <div className="text-purple-400 font-bold text-xl">{review.stats?.performanceCount || 0}</div>
          <div className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-1">
            <Zap className="w-3 h-3" /> Performance
          </div>
        </div>
        <div className="bg-panel-bg border border-gray-700 rounded-lg p-3 text-center">
          <div className="text-blue-400 font-bold text-xl">{review.stats?.suggestionCount || 0}</div>
          <div className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-1">
            <Lightbulb className="w-3 h-3" /> Suggestions
          </div>
        </div>
      </div>

      {/* Summary */}
      {review.summary && (
        <div className="bg-panel-bg border border-gray-700 rounded-lg p-4 mb-6">
          <h2 className="font-semibold mb-2">Summary</h2>
          <p className="text-gray-300 text-sm">{review.summary}</p>
        </div>
      )}

      {/* Code with issues */}
      <div className="bg-panel-bg border border-gray-700 rounded-lg overflow-hidden mb-6">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="font-semibold">Code</h2>
        </div>
        <div className="overflow-x-auto">
          {codeLines.map((line, i) => {
            const lineNum = i + 1;
            const issues = issuesByLine[lineNum];
            return (
              <div key={lineNum} className="flex text-sm group">
                <span className="w-12 text-right pr-3 py-0.5 text-gray-600 bg-gray-800/30 select-none shrink-0">
                  {lineNum}
                </span>
                <span className="flex-1 px-3 py-0.5 text-gray-300 whitespace-pre font-mono">
                  {line || ' '}
                </span>
                {issues && (
                  <div className="shrink-0 w-64 px-2 py-0.5 space-y-1">
                    {issues.map((issue, idx) => (
                      <div key={idx} className="text-xs">
                        <IssueBadge type={issue.type} size="sm" />
                        <span className="text-gray-400 ml-1">{issue.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Issues list */}
      {review.issues?.length > 0 && (
        <div className="bg-panel-bg border border-gray-700 rounded-lg p-4">
          <h2 className="font-semibold mb-4">All Issues</h2>
          <div className="space-y-3">
            {review.issues.map((issue, idx) => (
              <div key={idx} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <div className="flex items-center gap-2 mb-1">
                  <IssueBadge type={issue.type} size="sm" />
                  <span className="text-xs text-gray-500">Line {issue.line}</span>
                </div>
                <p className="text-sm text-gray-300 mb-1">{issue.message}</p>
                <p className="text-xs text-gray-400">
                  <span className="text-gray-500">Suggestion: </span>
                  {issue.suggestion}
                </p>
                {issue.fixedCode && (
                  <div className="mt-2 bg-gray-900 rounded p-2">
                    <code className="text-xs text-green-300 font-mono block">
                      {issue.fixedCode}
                    </code>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewDetailPage;
