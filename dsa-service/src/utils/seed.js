const { DSAProblem } = require('../models/dsa.model');
const logger = require('../config/logger');

const SAMPLE_PROBLEMS = [
  {
    title: 'Two Sum',
    slug: 'two-sum',
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

**Example 1:**
\`\`\`
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: nums[0] + nums[1] == 9
\`\`\`

**Example 2:**
\`\`\`
Input: nums = [3,2,4], target = 6
Output: [1,2]
\`\`\`

**Constraints:**
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9`,
    difficulty: 'easy',
    category: 'arrays',
    tags: ['hash-map', 'array'],
    companies: ['google', 'amazon', 'facebook', 'microsoft'],
    starterCode: {
      javascript: `/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nfunction twoSum(nums, target) {\n    // Your code here\n};\n\n// Read input\nconst lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');\nconst nums = JSON.parse(lines[0]);\nconst target = parseInt(lines[1]);\nconsole.log(JSON.stringify(twoSum(nums, target)));`,
      python: `def twoSum(nums, target):\n    # Your code here\n    pass\n\nimport sys\ndata = sys.stdin.read().strip().split('\\n')\nnums = list(map(int, data[0].strip('[]').split(',')))\ntarget = int(data[1])\nprint(twoSum(nums, target))`,
    },
    solutionCode: {
      javascript: `function twoSum(nums, target) {\n    const map = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const complement = target - nums[i];\n        if (map.has(complement)) return [map.get(complement), i];\n        map.set(nums[i], i);\n    }\n}`,
      python: `def twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in seen:\n            return [seen[complement], i]\n        seen[num] = i`,
    },
    testCases: [
      { input: '[2,7,11,15]\n9', expectedOutput: '[0,1]', isHidden: false, explanation: 'nums[0]+nums[1]=9' },
      { input: '[3,2,4]\n6', expectedOutput: '[1,2]', isHidden: false },
      { input: '[3,3]\n6', expectedOutput: '[0,1]', isHidden: true },
    ],
    hints: [
      'Think about what complement you need for each number.',
      'Use a hash map to store numbers you have already seen.',
      'For each number, check if (target - number) exists in your map.',
    ],
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(n)',
    explanation: 'Use a hash map. For each element, check if its complement (target - current) already exists in the map.',
  },
  {
    title: 'Valid Parentheses',
    slug: 'valid-parentheses',
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

**Example 1:** Input: s = "()" → Output: true
**Example 2:** Input: s = "()[]{}" → Output: true
**Example 3:** Input: s = "(]" → Output: false`,
    difficulty: 'easy',
    category: 'stack_queue',
    tags: ['stack', 'string'],
    companies: ['amazon', 'microsoft', 'google'],
    starterCode: {
      javascript: `function isValid(s) {\n    // Your code here\n};\nconst s = require('fs').readFileSync('/dev/stdin','utf8').trim();\nconsole.log(isValid(s));`,
      python: `def isValid(s):\n    # Your code here\n    pass\nimport sys\ns = sys.stdin.read().strip()\nprint(isValid(s))`,
    },
    solutionCode: {
      javascript: `function isValid(s) {\n    const stack = [];\n    const map = { ')':'(', '}':'{', ']':'[' };\n    for (const c of s) {\n        if ('({['.includes(c)) stack.push(c);\n        else if (stack.pop() !== map[c]) return false;\n    }\n    return stack.length === 0;\n}`,
    },
    testCases: [
      { input: '()', expectedOutput: 'true', isHidden: false },
      { input: '()[]{}"', expectedOutput: 'true', isHidden: false },
      { input: '(]', expectedOutput: 'false', isHidden: false },
      { input: '([)]', expectedOutput: 'false', isHidden: true },
    ],
    hints: ['Think about using a stack data structure.', 'Push opening brackets, pop when you see a closing one.'],
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(n)',
  },
  {
    title: 'Maximum Subarray',
    slug: 'maximum-subarray',
    description: `Given an integer array \`nums\`, find the subarray with the largest sum, and return its sum.

**Example:** Input: nums = [-2,1,-3,4,-1,2,1,-5,4] → Output: 6
Explanation: [4,-1,2,1] has the largest sum = 6.`,
    difficulty: 'medium',
    category: 'dynamic_programming',
    tags: ['dynamic-programming', 'array', 'divide-and-conquer'],
    companies: ['amazon', 'apple', 'microsoft'],
    starterCode: {
      javascript: `function maxSubArray(nums) {\n    // Your code here\n};\nconst nums = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8').trim());\nconsole.log(maxSubArray(nums));`,
      python: `def maxSubArray(nums):\n    # Your code here\n    pass\nimport sys\nnums = list(map(int, sys.stdin.read().strip().strip('[]').split(',')))\nprint(maxSubArray(nums))`,
    },
    solutionCode: {
      javascript: `function maxSubArray(nums) {\n    let maxSum = nums[0], curr = nums[0];\n    for (let i = 1; i < nums.length; i++) {\n        curr = Math.max(nums[i], curr + nums[i]);\n        maxSum = Math.max(maxSum, curr);\n    }\n    return maxSum;\n}`,
    },
    testCases: [
      { input: '[-2,1,-3,4,-1,2,1,-5,4]', expectedOutput: '6', isHidden: false },
      { input: '[1]', expectedOutput: '1', isHidden: false },
      { input: '[5,4,-1,7,8]', expectedOutput: '23', isHidden: false },
    ],
    hints: ["Think about Kadane's algorithm.", 'At each position, decide: extend the existing subarray or start a new one?'],
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
  },
  {
    title: 'Binary Search',
    slug: 'binary-search',
    description: `Given an array of integers \`nums\` which is sorted in ascending order, and an integer \`target\`, write a function to search \`target\` in \`nums\`. If \`target\` exists, return its index. Otherwise, return \`-1\`.

**Must achieve O(log n) runtime complexity.**

**Example:** Input: nums = [-1,0,3,5,9,12], target = 9 → Output: 4`,
    difficulty: 'easy',
    category: 'searching',
    tags: ['binary-search', 'array'],
    companies: ['facebook', 'amazon', 'apple'],
    starterCode: {
      javascript: `function search(nums, target) {\n    // Your code here\n};\nconst lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');\nconsole.log(search(JSON.parse(lines[0]), parseInt(lines[1])));`,
      python: `def search(nums, target):\n    # Your code here\n    pass\nimport sys\ndata = sys.stdin.read().strip().split('\\n')\nnums = list(map(int, data[0].strip('[]').split(',')))\ntarget = int(data[1])\nprint(search(nums, target))`,
    },
    solutionCode: {
      javascript: `function search(nums, target) {\n    let l = 0, r = nums.length - 1;\n    while (l <= r) {\n        const mid = Math.floor((l + r) / 2);\n        if (nums[mid] === target) return mid;\n        if (nums[mid] < target) l = mid + 1;\n        else r = mid - 1;\n    }\n    return -1;\n}`,
    },
    testCases: [
      { input: '[-1,0,3,5,9,12]\n9', expectedOutput: '4', isHidden: false },
      { input: '[-1,0,3,5,9,12]\n2', expectedOutput: '-1', isHidden: false },
    ],
    hints: ['Maintain left and right pointers.', 'Check the middle element each iteration.'],
    timeComplexity: 'O(log n)',
    spaceComplexity: 'O(1)',
  },
  {
    title: 'LRU Cache',
    slug: 'lru-cache',
    description: `Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.

Implement the \`LRUCache\` class with:
- \`LRUCache(int capacity)\` — Initialize with positive capacity
- \`int get(int key)\` — Return value if exists, else -1
- \`void put(int key, int value)\` — Update or insert. Evict LRU key if capacity exceeded.

**Both operations must run in O(1) time.**`,
    difficulty: 'hard',
    category: 'hashing',
    tags: ['hash-map', 'linked-list', 'design'],
    companies: ['google', 'amazon', 'facebook', 'microsoft', 'apple'],
    starterCode: {
      javascript: `class LRUCache {\n    constructor(capacity) {\n        // Your code here\n    }\n    get(key) {\n        // Your code here\n    }\n    put(key, value) {\n        // Your code here\n    }\n}`,
      python: `class LRUCache:\n    def __init__(self, capacity):\n        # Your code here\n        pass\n    def get(self, key):\n        # Your code here\n        pass\n    def put(self, key, value):\n        # Your code here\n        pass`,
    },
    solutionCode: {
      javascript: `class LRUCache {\n    constructor(capacity) {\n        this.cap = capacity;\n        this.map = new Map();\n    }\n    get(key) {\n        if (!this.map.has(key)) return -1;\n        const val = this.map.get(key);\n        this.map.delete(key);\n        this.map.set(key, val);\n        return val;\n    }\n    put(key, value) {\n        if (this.map.has(key)) this.map.delete(key);\n        else if (this.map.size >= this.cap) this.map.delete(this.map.keys().next().value);\n        this.map.set(key, value);\n    }\n}`,
    },
    testCases: [
      { input: '2\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2\nput 4 4\nget 1\nget 3\nget 4', expectedOutput: '1\n-1\n1\n3\n4', isHidden: false },
    ],
    hints: ['Use a combination of HashMap and Doubly Linked List.', 'In JavaScript, Map maintains insertion order — use this!', 'Most recently used = at end, least = at start.'],
    timeComplexity: 'O(1) for both get and put',
    spaceComplexity: 'O(capacity)',
  },
];

const seedProblems = async () => {
  try {
    await DSAProblem.insertMany(SAMPLE_PROBLEMS);
    logger.info(`✅ Seeded ${SAMPLE_PROBLEMS.length} DSA problems`);
  } catch (err) {
    logger.error('Seed error:', err.message);
  }
};

module.exports = { seedProblems };
