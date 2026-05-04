/**
 * AI Service
 * Handles communication with OpenAI API for code review generation
 * Includes a fallback local analyzer (demo mode) when API quota is exceeded
 */
const OpenAI = require('openai');

// Initialize OpenAI client (only if key is valid)
let openai = null;
if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your_openai')) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Demo mode flag - set USE_DEMO_MODE=true to always use local analyzer
const DEMO_MODE = process.env.USE_DEMO_MODE === 'true' || !openai;

const buildIssueSummary = (issueList) => {
  const typeCounts = issueList.reduce((acc, i) => {
    acc[i.type] = (acc[i.type] || 0) + 1;
    return acc;
  }, {});

  if (issueList.length === 0) {
    return 'Code review completed. No significant issues detected. Code follows reasonable practices.';
  }

  const parts = [];
  if (typeCounts.bug) parts.push(`${typeCounts.bug} bug(s)`);
  if (typeCounts.security) parts.push(`${typeCounts.security} security issue(s)`);
  if (typeCounts.warning) parts.push(`${typeCounts.warning} warning(s)`);
  if (typeCounts.performance) parts.push(`${typeCounts.performance} performance issue(s)`);
  if (typeCounts.suggestion) parts.push(`${typeCounts.suggestion} suggestion(s)`);
  return `Found ${issueList.length} issue(s): ${parts.join(', ')}.`;
};

/**
 * Merge AI review with deterministic local fixes. Local line edits win when they
 * change a line vs the original (syntax/print fixes), so Apply All Fixes works
 * even when the model omits compile errors or returns unchanged fixedCode.
 */
const mergeReviewsWithLocal = (apiResult, localResult, originalCode) => {
  const origLines = originalCode.split('\n');
  const localLines = (localResult.fixedCode || originalCode).split('\n');
  const apiLines = (apiResult.fixedCode || originalCode).split('\n');
  const maxLen = Math.max(origLines.length, localLines.length, apiLines.length);

  const mergedLines = Array.from({ length: maxLen }, (_, i) => {
    const orig = origLines[i] ?? '';
    const loc = localLines[i] ?? orig;
    const apiLine = apiLines[i] ?? orig;
    const localChanged = loc.trim() !== orig.trim();
    return localChanged ? loc : apiLine;
  });

  const seen = new Set();
  const issues = [...localResult.issues, ...apiResult.issues].filter((issue) => {
    const line = Math.max(1, parseInt(issue.line, 10) || 1);
    const msg = String(issue.message || '').substring(0, 120);
    const key = `${line}:${issue.type}:${msg}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    issues,
    summary: buildIssueSummary(issues),
    fixedCode: mergedLines.join('\n'),
  };
};

/**
 * Local Code Analyzer - generates realistic reviews without API calls
 * Detects common bugs, security issues, and best practice violations
 */
const analyzeCodeLocally = (code, language) => {
  const lines = code.split('\n');
  const issues = [];
  let fixedLines = [...lines];
  const isJSLanguage = language === 'javascript' || language === 'typescript';

  // Helper to add issue and track fix
  const addIssue = (line, type, message, suggestion, codeSnippet, fixed) => {
    issues.push({
      line,
      type,
      message,
      suggestion,
      code: codeSnippet,
      fixedCode: fixed,
    });
    if (fixed && fixed !== codeSnippet) {
      const orig = lines[line - 1] || '';
      const indent = /^(\s*)/.exec(orig)?.[1] ?? '';
      const body = String(fixed).replace(/^\s+/, '');
      fixedLines[line - 1] = indent + body;
    }
  };

  // Parser-level syntax check for JavaScript/TypeScript to catch incomplete code.
  if (isJSLanguage) {
    try {
      // Wrap as function body; this catches "Unexpected end of input" and token errors.
      // eslint-disable-next-line no-new-func
      new Function(code);
    } catch (syntaxErr) {
      const errorText = String(syntaxErr?.message || 'Syntax error');
      const stackText = String(syntaxErr?.stack || '');
      const lineMatch = stackText.match(/<anonymous>:(\d+):\d+/);
      const lineNum = Math.max(
        1,
        lineMatch ? parseInt(lineMatch[1], 10) : lines.length
      );

      const rawLine = lines[lineNum - 1] || '';
      let fixedCandidate = rawLine.trim();

      while ((fixedCandidate.match(/\(/g) || []).length > (fixedCandidate.match(/\)/g) || []).length) {
        fixedCandidate += ')';
      }
      while ((fixedCandidate.match(/\[/g) || []).length > (fixedCandidate.match(/\]/g) || []).length) {
        fixedCandidate += ']';
      }
      while ((fixedCandidate.match(/\{/g) || []).length > (fixedCandidate.match(/\}/g) || []).length) {
        fixedCandidate += '}';
      }
      if (
        fixedCandidate &&
        !fixedCandidate.trim().endsWith(';') &&
        !fixedCandidate.trim().endsWith('{') &&
        !fixedCandidate.trim().endsWith('}')
      ) {
        fixedCandidate += ';';
      }

      addIssue(
        lineNum,
        'bug',
        `JavaScript/TypeScript syntax error: ${errorText}`,
        'Complete missing brackets/parentheses/quotes and finish the statement.',
        rawLine.trim().substring(0, 120),
        fixedCandidate
      );
    }
  }

  // --- Pattern Detection ---

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();

    // Java: common one-line syntax mistakes on System.out.print / println
    if (language === 'java' && trimmed && !trimmed.startsWith('//') && lower.includes('system.out.print')) {
      const doubleQuotes = (line.match(/"/g) || []).length;
      let fixedJava = trimmed;
      let fixedJavaChanged = false;

      if (doubleQuotes % 2 !== 0) {
        fixedJava += '"';
        fixedJavaChanged = true;
      }

      while ((fixedJava.match(/\(/g) || []).length > (fixedJava.match(/\)/g) || []).length) {
        fixedJava += ')';
        fixedJavaChanged = true;
      }

      if (!fixedJava.trim().endsWith(';')) {
        fixedJava += ';';
        fixedJavaChanged = true;
      }

      if (fixedJavaChanged && fixedJava !== trimmed) {
        addIssue(
          lineNum,
          'bug',
          'Java syntax error in System.out.print/println (unclosed string, missing closing parenthesis, or missing semicolon)',
          'Close any open string literal, add the missing ")" and end the statement with ";"',
          trimmed.substring(0, 80),
          fixedJava
        );
      }
    }

    // SQL Injection
    if ((lower.includes('select') || lower.includes('insert') || lower.includes('delete') || lower.includes('update')) &&
        (line.includes('+') || line.includes('${') || (lower.includes('query') && !lower.includes('?')))) {
      if (!line.includes('?') && !line.includes('prepared') && !line.includes('parameterized')) {
        addIssue(
          lineNum,
          'security',
          'Potential SQL injection vulnerability — user input concatenated directly into query',
          'Use parameterized queries or prepared statements instead of string concatenation',
          trimmed.substring(0, 80),
          trimmed.replace(/["'].*?\+.*?\+.*?["']/g, "'?'").replace(/\$\{[^}]+\}/g, '?') || trimmed
        );
      }
    }

    // OS Command Injection
    if ((lower.includes('exec') || lower.includes('spawn') || lower.includes('execfile')) &&
        (line.includes('+') || line.includes('${') || (line.includes('(') && !line.includes(',')))) {
      addIssue(
        lineNum,
        'security',
        'OS command injection risk — avoid passing user input directly to shell commands',
        'Sanitize input or use safer APIs instead of shell execution',
        trimmed.substring(0, 80),
        trimmed
      );
    }

    // eval() danger
    if (lower.includes('eval(')) {
      addIssue(
        lineNum,
        'security',
        'eval() is dangerous and allows arbitrary code execution — never use with user input',
        'Use JSON.parse() for JSON data, or safer parsing alternatives',
        trimmed.substring(0, 80),
        trimmed.replace(/eval\s*\(/g, 'JSON.parse(')
      );
    }

    // innerHTML XSS
    if (lower.includes('innerhtml') && !lower.includes('textcontent') && !lower.includes('innertext')) {
      addIssue(
        lineNum,
        'security',
        'innerHTML can introduce XSS vulnerabilities if user input is inserted',
        'Use textContent or sanitize HTML before insertion',
        trimmed.substring(0, 80),
        trimmed.replace(/innerHTML/gi, 'textContent')
      );
    }

    // Missing await on async calls
    if ((trimmed.includes('fetch(') || trimmed.includes('axios.') || trimmed.includes('db.')) &&
        !trimmed.includes('await ') && !trimmed.includes('.then(') && !trimmed.startsWith('//') && language === 'javascript') {
      addIssue(
        lineNum,
        'bug',
        'Promise returned without await — may cause race conditions or undefined values',
        'Add await before async calls or handle with .then()/.catch()',
        trimmed.substring(0, 80),
        trimmed.replace(/\b(fetch|axios|db)\./, 'await $1.')
      );
    }

    // Off-by-one / array bounds
    if ((lower.includes('<= arr.length') || lower.includes('<= numbers.length') || lower.includes('<= items.length') ||
         lower.includes('<= array.length') || lower.includes('<= list.length')) &&
        lower.includes('for')) {
      addIssue(
        lineNum,
        'bug',
        'Off-by-one error: array index goes up to length-1, accessing arr[arr.length] is undefined',
        'Use < instead of <= in loop conditions when iterating arrays',
        trimmed.substring(0, 80),
        trimmed.replace('<=', '<')
      );
    }

    // Missing null checks
    if ((trimmed.includes('.name') || trimmed.includes('.email') || trimmed.includes('.id')) &&
        !trimmed.includes('?.') && !trimmed.includes('if') && !trimmed.includes('&&') && !trimmed.includes('||')) {
      if (index > 0 && !lines[index - 1].trim().toLowerCase().includes('if')) {
        addIssue(
          lineNum,
          'warning',
          'Possible null reference — accessing property without null/undefined check',
          'Use optional chaining (?.) or add an explicit null check before accessing',
          trimmed.substring(0, 80),
          trimmed.replace(/(\w+)\.(\w+)/g, '$1?.$2')
        );
      }
    }

    // var usage (instead of let/const)
    if (trimmed.startsWith('var ') && language === 'javascript') {
      addIssue(
        lineNum,
        'suggestion',
        'Use let or const instead of var to avoid scoping issues',
        'Replace var with const (if never reassigned) or let (if reassigned)',
        trimmed.substring(0, 80),
        trimmed.replace(/^var /, 'const ')
      );
    }

    // console.log in production code
    if (
      trimmed.includes('console.log') ||
      trimmed.includes('console.error') ||
      (trimmed.includes('print(') && !lower.includes('system.out.print'))
    ) {
      if (!trimmed.includes('//') && !lower.includes('debug')) {
        addIssue(
          lineNum,
          'suggestion',
          'Remove debug logging before production deployment',
          'Use a proper logging library (Winston, Pino) instead of console.log',
          trimmed.substring(0, 80),
          `// TODO: replace with logger: ${trimmed}`
        );
      }
    }

    // Inefficient loops (push in loop with large count)
    if (lower.includes('for') && lower.includes('push(') && (lower.includes('1000000') || lower.includes('100000'))) {
      addIssue(
        lineNum,
        'performance',
        'Large loop pushing to array may cause performance/memory issues',
        'Pre-allocate array size or use Array.from() / map() for better performance',
        trimmed.substring(0, 80),
        trimmed
      );
    }

    // Magic numbers
    const magicNumberMatch = trimmed.match(/[^a-zA-Z](\d{3,})[^a-zA-Z]/);
    if (magicNumberMatch && !trimmed.includes('//') && !trimmed.includes('const') && !trimmed.includes('let') && !trimmed.includes('var')) {
      addIssue(
        lineNum,
        'suggestion',
        'Magic number detected — consider defining as a named constant',
        `Extract ${magicNumberMatch[1]} into a named constant like const MAX_SIZE = ${magicNumberMatch[1]}`,
        trimmed.substring(0, 80),
        trimmed
      );
    }

    // Hardcoded credentials / secrets
    if ((lower.includes('password') || lower.includes('secret') || lower.includes('api_key') || lower.includes('token')) &&
        (line.includes('"') || line.includes("'")) && !trimmed.includes('process.env') && !trimmed.includes('//')) {
      addIssue(
        lineNum,
        'security',
        'Hardcoded credential or secret detected — never commit secrets to source code',
        'Use environment variables (process.env.SECRET) or a secrets manager',
        trimmed.substring(0, 80),
        trimmed.replace(/['"].*?['"]/g, 'process.env.SECRET')
      );
    }

    // Division by zero risk
    if (trimmed.includes('/') && !trimmed.includes('//')) {
      const divisorMatch = trimmed.match(/\/\s*(\w+)/);
      if (divisorMatch && !lines.some((l, i) => i < index && l.includes(`if (${divisorMatch[1]} !== 0)`))) {
        addIssue(
          lineNum,
          'warning',
          'Possible division by zero — ensure denominator is not zero before dividing',
          'Add a guard clause to check if divisor is zero before performing division',
          trimmed.substring(0, 80),
          trimmed
        );
      }
    }
  });

  return {
    issues,
    summary: buildIssueSummary(issues),
    fixedCode: fixedLines.join('\n'),
  };
};

/**
 * Generate AI code review prompt
 * Returns a structured prompt that forces JSON output
 */
const buildReviewPrompt = (code, language) => {
  return `You are a senior software engineer performing a thorough code review.
Analyze the following ${language} code and identify bugs, security issues, performance problems, warnings, and suggestions.

CODE:
\`\`\`${language}
${code}
\`\`\`

Instructions:
1. Review the code carefully for: bugs, security vulnerabilities, performance issues, style violations, and best practice suggestions.
2. For each issue found, provide the line number, type, description, and a concrete fix.
3. If the code is clean, return an empty issues array with a positive summary.
4. ALWAYS respond with ONLY valid JSON. Do not include markdown formatting, explanations, or any text outside the JSON.

Return this exact JSON structure:
{
  "issues": [
    {
      "line": <number>,
      "type": "bug" | "warning" | "suggestion" | "security" | "performance",
      "message": "<brief description of the issue>",
      "suggestion": "<specific fix or recommendation>",
      "code": "<relevant code snippet from the line>",
      "fixedCode": "<corrected version of the code>"
    }
  ],
  "summary": "<overall summary of the review>",
  "fixedCode": "<complete fixed version of the entire code>"
}

Type definitions:
- bug: Actual errors that will cause runtime failures or incorrect behavior
- security: Security vulnerabilities (SQL injection, XSS, unsafe input handling, etc.)
- performance: Inefficient algorithms, unnecessary operations, memory leaks
- warning: Potential issues, deprecated APIs, bad practices that may cause problems
- suggestion: Style improvements, readability enhancements, best practices

Rules:
- Line numbers start at 1 (first line of the code).
- Be specific and actionable in messages and suggestions.
- Provide complete fixedCode for the entire file, not just individual lines.
- If no issues found, return empty issues array and a positive summary.
- NEVER include markdown code blocks or any text outside the JSON.`;
};

/**
 * Call OpenAI API to get code review
 * Falls back to local analyzer if API is unavailable or quota exceeded (429)
 * @param {string} code - Source code to review
 * @param {string} language - Programming language
 * @returns {Promise<{issues: Array, summary: string, fixedCode: string}>}
 */
const getCodeReview = async (code, language) => {
  // If no API key or explicitly in demo mode, skip API call entirely
  if (DEMO_MODE) {
    console.log('[DEMO MODE] Using local code analyzer (no API call)');
    return analyzeCodeLocally(code, language);
  }

  try {
    const prompt = buildReviewPrompt(code, language);

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a meticulous code reviewer. You only respond with valid JSON matching the requested structure.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 4000,
    });

    const content = response.choices[0].message.content;

    // Try to parse JSON from response (handle markdown code blocks if present)
    let parsed;
    try {
      // Remove markdown code block markers if present
      const cleanContent = content
        .replace(/^```json\s*/, '')
        .replace(/```\s*$/, '')
        .trim();
      parsed = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError.message);
      console.error('Raw content:', content);

      // Fallback: try to extract JSON from text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (e) {
          throw new Error('Failed to parse AI response as JSON');
        }
      } else {
        throw new Error('AI response did not contain valid JSON');
      }
    }

    // Validate structure
    if (!parsed.issues || !Array.isArray(parsed.issues)) {
      parsed.issues = [];
    }
    if (!parsed.summary) {
      parsed.summary = 'Code review completed.';
    }
    if (!parsed.fixedCode) {
      parsed.fixedCode = code;
    }

    // Validate and clean each issue
    parsed.issues = parsed.issues
      .filter((issue) => issue.line && issue.message && issue.suggestion)
      .map((issue) => ({
        line: Math.max(1, parseInt(issue.line) || 1),
        type: ['bug', 'warning', 'suggestion', 'security', 'performance'].includes(
          issue.type
        )
          ? issue.type
          : 'suggestion',
        message: String(issue.message || '').substring(0, 500),
        suggestion: String(issue.suggestion || '').substring(0, 1000),
        code: String(issue.code || '').substring(0, 500),
        fixedCode: String(issue.fixedCode || '').substring(0, 1000),
      }));

    const localBaseline = analyzeCodeLocally(code, language);
    return mergeReviewsWithLocal(parsed, localBaseline, code);
  } catch (error) {
    // On 429 (quota exceeded) or any API error, silently fall back to local analyzer
    if (error.status === 429 || error.code === 'insufficient_quota' || !openai) {
      console.log('[FALLBACK] OpenAI quota exceeded or unavailable. Using local analyzer.');
      return analyzeCodeLocally(code, language);
    }
    console.error('AI Service Error:', error.message);
    throw error;
  }
};

module.exports = {
  getCodeReview,
  buildReviewPrompt,
  analyzeCodeLocally,
};
