import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { codingQuestions } from '@/lib/constants';
import Editor from '@monaco-editor/react';

type Language = 'javascript' | 'python' | 'java' | 'cpp';

const defaultCode = {
    javascript: `function solution() {
    // Write your code here

}`,
    python: `def solution():
    # Write your code here
    pass`,
    java: `class Solution {
    public void solution() {
            // Write your code here

        }
    }`,
    cpp: `class Solution {
public:
    void solution() {
        // Write your code here

    }
};`
};

export default function CodingQuestion() {
    const demoQ = codingQuestions[0];
    const [language, setLanguage] = useState<Language>('javascript');
    const [code, setCode] = useState(defaultCode.javascript);
    const [output, setOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);

    const handleLanguageChange = (newLanguage: Language) => {
        setLanguage(newLanguage);
        setCode(defaultCode[newLanguage]);
        setOutput('');
    };

    const handleRunCode = () => {
        setIsRunning(true);
        setOutput('Running code...\n');

        // Simulate code execution (in a real app, you'd send this to a backend)
        setTimeout(() => {
            setOutput(`Code executed successfully!\nLanguage: ${language}\n\nNote: This is a demo. Connect to a code execution API for real results.`);
            setIsRunning(false);
        }, 1000);
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
                <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden flex flex-col h-fit">
                    {/* Language selector and controls */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-800">
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleLanguageChange('javascript')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    language === 'javascript'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                                JavaScript
                            </button>
                            <button
                                onClick={() => handleLanguageChange('python')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    language === 'python'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                                Python
                            </button>
                            <button
                                onClick={() => handleLanguageChange('java')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    language === 'java'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                                Java
                            </button>
                            <button
                                onClick={() => handleLanguageChange('cpp')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    language === 'cpp'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                                C++
                            </button>
                        </div>
                        <button
                            onClick={handleRunCode}
                            disabled={isRunning}
                            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
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
