/**
 * DiffViewer Component
 * Shows a diff between original and fixed code
 */
import React from 'react';
import { X } from 'lucide-react';

const DiffViewer = ({ originalCode, fixedCode, onClose }) => {
  const originalLines = String(originalCode ?? '').split('\n');
  const fixedLines = String(fixedCode ?? '').split('\n');

  // Simple diff: show all original in red (removed) and fixed in green (added)
  // A real implementation would use diff-match-patch library for proper line-by-line diff
  return (
    <div className="flex flex-col h-full bg-panel-bg border-l border-gray-700">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold">Diff View</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-2 gap-4 min-w-[600px]">
          {/* Original */}
          <div>
            <div className="text-xs text-red-400 font-semibold mb-2">BEFORE (Original)</div>
            <div className="bg-gray-900 rounded overflow-hidden">
              {originalLines.map((line, i) => (
                <div
                  key={i}
                  className="flex text-sm font-mono border-b border-gray-800 last:border-0"
                >
                  <span className="w-10 text-right pr-2 text-gray-600 bg-gray-800/50 select-none py-0.5">
                    {i + 1}
                  </span>
                  <span className="flex-1 px-2 py-0.5 text-gray-300 whitespace-pre">
                    {line || ' '}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Fixed */}
          <div>
            <div className="text-xs text-green-400 font-semibold mb-2">AFTER (Fixed)</div>
            <div className="bg-gray-900 rounded overflow-hidden">
              {fixedLines.map((line, i) => (
                <div
                  key={i}
                  className={`flex text-sm font-mono border-b border-gray-800 last:border-0 ${
                    i < originalLines.length && originalLines[i] !== line
                      ? 'bg-green-500/10'
                      : ''
                  }`}
                >
                  <span className="w-10 text-right pr-2 text-gray-600 bg-gray-800/50 select-none py-0.5">
                    {i + 1}
                  </span>
                  <span className="flex-1 px-2 py-0.5 text-gray-300 whitespace-pre">
                    {line || ' '}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiffViewer;
