import Editor, { OnMount } from '@monaco-editor/react';
import * as MonacoNamespace from 'monaco-editor';
import { useEffect, useRef } from 'react';
import { getAiCompletions } from '../services/aiService';

export interface CodeErrorMarker {
  line: number;
  message: string;
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  language?: string;
  height?: string;
  theme?: string;
  errors?: CodeErrorMarker[];
  fontSize?: number;
}

export function CodeEditor({
  value,
  onChange,
  language = 'python',
  height = '400px',
  theme = 'vs-dark',
  errors = [],
  fontSize = 14,
}: CodeEditorProps) {
  const editorRef = useRef<MonacoNamespace.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof MonacoNamespace | null>(null);
  // Map our language names to Monaco language IDs
  const getMonacoLanguage = (lang: string): string => {
    const languageMap: Record<string, string> = {
      'python': 'python',
      'java': 'java',
      'javascript': 'javascript',
      'cpp': 'cpp',
      'c++': 'cpp'
    };
    return languageMap[lang] || 'python';
  };

  const handleEditorChange = (value: string | undefined) => {
    onChange(value);
  };

  const handleEditorDidMount: OnMount = (_editor, monaco) => {
    editorRef.current = _editor as MonacoNamespace.editor.IStandaloneCodeEditor;
    monacoRef.current = monaco as unknown as typeof MonacoNamespace;
    // Configure autocomplete like Visual Studio IntelliSense
    _editor.updateOptions({
      quickSuggestions: {
        other: 'on',  // Show suggestions while typing
        comments: false,
        strings: false
      },
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnCommitCharacter: true,
      acceptSuggestionOnEnter: 'on',
      wordBasedSuggestions: 'matchingDocuments',
      tabCompletion: 'on',
      quickSuggestionsDelay: 100,  // Show suggestions faster
      suggest: {
        showWords: true,
        showSnippets: true,
        showFunctions: true,
        showKeywords: true,
        preview: false,  // Disable inline preview
        showInlineDetails: true,
      },
      // DISABLE inline suggestions (ghost text)
      inlineSuggest: {
        enabled: false,  // No inline ghost text!
      },
    });

    // Register Python autocomplete provider with AI-powered suggestions
    monaco.languages.registerCompletionItemProvider('python', {
      triggerCharacters: ['.', ' ', '(', '\n'],
      provideCompletionItems: async (model, position) => {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        // Context-aware suggestions based on what user is typing
        const suggestions: any[] = [];

        // Get AI-powered suggestions
        try {
          const code = model.getValue();
          const aiSuggestions = await getAiCompletions({
            code,
            cursorPosition: { line: position.lineNumber - 1, column: position.column },
            language: 'python',
          });

          // Add AI suggestions with special icon
          aiSuggestions.forEach((suggestion, index) => {
            suggestions.push({
              label: `🤖 AI: ${suggestion.split('\n')[0].substring(0, 50)}...`,
              kind: monaco.languages.CompletionItemKind.Text,
              insertText: suggestion,
              documentation: 'AI-generated suggestion',
              detail: 'AI Completion',
              sortText: `0${index}`, // Show AI suggestions first
              preselect: index === 0, // Preselect first AI suggestion
              range,
            });
          });
        } catch (error) {
          console.warn('AI completions unavailable:', error);
        }

        // If user types "for", suggest complete for loop
        if (textUntilPosition.trim().endsWith('for')) {
          suggestions.push({
            label: 'for loop with range',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: ' ${1:i} in range(${2:10}):\n    ${3:print(i)}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Complete for loop with range',
            preselect: true,
            range: range,
          });
        }

        // If user types "def", suggest function template
        if (textUntilPosition.trim().endsWith('def')) {
          suggestions.push({
            label: 'function definition',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: ' ${1:function_name}(${2:params}):\n    """${3:Description}"""\n    ${4:return None}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Complete function with docstring',
            preselect: true,
            range: range,
          });
        }

        // If user types "if", suggest if statement
        if (textUntilPosition.trim().endsWith('if')) {
          suggestions.push({
            label: 'if statement',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: ' ${1:condition}:\n    ${2:pass}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Complete if statement',
            preselect: true,
            range: range,
          });
        }

        // If user types "print", suggest print with f-string
        if (word.word === 'print' || textUntilPosition.trim().endsWith('print')) {
          suggestions.push({
            label: 'print with f-string',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'print(f"${1:text}: {${2:variable}}")',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Print with formatted string',
            preselect: true,
            sortText: '0',
            range: range,
          });
        }

        // Add standard Python built-in functions and keywords
        suggestions.push(
          // Built-in functions
          { label: 'print', kind: monaco.languages.CompletionItemKind.Function, insertText: 'print(${1:value})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Print to console', range },
          { label: 'len', kind: monaco.languages.CompletionItemKind.Function, insertText: 'len(${1:sequence})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return the length of a sequence' },
          { label: 'range', kind: monaco.languages.CompletionItemKind.Function, insertText: 'range(${1:stop})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Create a range of numbers' },
          { label: 'str', kind: monaco.languages.CompletionItemKind.Function, insertText: 'str(${1:object})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Convert to string' },
          { label: 'int', kind: monaco.languages.CompletionItemKind.Function, insertText: 'int(${1:value})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Convert to integer' },
          { label: 'float', kind: monaco.languages.CompletionItemKind.Function, insertText: 'float(${1:value})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Convert to float' },
          { label: 'list', kind: monaco.languages.CompletionItemKind.Function, insertText: 'list(${1:iterable})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Create a list' },
          { label: 'dict', kind: monaco.languages.CompletionItemKind.Function, insertText: 'dict()', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Create a dictionary' },
          { label: 'set', kind: monaco.languages.CompletionItemKind.Function, insertText: 'set(${1:iterable})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Create a set' },
          { label: 'tuple', kind: monaco.languages.CompletionItemKind.Function, insertText: 'tuple(${1:iterable})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Create a tuple' },
          { label: 'sum', kind: monaco.languages.CompletionItemKind.Function, insertText: 'sum(${1:iterable})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Sum all items' },
          { label: 'max', kind: monaco.languages.CompletionItemKind.Function, insertText: 'max(${1:iterable})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return maximum value' },
          { label: 'min', kind: monaco.languages.CompletionItemKind.Function, insertText: 'min(${1:iterable})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return minimum value' },
          { label: 'sorted', kind: monaco.languages.CompletionItemKind.Function, insertText: 'sorted(${1:iterable})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return sorted list' },
          { label: 'reversed', kind: monaco.languages.CompletionItemKind.Function, insertText: 'reversed(${1:sequence})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Reverse a sequence' },
          { label: 'enumerate', kind: monaco.languages.CompletionItemKind.Function, insertText: 'enumerate(${1:iterable})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return enumerated pairs' },
          { label: 'zip', kind: monaco.languages.CompletionItemKind.Function, insertText: 'zip(${1:iterable})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Zip iterables together' },
          { label: 'map', kind: monaco.languages.CompletionItemKind.Function, insertText: 'map(${1:function}, ${2:iterable})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Apply function to items' },
          { label: 'filter', kind: monaco.languages.CompletionItemKind.Function, insertText: 'filter(${1:function}, ${2:iterable})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Filter items by function' },
          { label: 'abs', kind: monaco.languages.CompletionItemKind.Function, insertText: 'abs(${1:number})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return absolute value' },
          { label: 'round', kind: monaco.languages.CompletionItemKind.Function, insertText: 'round(${1:number})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Round a number' },
          { label: 'pow', kind: monaco.languages.CompletionItemKind.Function, insertText: 'pow(${1:base}, ${2:exp})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return base to the power of exp' },
          { label: 'input', kind: monaco.languages.CompletionItemKind.Function, insertText: 'input(${1:prompt})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Read input from user' },
          { label: 'open', kind: monaco.languages.CompletionItemKind.Function, insertText: 'open(${1:file}, ${2:mode})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Open a file (blocked in IDE)' },
          
          // Keywords
          { label: 'def', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'def ${1:function_name}(${2:params}):\n    ${3:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Define a function' },
          { label: 'class', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'class ${1:ClassName}:\n    def __init__(self${2:, params}):\n        ${3:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Define a class' },
          { label: 'if', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'if ${1:condition}:\n    ${2:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'If statement' },
          { label: 'elif', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'elif ${1:condition}:\n    ${2:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Else if statement' },
          { label: 'else', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'else:\n    ${1:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Else statement' },
          { label: 'for', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'for ${1:item} in ${2:iterable}:\n    ${3:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'For loop' },
          { label: 'while', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'while ${1:condition}:\n    ${2:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'While loop' },
          { label: 'try', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'try:\n    ${1:pass}\nexcept ${2:Exception} as ${3:e}:\n    ${4:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Try-except block' },
          { label: 'with', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'with ${1:expression} as ${2:variable}:\n    ${3:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Context manager' },
          { label: 'lambda', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'lambda ${1:x}: ${2:x}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Lambda function' },
          { label: 'return', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'return ${1:value}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return from function' },
          { label: 'yield', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'yield ${1:value}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Yield from generator' },
          { label: 'import', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'import ${1:module}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Import module (limited in IDE)' },
          { label: 'from', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'from ${1:module} import ${2:name}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Import from module' },
          
          // Common snippets
          { label: 'forrange', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'for ${1:i} in range(${2:10}):\n    ${3:print(i)}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'For loop with range' },
          { label: 'listcomp', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '[${1:x} for ${1:x} in ${2:iterable}]', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'List comprehension' },
          { label: 'dictcomp', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '{${1:k}: ${2:v} for ${1:k}, ${2:v} in ${3:iterable}}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Dictionary comprehension' },
          { label: 'ifmain', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'if __name__ == "__main__":\n    ${1:main()}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Main guard' },
        );

        return { suggestions };
      },
    });

    // Enable parameter hints
    monaco.languages.registerSignatureHelpProvider('python', {
      signatureHelpTriggerCharacters: ['(', ','],
      provideSignatureHelp: () => {
        return {
          dispose: () => {},
          value: {
            signatures: [
              {
                label: 'print(value, ..., sep=" ", end="\\n")',
                documentation: 'Print values to console',
                parameters: [
                  { label: 'value', documentation: 'Value to print' },
                  { label: 'sep', documentation: 'Separator between values' },
                  { label: 'end', documentation: 'String appended after the last value' },
                ],
              },
            ],
            activeSignature: 0,
            activeParameter: 0,
          },
        };
      },
    });

    // Register Java autocomplete provider
    monaco.languages.registerCompletionItemProvider('java', {
      triggerCharacters: ['.', ' ', '(', '\n'],
      provideCompletionItems: async (model, position) => {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions: any[] = [];

        // Get AI-powered suggestions for Java
        try {
          const code = model.getValue();
          const aiSuggestions = await getAiCompletions({
            code,
            cursorPosition: { line: position.lineNumber - 1, column: position.column },
            language: 'java',
          });

          aiSuggestions.forEach((suggestion, index) => {
            suggestions.push({
              label: `🤖 AI: ${suggestion.split('\n')[0].substring(0, 50)}...`,
              kind: monaco.languages.CompletionItemKind.Text,
              insertText: suggestion,
              documentation: 'AI-generated suggestion',
              detail: 'AI Completion',
              sortText: `0${index}`,
              preselect: index === 0,
              range,
            });
          });
        } catch (error) {
          console.warn('AI completions unavailable:', error);
        }

        // Java snippets
        if (textUntilPosition.trim().endsWith('psvm')) {
          suggestions.push({
            label: 'psvm - public static void main',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'public static void main(String[] args) {\n\t$0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Main method',
            range,
          });
        }

        if (textUntilPosition.trim().endsWith('sout')) {
          suggestions.push({
            label: 'sout - System.out.println',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'System.out.println($0);',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Print to console',
            range,
          });
        }

        if (textUntilPosition.trim().endsWith('for')) {
          suggestions.push({
            label: 'for - enhanced for loop',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'for (${1:Type} ${2:item} : ${3:collection}) {\n\t$0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Enhanced for loop',
            range,
          });
        }

        // Java keywords and common classes
        const javaKeywords = [
          'public', 'private', 'protected', 'static', 'final', 'class', 'interface',
          'extends', 'implements', 'return', 'if', 'else', 'for', 'while', 'do',
          'switch', 'case', 'default', 'break', 'continue', 'try', 'catch', 'finally',
          'throw', 'throws', 'new', 'this', 'super', 'void', 'int', 'String',
          'boolean', 'double', 'float', 'long', 'char', 'byte', 'short'
        ];

        javaKeywords.forEach((keyword) => {
          if (keyword.startsWith(word.word)) {
            suggestions.push({
              label: keyword,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: keyword,
              range,
            });
          }
        });

        // Common Java classes
        const javaClasses = [
          'System', 'String', 'Integer', 'ArrayList', 'HashMap', 'List', 'Map',
          'Scanner', 'Math', 'Arrays', 'Collections', 'Exception'
        ];

        javaClasses.forEach((className) => {
          if (className.toLowerCase().startsWith(word.word.toLowerCase())) {
            suggestions.push({
              label: className,
              kind: monaco.languages.CompletionItemKind.Class,
              insertText: className,
              range,
            });
          }
        });

        return { suggestions };
      },
    });
  };

  // Apply error markers to the editor model
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;

    const monaco = monacoRef.current;

    const markers =
      errors?.map((err) => ({
        startLineNumber: err.line,
        endLineNumber: err.line,
        startColumn: 1,
        endColumn: 1000,
        message: err.message,
        severity: monaco.MarkerSeverity.Error,
      })) ?? [];

    monaco.editor.setModelMarkers(model, 'executionErrors', markers);
  }, [errors, value, language]);

  const lineCount = value ? value.split('\n').length : 0;

  return (
    <div className="h-full w-full relative overflow-hidden">
      <Editor
        height={height}
        language={getMonacoLanguage(language)}
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme={theme}
        options={{
          minimap: { enabled: true },
          fontSize: fontSize,
          lineNumbers: 'on',
          wordWrap: 'on',
          automaticLayout: true,
          scrollBeyondLastLine: false,
          fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
          fontLigatures: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          padding: { top: 16, bottom: 16 },
          bracketPairColorization: {
            enabled: true
          },
          guides: {
            bracketPairs: true,
            indentation: true
          },
          renderWhitespace: 'selection',
          renderLineHighlight: 'all',
        }}
      />
      <div className="pointer-events-none absolute bottom-2 left-3 text-[11px] px-2 py-0.5 rounded bg-black/40 text-gray-100 border border-white/10">
        {lineCount} lines
      </div>
    </div>
  );
}