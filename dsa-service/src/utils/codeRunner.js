// // ================================================================
// // PISTON API — Free code execution, no API key needed
// // https://github.com/engineer-man/piston
// // Public API: https://emkc.org/api/v2/piston
// // Supports: Python, JavaScript, Java, C++, 50+ languages
// // FREE: No key, no limit (fair use)
// // ================================================================

// const https = require('https');

// // Piston language mapping
// const PISTON_LANGS = {
//   javascript: { language: 'javascript', version: '18.15.0' },
//   python:     { language: 'python',     version: '3.10.0' },
//   java:       { language: 'java',       version: '15.0.2' },
//   cpp:        { language: 'c++',        version: '10.2.0' },
//   c:          { language: 'c',          version: '10.2.0' },
// }; 

// const pistonRequest = (body) => {
//   return new Promise((resolve, reject) => {
//     const data = JSON.stringify(body);
   

//     const options = {
//       hostname: 'emkc.org',
//       port: 443,
//       path: '/api/v2/piston/execute',
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Content-Length': Buffer.byteLength(data),
//       },
//     };

//     const req = https.request(options, (res) => {
//       let output = '';
//       res.on('data', chunk => output += chunk);
//     //   res.on('end', () => {
//     //     try { resolve(JSON.parse(output)); }
//     //     catch { reject(new Error('Invalid Piston response')); }
//     //   });
//     // });

//     res.on('end', () => {
//       try {
//         const parsed = JSON.parse(output);
//         if (parsed.message) {
//           reject(new Error(parsed.message));
//         } else {
//           resolve(parsed);
//         }
//       } catch (e) {
//         reject(new Error('Invalid response: ' + output.substring(0, 100)));
//       }
//     });
//   });

//     req.on('error', reject);
//     req.setTimeout(15000, () => { req.destroy(); reject(new Error('Code execution timeout')); });
//     req.write(data);
//     req.end();
//   });
// };

// const runCode = async ({ code, language, input = '' }) => {
//   const lang = PISTON_LANGS[language];
//   if (!lang) {
//     return { success: false, output: `Language '${language}' not supported`, status: 'error' };
//   }

//   try {
//     const result = await pistonRequest({
//       language: lang.language,
//       version: lang.version,
//       files: [{ name: `main${getExtension(language)}`, content: code }],
//       stdin: input,
//       compile_timeout: 10000,
//       run_timeout: 5000,
//     });

//     if (!result || (!result.run && !result.compile)) {
//       return { success: false, status: 'error', output: 'Execution service unavailable. Try again.', runtime: 0 };
//     }

//     const { run, compile } = result;

//     if (compile && compile.code !== 0) {
//       return {
//         success: false,
//         status: 'compile_error',
//         output: compile.stderr || compile.stdout || 'Compilation failed',
//         runtime: 0,
//       };
//     }

//     const isError = run.code !== 0;
//     const output = run.stdout || run.stderr || '(no output)';

//     return {
//       success: !isError,
//       status: isError ? 'runtime_error' : 'executed',
//       output,
//       runtime: run.wall_time || 0,
//       exitCode: run.code,
//     };
//   } catch (err) {
//     return { success: false, status: 'error', output: `Execution failed: ${err.message}`, runtime: 0 };
//   }
// };

// const submitCode = async ({ code, language, testCases }) => {
//   const lang = PISTON_LANGS[language];
//   if (!lang) return { status: 'error', testsPassed: 0, testsTotal: testCases.length };

//   let testsPassed = 0;
//   let finalStatus = 'accepted';
//   let errorMessage = '';
//   let maxRuntime = 0;

//   for (const tc of testCases) {
//     try {
//       const result = await pistonRequest({
//         language: lang.language,
//         version: lang.version,
//         files: [{ name: `main${getExtension(language)}`, content: code }],
//         stdin: tc.input || '',
//         run_timeout: 5000,
//       });

//       if (!result || (!result.run && !result.compile)) {
//         finalStatus = 'runtime_error';
//         errorMessage = 'Execution service unavailable';
//         break;
//       }

//       const { run, compile } = result;

//       if (compile && compile.code !== 0) {
//         finalStatus = 'compile_error';
//         errorMessage = compile.stderr || 'Compilation failed';
//         break;
//       }

//       if (run.code !== 0) {
//         finalStatus = 'runtime_error';
//         errorMessage = run.stderr || 'Runtime error';
//         break;
//       }

//       maxRuntime = Math.max(maxRuntime, run.wall_time || 0);

//       const actualOutput = (run.stdout || '').trim();
//       const expectedOutput = (tc.expectedOutput || '').trim();

//       if (actualOutput === expectedOutput) {
//         testsPassed++;
//       } else {
//         finalStatus = 'wrong_answer';
//         break;
//       }
//     } catch (err) {
//       finalStatus = 'runtime_error';
//       errorMessage = err.message;
//       break;
//     }
//   }

//   return {
//     status: finalStatus,
//     testsPassed,
//     testsTotal: testCases.length,
//     runtime: `${maxRuntime}ms`,
//     errorMessage: errorMessage || undefined,
//   };
// };

// const getExtension = (lang) => {
//   const ext = { javascript: '.js', python: '.py', java: '.java', cpp: '.cpp', c: '.c' };
//   return ext[lang] || '.txt';
// };

// module.exports = { runCode, submitCode };



// const { exec } = require('child_process');
// const fs = require('fs');
// const path = require('path');
// const os = require('os');

// const SUPPORTED = ['javascript', 'python', 'java', 'cpp', 'c'];

// const getExtension = (lang) => {
//   const ext = { javascript: '.js', python: '.py', java: '.java', cpp: '.cpp', c: '.c' };
//   return ext[lang] || '.txt';
// };

// const getCommand = (lang, filePath, className) => {
//   switch(lang) {
//     case 'javascript': return `node "${filePath}"`;
//     case 'python': return `python "${filePath}"`;
//     case 'java': return `javac "${filePath}" && java -cp "${path.dirname(filePath)}" ${className}`;
//     case 'cpp': return `g++ "${filePath}" -o "${filePath}.out" && "${filePath}.out"`;
//     case 'c': return `gcc "${filePath}" -o "${filePath}.out" && "${filePath}.out"`;
//     default: return null;
//   }
// };

// const executeCode = (code, language, input = '') => {
//   return new Promise((resolve) => {
//     const tmpDir = os.tmpdir();
//     const fileName = `code_${Date.now()}${getExtension(language)}`;
//     const filePath = path.join(tmpDir, fileName);

//     fs.writeFileSync(filePath, code);

//     const className = language === 'java' ? (code.match(/public\s+class\s+(\w+)/)?.[1] || 'Main') : null;
//     const command = getCommand(language, filePath, className);

//     if (!command) {
//       resolve({ success: false, output: 'Language not supported', status: 'error', runtime: 0 });
//       return;
//     }

//     const startTime = Date.now();

//     const child = exec(command, { timeout: 10000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
//       const runtime = Date.now() - startTime;

//       // Cleanup
//       try { fs.unlinkSync(filePath); } catch {}
//       try { fs.unlinkSync(filePath + '.out'); } catch {}

//       if (error && error.killed) {
//         resolve({ success: false, status: 'time_limit', output: 'Time limit exceeded (10s)', runtime });
//         return;
//       }

//       if (stderr && !stdout) {
//         resolve({ success: false, status: 'runtime_error', output: stderr.trim(), runtime });
//         return;
//       }

//       resolve({
//         success: true,
//         status: 'executed',
//         output: stdout.trim() || stderr.trim() || '(no output)',
//         runtime,
//         exitCode: error ? 1 : 0,
//       });
//     });

//     // Send input
//     if (input && child.stdin) {
//       child.stdin.write(input);
//       child.stdin.end();
//     }
//   });
// };

// const runCode = async ({ code, language, input = '' }) => {
//   if (!SUPPORTED.includes(language)) {
//     return { success: false, output: `Language '${language}' not supported`, status: 'error' };
//   }
//   return await executeCode(code, language, input);
// };

// const submitCode = async ({ code, language, testCases }) => {
//   if (!SUPPORTED.includes(language)) {
//     return { status: 'error', testsPassed: 0, testsTotal: testCases.length };
//   }

//   let testsPassed = 0;
//   let finalStatus = 'accepted';
//   let errorMessage = '';
//   let maxRuntime = 0;

//   for (const tc of testCases) {
//     const result = await executeCode(code, language, tc.input || '');

//     if (!result.success && result.status === 'time_limit') {
//       finalStatus = 'time_limit_exceeded';
//       errorMessage = 'Time limit exceeded';
//       break;
//     }

//     if (!result.success && result.status === 'runtime_error') {
//       finalStatus = 'runtime_error';
//       errorMessage = result.output;
//       break;
//     }

//     maxRuntime = Math.max(maxRuntime, result.runtime || 0);

//     const actualOutput = (result.output || '').trim();
//     const expectedOutput = (tc.expectedOutput || '').trim();

//     if (actualOutput === expectedOutput) {
//       testsPassed++;
//     } else {
//       finalStatus = 'wrong_answer';
//       errorMessage = `Expected: ${expectedOutput}\nGot: ${actualOutput}`;
//       break;
//     }
//   }

//   return {
//     status: finalStatus,
//     testsPassed,
//     testsTotal: testCases.length,
//     runtime: `${maxRuntime}ms`,
//     errorMessage: errorMessage || undefined,
//   };
// };

// module.exports = { runCode, submitCode };




const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

const SUPPORTED = ['javascript', 'python', 'java', 'cpp', 'c'];

const getExtension = (lang) => {
  const ext = { javascript: '.js', python: '.py', java: '.java', cpp: '.cpp', c: '.c' };
  return ext[lang] || '.txt';
};

// ─── WANDBOX API (free, no key) ───────────────────────────────
const WANDBOX_COMPILERS = {
  javascript: 'nodejs-head',
  python: 'cpython-3.10.4',
  java: 'openjdk-17.0.2',
  cpp: 'gcc-head',
  c: 'gcc-head',
};

const wandboxRequest = (code, language, input = '') => {
  return new Promise((resolve, reject) => {
    const compiler = WANDBOX_COMPILERS[language];
    const body = JSON.stringify({
      compiler,
      code,
      stdin: input,
      'compiler-option-raw': language === 'c' ? '-x c' : '',
    });

    const options = {
      hostname: 'wandbox.org',
      port: 443,
      path: '/api/compile.json',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let output = '';
      res.on('data', chunk => output += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(output)); }
        catch { reject(new Error('Invalid response')); }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
};

// ─── LOCAL FALLBACK ───────────────────────────────────────────
const getCommand = (lang, filePath, className) => {
  switch(lang) {
    case 'javascript': return `node "${filePath}"`;
    case 'python': return `python "${filePath}"`;
    case 'java': return `javac "${filePath}" && java -cp "${path.dirname(filePath)}" ${className}`;
    case 'cpp': return `g++ "${filePath}" -o "${filePath}.out" && "${filePath}.out"`;
    case 'c': return `gcc "${filePath}" -o "${filePath}.out" && "${filePath}.out"`;
    default: return null;
  }
};

const localExecute = (code, language, input = '') => {
  return new Promise((resolve) => {
    const tmpDir = os.tmpdir();
    const fileName = `code_${Date.now()}${getExtension(language)}`;
    const filePath = path.join(tmpDir, fileName);
    fs.writeFileSync(filePath, code);

    const className = language === 'java'
      ? (code.match(/public\s+class\s+(\w+)/)?.[1] || 'Main')
      : null;
    const command = getCommand(language, filePath, className);

    if (!command) {
      resolve({ success: false, output: 'Language not supported', status: 'error', runtime: 0 });
      return;
    }

    const startTime = Date.now();
    const child = exec(command, { timeout: 10000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      const runtime = Date.now() - startTime;
      try { fs.unlinkSync(filePath); } catch {}
      try { fs.unlinkSync(filePath + '.out'); } catch {}

      if (error?.killed) {
        resolve({ success: false, status: 'time_limit', output: 'Time limit exceeded', runtime });
        return;
      }
      if (stderr && !stdout) {
        resolve({ success: false, status: 'runtime_error', output: stderr.trim(), runtime });
        return;
      }
      resolve({
        success: true, status: 'executed',
        output: stdout.trim() || '(no output)',
        runtime, exitCode: error ? 1 : 0,
      });
    });

    if (input && child.stdin) { child.stdin.write(input); child.stdin.end(); }
  });
};

// ─── MAIN EXECUTE (Wandbox first, local fallback) ─────────────
const executeCode = async (code, language, input = '') => {
  try {
    const startTime = Date.now();
    const result = await wandboxRequest(code, language, input);
    const runtime = Date.now() - startTime;

    if (result.status === 0 || result.program_output !== undefined) {
      const output = result.program_output || result.compiler_output || '(no output)';
      const isError = result.status !== 0;
      return {
        success: !isError,
        status: isError ? 'runtime_error' : 'executed',
        output: output.trim(),
        runtime,
        source: 'wandbox',
      };
    }

    if (result.compiler_error) {
      return {
        success: false, status: 'compile_error',
        output: result.compiler_error.trim(), runtime,
      };
    }

    // Fallback to local
    return await localExecute(code, language, input);

  } catch (err) {
    // Fallback to local if Wandbox fails
    return await localExecute(code, language, input);
  }
};

const runCode = async ({ code, language, input = '' }) => {
  if (!SUPPORTED.includes(language)) {
    return { success: false, output: `Language '${language}' not supported`, status: 'error' };
  }
  return await executeCode(code, language, input);
};

const submitCode = async ({ code, language, testCases }) => {
  if (!SUPPORTED.includes(language)) {
    return { status: 'error', testsPassed: 0, testsTotal: testCases.length };
  }

  let testsPassed = 0;
  let finalStatus = 'accepted';
  let errorMessage = '';
  let maxRuntime = 0;

  for (const tc of testCases) {
    const result = await executeCode(code, language, tc.input || '');

    if (result.status === 'time_limit') {
      finalStatus = 'time_limit_exceeded';
      errorMessage = 'Time limit exceeded';
      break;
    }

    if (result.status === 'compile_error') {
      finalStatus = 'compile_error';
      errorMessage = result.output;
      break;
    }

    if (!result.success && result.status === 'runtime_error') {
      finalStatus = 'runtime_error';
      errorMessage = result.output;
      break;
    }

    maxRuntime = Math.max(maxRuntime, result.runtime || 0);

    const actualOutput = (result.output || '').trim().replace(/,\s+/g, ',').replace(/\s+/g, '');
    const expectedOutput = (tc.expectedOutput || '').trim().replace(/,\s+/g, ',').replace(/\s+/g, '');

    if (actualOutput === expectedOutput) {
      testsPassed++;
    } else {
      finalStatus = 'wrong_answer';
      errorMessage = `Expected: ${expectedOutput}\nGot: ${actualOutput}`;
      break;
    }
  }
  return {
    status: finalStatus,
    testsPassed,
    testsTotal: testCases.length,
    runtime: `${maxRuntime}ms`,
    errorMessage: errorMessage || undefined,
  };
};

module.exports = { runCode, submitCode };