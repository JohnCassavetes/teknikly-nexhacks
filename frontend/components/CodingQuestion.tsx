import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { codingQuestions } from '@/lib/constants';
import Editor from '@monaco-editor/react';

type Language = 'python';

const defaultCode = {
    python: `def solution():
    # Write your code here
    print("Hello, World!")

print(solution())`,
};

// EMKC API language mapping
const languageConfig = {
    python: { language: 'python', version: '3.10.0', fileName: 'main.py' }
};

export default function CodingQuestion() {
    const demoQ = codingQuestions[0];
    const [language, setLanguage] = useState<Language>('python');
    const [code, setCode] = useState(defaultCode.python);
    const [output, setOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);

    const handleRunCode = async () => {
        setIsRunning(true);
        setOutput('Running code...\n');

        try {
            const config = languageConfig[language];
            const response = await fetch('https://emkc.org/api/v2/piston/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    language: config.language,
                    version: config.version,
                    files: [
                        {
                            name: config.fileName,
                            content: code,
                        },
                    ],
                }),
            });

            const data = await response.json();

            if (data.run) {
                let result = '';

                // Add stdout if available
                if (data.run.stdout) {
                    result += data.run.stdout;
                }

                // Add stderr if available
                if (data.run.stderr) {
                    result += '\n[Error]\n' + data.run.stderr;
                }

                // If no output, show success message
                if (!result.trim()) {
                    result = 'Code executed successfully with no output.';
                }

                setOutput(result);
            } else {
                setOutput('Error: Unable to execute code. Please try again.');
            }
        } catch (error) {
            console.error('Code execution error:', error);
            setOutput('Error: Failed to connect to code execution service.\n' + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Question and its description */}
            <div className="lg:col-span-1 space-y-4">
                <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800 flex flex-col gap-2 justify-center">

                    <h3 className="font-medium mb-2 text-xl">{demoQ.name}</h3>
                    <p className="text-sm">{demoQ.desc}</p>

                    {demoQ.examples.map((example, i) => (
                        <div key={i} className="flex flex-col">
                            <p className="text-sm font-bold">Example {i + 1}</p>
                            <p className="text-sm">Input: {example.input}</p>
                            <p className="text-sm">Output: {example.output}</p>
                            <p className="text-sm">Explanation: {example.explanation}</p>
                        </div>
                    ))}


                </div>
            </div>

            {/* Coding box */}
            <div className="lg:col-span-2 space-y-4">
                <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden flex flex-col h-full">
                    {/* Language selector and controls */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-800">
                        <div className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white">
                            Python
                        </div>
                        <button
                            onClick={handleRunCode}
                            disabled={isRunning}
                            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                        >
                            {isRunning ? 'Running...' : 'Run Code'}
                        </button>
                    </div>

                    {/* Code Editor */}
                    <div className="flex-1 overflow-hidden">
                        <Editor
                            height="100%"
                            language={language}
                            value={code}
                            onChange={(value) => setCode(value || '')}
                            theme="vs-dark"
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                tabSize: 2,
                                wordWrap: 'on',
                                scrollbar: {
                                    vertical: 'auto',
                                    horizontal: 'auto',
                                    verticalScrollbarSize: 10,
                                    horizontalScrollbarSize: 10,
                                }
                            }}
                        />
                    </div>

                    {/* Output section */}
                    {output && (
                        <div className="border-t border-gray-800 p-4 bg-gray-950/50 max-h-[200px] overflow-y-auto">
                            <div className="text-sm font-medium text-gray-400 mb-2">Output:</div>
                            <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">{output}</pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
