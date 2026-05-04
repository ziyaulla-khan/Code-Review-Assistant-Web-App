/**
 * HomePage Component
 * Main editor page with Monaco Editor, file upload, review button, and results panel
 */
import React, { useState, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import {
  Upload,
  FileCode,
  FileDiff,
  Sparkles,
  X,
  Type,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { LANGUAGES, detectLanguage } from '../utils/languages';
import IssuePanel from '../components/IssuePanel';
import DiffViewer from '../components/DiffViewer';
import toast from 'react-hot-toast';

const SAMPLE_CODE = `function calculateSum(numbers) {
  let total = 0;
  for (let i = 0; i < numbers.length; i++) {
    total = total + numbers[i];
  }
  return total;
}

function getUser(id) {
  const user = database.findOne({ id: id });
  return user.name;
}

const result = calculateSum([1, 2, 3]);
console.log(result);
`;

const getLikelyLineFix = (line) => {
  let fixed = (line || '').trim();
  if (!fixed) return fixed;

  while ((fixed.match(/\(/g) || []).length > (fixed.match(/\)/g) || []).length) {
    fixed += ')';
  }
  while ((fixed.match(/\[/g) || []).length > (fixed.match(/\]/g) || []).length) {
    fixed += ']';
  }
  while ((fixed.match(/\{/g) || []).length > (fixed.match(/\}/g) || []).length) {
    fixed += '}';
  }
  if (
    fixed &&
    !fixed.endsWith(';') &&
    !fixed.endsWith('{') &&
    !fixed.endsWith('}') &&
    !fixed.endsWith(',')
  ) {
    fixed += ';';
  }
  return fixed;
};

const getClientSyntaxIssues = (sourceCode, selectedLanguage) => {
  const issues = [];
  const lines = sourceCode.split('\n');
  const isJSLanguage = selectedLanguage === 'javascript' || selectedLanguage === 'typescript';

  if (isJSLanguage) {
    try {
      // eslint-disable-next-line no-new-func
      new Function(sourceCode);
    } catch (err) {
      const message = String(err?.message || 'Syntax error');
      const stack = String(err?.stack || '');
      const match = stack.match(/<anonymous>:(\d+):\d+/);
      let lineNum = match ? parseInt(match[1], 10) : lines.length;
      if (!Number.isFinite(lineNum) || lineNum < 1) lineNum = lines.length;
      lineNum = Math.min(lineNum, lines.length || 1);

      const line = lines[lineNum - 1] || '';
      issues.push({
        line: lineNum,
        type: 'bug',
        message: `Syntax error: ${message}`,
        suggestion: 'Complete the statement and close missing brackets/parentheses.',
        code: line.trim().substring(0, 120),
        fixedCode: getLikelyLineFix(line),
      });
    }
  }

  return issues;
};

const dedupeIssues = (issues) => {
  const seen = new Set();
  return issues.filter((issue) => {
    const line = Math.max(1, parseInt(issue?.line, 10) || 1);
    const type = String(issue?.type || 'suggestion');
    const message = String(issue?.message || '').substring(0, 120);
    const key = `${line}:${type}:${message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const HomePage = () => {
  const [code, setCode] = useState(SAMPLE_CODE);
  const [language, setLanguage] = useState('javascript');
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showIssues, setShowIssues] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  const fileInputRef = useRef(null);
  const { api } = useAuth();

  // Handle editor mount - store reference for decorations
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Define custom decorations for issue types
    monaco.editor.defineTheme('codeReviewTheme', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.lineHighlightBackground': '#2a2a2a',
      },
    });
    monaco.editor.setTheme('codeReviewTheme');
  };

  // Highlight lines with issues using Monaco decorations
  const highlightIssues = useCallback((issues) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!monaco) return;

    // Clear previous decorations
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);

    const newDecorations = issues
      .filter((issue) => issue && issue.line != null)
      .map((issue) => {
      const line = Math.max(1, parseInt(issue.line, 10) || 1);
      const colorMap = {
        bug: 'rgba(239, 68, 68, 0.15)',
        security: 'rgba(220, 38, 38, 0.2)',
        warning: 'rgba(234, 179, 8, 0.15)',
        performance: 'rgba(168, 85, 247, 0.15)',
        suggestion: 'rgba(59, 130, 246, 0.15)',
      };

      const borderMap = {
        bug: '#ef4444',
        security: '#dc2626',
        warning: '#eab308',
        performance: '#a855f7',
        suggestion: '#3b82f6',
      };

      const label = String(issue.message ?? issue.title ?? 'Issue').substring(0, 60);
      return {
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: `issue-line-${issue.type}`,
          glyphMarginClassName: `issue-glyph-${issue.type}`,
          overviewRuler: {
            color: borderMap[issue.type] || '#3b82f6',
            position: monaco.editor.OverviewRulerLane.Center,
          },
          minimap: {
            color: borderMap[issue.type] || '#3b82f6',
            position: monaco.editor.MinimapPosition.Inline,
          },
          before: {
            content: `  [${String(issue.type || 'note').toUpperCase()}] ${label}`,
            inlineClassName: `issue-inline-${issue.type}`,
          },
        },
      };
    });

    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      newDecorations
    );
  }, []);

  // Submit code for review
  const handleReview = async () => {
    if (!code.trim()) {
      toast.error('Please enter some code to review');
      return;
    }

    setLoading(true);
    setReview(null);
    setShowIssues(false);
    setShowDiff(false);

    // Clear previous decorations
    if (editorRef.current) {
      decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current,
        []
      );
    }

    try {
      const response = await api.post('/reviews', {
        code,
        language,
        title: 'Code Review',
      });

      const reviewData = response.data.data;
      const clientSyntaxIssues = getClientSyntaxIssues(code, language);
      const mergedIssues = dedupeIssues([...(reviewData.issues || []), ...clientSyntaxIssues]);

      let mergedFixedCode = reviewData.fixedCode || code;
      if (clientSyntaxIssues.length > 0) {
        const mergedLines = (mergedFixedCode || code).split('\n');
        clientSyntaxIssues.forEach((issue) => {
          const lineIdx = Math.max(0, (parseInt(issue.line, 10) || 1) - 1);
          const existing = mergedLines[lineIdx] ?? '';
          const indent = /^(\s*)/.exec(existing)?.[1] ?? '';
          const body = String(issue.fixedCode || '').replace(/^\s+/, '');
          if (body) mergedLines[lineIdx] = indent + body;
        });
        mergedFixedCode = mergedLines.join('\n');
      }

      const mergedReview = {
        ...reviewData,
        issues: mergedIssues,
        fixedCode: mergedFixedCode,
      };

      setReview(mergedReview);
      setShowIssues(true);

      // Highlight issues in editor
      if (mergedReview.issues?.length > 0) {
        setTimeout(() => {
          highlightIssues(mergedReview.issues);
        }, 500); // Wait for monaco to be ready
      }

      if (clientSyntaxIssues.length > 0) {
        toast.error('Syntax error detected. Bug issue added with a suggested fix.');
      }

      toast.success(
        mergedReview.issues?.length > 0
          ? `Found ${mergedReview.issues.length} issue(s)`
          : 'Code looks good! No issues found.'
      );
    } catch (error) {
      const message = error.response?.data?.message || 'Review failed. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Detect language from file extension
    const detectedLang = detectLanguage(file.name);
    setLanguage(detectedLang);

    // Read file content
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target.result;
      setCode(content);
      toast.success(`Loaded ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

      // Auto-review uploaded file
      setTimeout(() => handleReview(), 300);
    };
    reader.readAsText(file);
  };

  // Apply a single fix to the code
  const handleApplyFix = (issue) => {
    if (!editorRef.current || !issue.fixedCode) return;

    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;

    const lineNum = Math.max(1, parseInt(issue.line, 10) || 1);
    const lineIdx = lineNum - 1;
    const lines = model.getValue().split('\n');
    const currentLine = lines[lineIdx] ?? '';
    const indent = /^(\s*)/.exec(currentLine)?.[1] ?? '';
    const fixedBody = String(issue.fixedCode).replace(/^\s+/, '');

    if (currentLine.trim() === fixedBody.trim()) {
      toast.error('This line already matches the suggested fix');
      return;
    }

    lines[lineIdx] = indent + fixedBody;
    const newCode = lines.join('\n');
    setCode(newCode);
    model.setValue(newCode);
    toast.success('Fix applied');
  };

  // Apply all fixes at once
  const handleApplyAllFixes = () => {
    if (!review?.fixedCode) {
      toast.error('No fixed code available');
      return;
    }
    setCode(review.fixedCode);
    if (editorRef.current) {
      editorRef.current.getModel()?.setValue(review.fixedCode);
    }
    toast.success('All fixes applied');
  };

  // Navigate to a specific line in the editor
  const handleNavigateToLine = (lineNumber) => {
    if (!editorRef.current) return;
    editorRef.current.revealLineInCenter(lineNumber);
    editorRef.current.setPosition({ lineNumber, column: 1 });
    editorRef.current.focus();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-60px)]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-panel-bg border-b border-gray-700 flex-wrap">
        {/* Language selector */}
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-gray-400" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Review button */}
        <button
          onClick={handleReview}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-sm font-medium rounded-lg transition"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          Review Code
        </button>

        {/* Upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition"
        >
          <Upload className="w-4 h-4" />
          Upload File
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".js,.ts,.py,.java,.c,.cpp,.cs,.go,.rb,.php,.rs,.swift,.kt,.html,.css,.sql,.json,.txt,.md"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Toggle issues panel */}
        {review && (
          <>
            {review.issues?.some(
              (issue) => issue.type === 'bug' && String(issue.message || '').toLowerCase().includes('syntax')
            ) && (
              <span className="px-3 py-1.5 rounded-lg text-sm bg-red-500/20 text-red-300 border border-red-500/40">
                Syntax error detected
              </span>
            )}

            <button
              onClick={() => {
                setShowIssues(!showIssues);
                setShowDiff(false);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition ${
                showIssues
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              <FileCode className="w-4 h-4" />
              Issues ({review.issues?.length || 0})
            </button>

            {/* Diff toggle */}
            {review.fixedCode && review.fixedCode !== code && (
              <button
                onClick={() => {
                  setShowDiff(!showDiff);
                  setShowIssues(false);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition ${
                  showDiff
                    ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                <FileDiff className="w-4 h-4" />
                Diff View
              </button>
            )}

            {/* Apply all fixes */}
            {review.fixedCode && review.fixedCode !== code && (
              <button
                onClick={handleApplyAllFixes}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-700 hover:bg-green-600 text-green-100 text-sm rounded-lg transition"
              >
                <Sparkles className="w-4 h-4" />
                Apply All Fixes
              </button>
            )}

            {/* Close review */}
            <button
              onClick={() => {
                setReview(null);
                setShowIssues(false);
                setShowDiff(false);
                if (editorRef.current) {
                  decorationsRef.current = editorRef.current.deltaDecorations(
                    decorationsRef.current,
                    []
                  );
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          </>
        )}
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className={`flex-1 transition-all duration-300 ${showIssues || showDiff ? 'w-2/3' : 'w-full'}`}>
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={(value) => setCode(value || '')}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              fontFamily: "'Fira Code', Consolas, monospace",
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              readOnly: false,
              automaticLayout: true,
              padding: { top: 16 },
              glyphMargin: true,
              folding: true,
              bracketPairColorization: { enabled: true },
            }}
            loading={
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                Loading Editor...
              </div>
            }
          />
        </div>

        {/* Issues Sidebar */}
        {showIssues && review && (
          <div className="w-1/3 min-w-[320px] max-w-[480px] border-l border-gray-700 animate-in slide-in-from-right">
            <IssuePanel
              issues={review.issues || []}
              onClose={() => setShowIssues(false)}
              onApplyFix={handleApplyFix}
              onNavigateToLine={handleNavigateToLine}
            />
          </div>
        )}

        {/* Diff Sidebar */}
        {showDiff && review && (
          <div className="w-1/3 min-w-[320px] max-w-[480px] border-l border-gray-700 animate-in slide-in-from-right">
            <DiffViewer
              originalCode={review.code}
              fixedCode={review.fixedCode}
              onClose={() => setShowDiff(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
