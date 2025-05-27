import { useState } from 'react';
import { useCodeExecutor } from '../hooks/useCodeExecutor';
import { FiPlay, FiHelpCircle, FiCopy } from 'react-icons/fi';

import Editor from 'react-simple-code-editor';
// @ts-ignore
import { highlight } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/themes/prism.css'; //Example style, you can use another

let projfLang = {
  'boolean': /\b(?:false|true)\b/,
	'null': {
		pattern: /\bnull\b/,
		alias: 'keyword'
	},
  'number': /-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/i,
  'comment': {
		pattern: /\#.*/,
		greedy: true
	},
  'builtin': {
		pattern: /(setq)|(while)|(cond)|(func)|(lambda)|(lambda)|(quote)|(return)|(break)|(prog)|\'|`/,
		greedy: true
	}
}

function FancyEditor(props: {code: string, setCode: (arg0: string) => any}) {
   return (
     <div style={{border: "solid 1px"}}>
      <Editor
        value={props.code}
        onValueChange={code => props.setCode(code)}
        highlight={code => highlight(code, projfLang)}
        padding={10}
        style={{
          fontFamily: '"Fira code", "Fira Mono", monospace',
          fontSize: "1em",
        }}
      />
     </div>
  );
}

export const CodeRunner = () => {
  const [code, setCode] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [execute, response, isLoading, error] = useCodeExecutor();

  const handleRun = async () => {
    if (code.trim()) {
      await execute(code);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
  };

  const examples = [
    {
      name: 'Arithmetic',
      code: '(plus 5 (times 3 2))'
    },
    {
      name: 'Conditional',
      code: '(setq x -5)\n(cond (less x 0) (minus 0 x) x)'
    },
    {
      name: 'Function',
      code: '(func square (x) (times x x))\n(square 4)'
    },
    {
      name: 'List',
      code: '(cons 1 (cons 2 \'()))'
    },
    {
      name: 'Return',
      code: '(func r ()\n  (prog () (\n   (return \'ok)\n   \'fail\n  )\n )\n)\n\n(r)'
    },
    {
      name: 'Break',
      code: '(setq i 0)\n(while true \n  (prog () (\n      (cond (greater i 2) (break))\n      (setq i (plus i 1))\n    )\n  )\n)\ni'
    },
    {
      name: 'Fibonachi',
      code: '(func fib (N)\n    (cond (lesseq N 2)\n        1\n        (plus (fib (minus N 1)) (fib (minus N 2)))\n    )\n)\n\n(fib 10) # 55'
    },
    {
      name: 'Emoji',
      code: '(setq 🤯 5)\n(setq 🤖 7)\n(times 🤖 🤯)'
    },
    {
      name: 'Error',
      code: '(func fib (N)\n    (cond (lesseqq N 2)\n        1\n        (plus (fib (minus N 1)) (fib (minus N 2)))\n    )\n)\n\n(fib 10) # 55'
    },
  ];

  const loadExample = (exampleCode: string) => {
    setCode(exampleCode);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">F Language Playground</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-700">Editor</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowHelp(!showHelp)}
                  className="flex items-center px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                >
                  <FiHelpCircle className="mr-1" /> {showHelp ? 'Hide Help' : 'Show Help'}
                </button>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                  disabled={!code.trim()}
                >
                  <FiCopy className="mr-1" /> Copy
                </button>
              </div>
            </div>

            <div className="relative">
              <FancyEditor code={code} setCode={c => setCode(c) }/>
              <button
                onClick={handleRun}
                disabled={isLoading || !code.trim()}
                className={`absolute bottom-4 right-4 flex items-center px-4 py-2 rounded-lg shadow-md transition
                  ${isLoading || !code.trim()
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                <FiPlay className="mr-2" />
                {isLoading ? 'Running...' : 'Run Code'}
              </button>
            </div>
          </div>

          {/* Output/Help Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-700">Output</h2>
            <div className={`p-4 rounded-lg min-h-48 ${error ? 'bg-red-50 border border-red-200' : 'bg-white border border-gray-300'}`}>
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <pre className={`font-mono whitespace-pre-wrap ${error ? 'text-red-600' : 'text-gray-800'}`}>
                  {response?.output || error || 'Output will appear here...'}
                </pre>
              )}
            </div>

            {/* Examples Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Examples</h2>
              <div className="grid grid-cols-2 gap-2">
                {examples.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => loadExample(example.code)}
                    className="p-2 text-sm bg-gray-100 hover:bg-gray-200 rounded text-left truncate"
                    title={example.code}
                  >
                    {example.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Help Panel */}
        {showHelp && (
          <div className="mt-6 p-6 bg-white border border-gray-300 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">F Language Reference</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Basic Syntax</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li><code>(func name (params) body)</code> - Define function</li>
                  <li><code>(setq var value)</code> - Set variable</li>
                  <li><code>(plus a b)</code> - Add numbers</li>
                  <li><code>(cond test then else)</code> - Conditional</li>
                  <li><code>(while test body)</code> - While loop</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-700 mb-2">Data Types</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li><strong>Numbers:</strong> <code>42</code>, <code>-3.14</code></li>
                  <li><strong>Booleans:</strong> <code>true</code>, <code>false</code></li>
                  <li><strong>Lists:</strong> <code>(1 2 3)</code>, <code>(cons 1 null)</code></li>
                  <li><strong>Atoms:</strong> <code>x</code>, <code>my-var</code></li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-700 mb-2">Special Forms</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li><code>quote</code> / <code>'</code> - Prevent evaluation</li>
                  <li><code>lambda</code> - Anonymous function</li>
                  <li><code>prog</code> - Sequential execution</li>
                  <li><code>return</code> - Exit function</li>
                  <li><code>break</code> - Exit loop</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-700 mb-2">Built-in Functions</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li><strong>Math:</strong> <code>plus</code>, <code>minus</code>, <code>times</code>, <code>divide</code></li>
                  <li><strong>Lists:</strong> <code>head</code>, <code>tail</code>, <code>cons</code></li>
                  <li><strong>Logic:</strong> <code>and</code>, <code>or</code>, <code>not</code></li>
                  <li><strong>Comparison:</strong> <code>equal</code>, <code>less</code>, etc.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
