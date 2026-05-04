/**
 * HistoryPage Component
 * Displays list of past code reviews with stats and navigation
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Clock, FileCode, AlertTriangle, ShieldAlert, Lightbulb, Zap, Bug } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getLanguageLabel } from '../utils/languages';
import toast from 'react-hot-toast';

const HistoryPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const { api } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const response = await api.get('/reviews');
      setReviews(response.data.data);
    } catch (error) {
      toast.error('Failed to load review history');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;

    try {
      await api.delete(`/reviews/${id}`);
      setReviews(reviews.filter((r) => r._id !== id));
      toast.success('Review deleted');
    } catch (error) {
      toast.error('Failed to delete review');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Review History</h1>
        <span className="text-gray-400 text-sm">{reviews.length} reviews</span>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-20 bg-panel-bg rounded-xl border border-gray-700">
          <FileCode className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No reviews yet</p>
          <Link
            to="/"
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition"
          >
            Start a New Review
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review._id}
              onClick={() => navigate(`/review/${review._id}`)}
              className="bg-panel-bg rounded-xl border border-gray-700 p-5 hover:border-gray-500 cursor-pointer transition group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="font-semibold text-lg group-hover:text-blue-400 transition">
                      {review.title}
                    </h3>
                    <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-400">
                      {getLanguageLabel(review.language)}
                    </span>
                  </div>

                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">{review.summary}</p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 flex-wrap">
                    {review.stats?.bugCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-red-400">
                        <Bug className="w-3 h-3" />
                        {review.stats.bugCount} bugs
                      </span>
                    )}
                    {review.stats?.securityCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-red-500">
                        <ShieldAlert className="w-3 h-3" />
                        {review.stats.securityCount} security
                      </span>
                    )}
                    {review.stats?.warningCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-yellow-400">
                        <AlertTriangle className="w-3 h-3" />
                        {review.stats.warningCount} warnings
                      </span>
                    )}
                    {review.stats?.performanceCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-purple-400">
                        <Zap className="w-3 h-3" />
                        {review.stats.performanceCount} performance
                      </span>
                    )}
                    {review.stats?.suggestionCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-blue-400">
                        <Lightbulb className="w-3 h-3" />
                        {review.stats.suggestionCount} suggestions
                      </span>
                    )}
                    {Object.values(review.stats || {}).every((v) => v === 0) && (
                      <span className="text-xs text-green-400">No issues found</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 ml-4">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {new Date(review.createdAt).toLocaleDateString()}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(review._id);
                    }}
                    className="text-gray-500 hover:text-red-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
