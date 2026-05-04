/**
 * Language utilities
 * Maps file extensions and names to Monaco language identifiers
 */
export const LANGUAGES = [
  { label: 'JavaScript', value: 'javascript', ext: '.js' },
  { label: 'TypeScript', value: 'typescript', ext: '.ts' },
  { label: 'Python', value: 'python', ext: '.py' },
  { label: 'Java', value: 'java', ext: '.java' },
  { label: 'C', value: 'c', ext: '.c' },
  { label: 'C++', value: 'cpp', ext: '.cpp' },
  { label: 'C#', value: 'csharp', ext: '.cs' },
  { label: 'Go', value: 'go', ext: '.go' },
  { label: 'Ruby', value: 'ruby', ext: '.rb' },
  { label: 'PHP', value: 'php', ext: '.php' },
  { label: 'Rust', value: 'rust', ext: '.rs' },
  { label: 'Swift', value: 'swift', ext: '.swift' },
  { label: 'Kotlin', value: 'kotlin', ext: '.kt' },
  { label: 'HTML', value: 'html', ext: '.html' },
  { label: 'CSS', value: 'css', ext: '.css' },
  { label: 'SQL', value: 'sql', ext: '.sql' },
  { label: 'JSON', value: 'json', ext: '.json' },
  { label: 'Plain Text', value: 'plaintext', ext: '.txt' },
];

export const detectLanguage = (filename) => {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  const lang = LANGUAGES.find((l) => l.ext === ext);
  return lang ? lang.value : 'plaintext';
};

export const getLanguageLabel = (value) => {
  const lang = LANGUAGES.find((l) => l.value === value);
  return lang ? lang.label : value;
};
