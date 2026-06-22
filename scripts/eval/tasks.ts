/**
 * A small Aider-Polyglot-style benchmark: each task asks the agent to write a
 * solution to a precise spec, then a hidden verification command checks it.
 * Score = pass@1 (fraction whose verification passes). Multi-language on
 * purpose, to mirror how modern coding benchmarks avoid Python-only bias.
 */
export interface EvalTask {
  id: string;
  lang: 'js' | 'python';
  prompt: string;
  /** Files seeded into the workspace before the agent runs (e.g. hidden tests). */
  seed?: Record<string, string>;
  /** Command run after the agent finishes; task passes iff exit 0 AND stdout includes `expect`. */
  verify: { command: string; expect: string };
}

export const EVAL_TASKS: EvalTask[] = [
  {
    id: 'js-fizzbuzz',
    lang: 'js',
    prompt:
      'Create `fizzbuzz.js` that prints numbers 1..15, one per line, but "Fizz" for multiples of 3, "Buzz" for multiples of 5, and "FizzBuzz" for multiples of 15. Then run it to verify.',
    verify: { command: 'node fizzbuzz.js', expect: 'FizzBuzz' },
  },
  {
    id: 'py-palindrome',
    lang: 'python',
    prompt:
      'Create `palindrome.py` defining a function `is_palindrome(s)` that ignores case and non-alphanumeric characters. The provided `test_palindrome.py` must pass.',
    seed: {
      'test_palindrome.py': `from palindrome import is_palindrome
assert is_palindrome("A man, a plan, a canal: Panama")
assert not is_palindrome("hello")
assert is_palindrome("")
print("PALINDROME_OK")
`,
    },
    verify: { command: 'python3 test_palindrome.py', expect: 'PALINDROME_OK' },
  },
  {
    id: 'js-fib',
    lang: 'js',
    prompt:
      'Create `fib.js` that exports (CommonJS `module.exports`) a function `fib(n)` returning the nth Fibonacci number with fib(0)=0, fib(1)=1. The provided `test_fib.js` must pass.',
    seed: {
      'test_fib.js': `const fib = require('./fib');
if (fib(0)!==0 || fib(1)!==1 || fib(10)!==55) { console.error('FAIL'); process.exit(1); }
console.log('FIB_OK');
`,
    },
    verify: { command: 'node test_fib.js', expect: 'FIB_OK' },
  },
  {
    id: 'py-wordcount',
    lang: 'python',
    prompt:
      'Create `wordcount.py` with a function `top_word(text)` returning the most frequent lowercase word (split on whitespace, strip punctuation). The provided `test_wordcount.py` must pass.',
    seed: {
      'test_wordcount.py': `from wordcount import top_word
assert top_word("the cat sat on the mat the") == "the"
print("WC_OK")
`,
    },
    verify: { command: 'python3 test_wordcount.py', expect: 'WC_OK' },
  },
  {
    id: 'js-anagram',
    lang: 'js',
    prompt:
      'Create `anagram.js` exporting `isAnagram(a, b)` (case-insensitive, ignore spaces). The provided `test_anagram.js` must pass.',
    seed: {
      'test_anagram.js': `const { isAnagram } = require('./anagram');
if (!isAnagram('Listen','Silent') || isAnagram('foo','bar')) { console.error('FAIL'); process.exit(1); }
console.log('ANAGRAM_OK');
`,
    },
    verify: { command: 'node test_anagram.js', expect: 'ANAGRAM_OK' },
  },
];
