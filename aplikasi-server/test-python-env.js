#!/usr/bin/env node
/**
 * Python Environment Test Script
 * Tests Python installation and dependencies for METEOR and Sentence-BERT evaluation
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function testPythonCommand(command) {
  return new Promise((resolve) => {
    const process = spawn(command, ['--version']);
    let output = '';
    
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, version: output.trim() });
      } else {
        resolve({ success: false, error: 'Command not found' });
      }
    });
    
    process.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
  });
}

function testPythonPackage(pythonCommand, packageName) {
  return new Promise((resolve) => {
    const process = spawn(pythonCommand, ['-c', `import ${packageName}; print(${packageName}.__version__)`]);
    let output = '';
    let errorOutput = '';
    
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, version: output.trim() });
      } else {
        resolve({ success: false, error: errorOutput || 'Package not found' });
      }
    });
    
    process.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
  });
}

function testNLTKData(pythonCommand, dataName) {
  return new Promise((resolve) => {
    const pythonCode = `
import nltk
try:
    nltk.data.find('${dataName}')
    print('FOUND')
except LookupError:
    print('NOT_FOUND')
`;
    
    const process = spawn(pythonCommand, ['-c', pythonCode]);
    let output = '';
    
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0 && output.includes('FOUND')) {
        resolve({ success: true });
      } else {
        resolve({ success: false });
      }
    });
    
    process.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
  });
}

function testMeteorCalculation(pythonCommand) {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, 'src/python/meteor_calculator.py');
    const generatedText = 'Given user is logged in When user clicks logout Then user is logged out';
    const referenceText = 'Given user is authenticated When user clicks logout button Then user session is terminated';
    
    const process = spawn(pythonCommand, [scriptPath, generatedText, referenceText]);
    let output = '';
    let errorOutput = '';
    
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          if (result.success && result.score !== undefined) {
            resolve({ success: true, score: result.score });
          } else {
            resolve({ success: false, error: result.error || 'Invalid result' });
          }
        } catch (e) {
          resolve({ success: false, error: `Parse error: ${e.message}` });
        }
      } else {
        resolve({ success: false, error: errorOutput || 'Calculation failed' });
      }
    });
    
    process.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
  });
}

function testSentenceBertCalculation(pythonCommand) {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, 'src/python/sentence_bert_calculator.py');
    const generatedText = 'Given user is logged in When user clicks logout Then user is logged out';
    const referenceText = 'Given user is authenticated When user clicks logout button Then user session is terminated';
    
    const process = spawn(pythonCommand, [scriptPath, generatedText, referenceText]);
    let output = '';
    let errorOutput = '';
    
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          if (result.success && result.score !== undefined) {
            resolve({ success: true, score: result.score });
          } else {
            resolve({ success: false, error: result.error || 'Invalid result' });
          }
        } catch (e) {
          resolve({ success: false, error: `Parse error: ${e.message}` });
        }
      } else {
        resolve({ success: false, error: errorOutput || 'Calculation failed' });
      }
    });
    
    process.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
  });
}

async function main() {
  log('\n🐍 Python Environment Test for METEOR & Sentence-BERT\n', 'bright');
  
  // Test 1: Check Python installation
  log('1️⃣  Testing Python Installation...', 'cyan');
  
  const pythonCommands = ['python', 'python3'];
  let workingPythonCommand = null;
  
  for (const cmd of pythonCommands) {
    const result = await testPythonCommand(cmd);
    if (result.success) {
      log(`   ✅ ${cmd}: ${result.version}`, 'green');
      workingPythonCommand = cmd;
      break;
    } else {
      log(`   ❌ ${cmd}: ${result.error}`, 'red');
    }
  }
  
  if (!workingPythonCommand) {
    log('\n❌ Python not found! Please install Python 3.8+ from https://www.python.org/downloads/', 'red');
    process.exit(1);
  }
  
  // Test 2: Check Python packages
  log('\n2️⃣  Testing Python Packages...', 'cyan');
  
  const packages = [
    { name: 'nltk', import: 'nltk' },
    { name: 'deep-translator', import: 'deep_translator' },
    { name: 'langdetect', import: 'langdetect' },
    { name: 'sentence-transformers', import: 'sentence_transformers' },
    { name: 'torch', import: 'torch' },
    { name: 'numpy', import: 'numpy' }
  ];
  
  let allPackagesInstalled = true;
  
  for (const pkg of packages) {
    const result = await testPythonPackage(workingPythonCommand, pkg.import);
    if (result.success) {
      log(`   ✅ ${pkg.name}: ${result.version}`, 'green');
    } else {
      log(`   ❌ ${pkg.name}: Not installed`, 'red');
      allPackagesInstalled = false;
    }
  }
  
  if (!allPackagesInstalled) {
    log('\n⚠️  Some packages are missing. Install them with:', 'yellow');
    log('   cd src/python && pip install -r requirements.txt', 'yellow');
  }
  
  // Test 3: Check NLTK data
  log('\n3️⃣  Testing NLTK Data...', 'cyan');
  
  const nltkData = [
    { name: 'punkt', path: 'tokenizers/punkt' },
    { name: 'wordnet', path: 'corpora/wordnet' },
    { name: 'omw-1.4', path: 'corpora/omw-1.4' }
  ];
  
  let allNLTKDataInstalled = true;
  
  for (const data of nltkData) {
    const result = await testNLTKData(workingPythonCommand, data.path);
    if (result.success) {
      log(`   ✅ ${data.name}: Installed`, 'green');
    } else {
      log(`   ❌ ${data.name}: Not installed`, 'red');
      allNLTKDataInstalled = false;
    }
  }
  
  if (!allNLTKDataInstalled) {
    log('\n⚠️  Some NLTK data is missing. Download with:', 'yellow');
    log(`   ${workingPythonCommand} -c "import nltk; nltk.download('punkt'); nltk.download('wordnet'); nltk.download('omw-1.4')"`, 'yellow');
  }
  
  // Test 4: Check Python scripts
  log('\n4️⃣  Testing Python Scripts...', 'cyan');
  
  const meteorScriptPath = path.join(__dirname, 'src/python/meteor_calculator.py');
  const sbertScriptPath = path.join(__dirname, 'src/python/sentence_bert_calculator.py');
  
  if (fs.existsSync(meteorScriptPath)) {
    log(`   ✅ meteor_calculator.py: Found`, 'green');
  } else {
    log(`   ❌ meteor_calculator.py: Not found at ${meteorScriptPath}`, 'red');
  }
  
  if (fs.existsSync(sbertScriptPath)) {
    log(`   ✅ sentence_bert_calculator.py: Found`, 'green');
  } else {
    log(`   ❌ sentence_bert_calculator.py: Not found at ${sbertScriptPath}`, 'red');
  }
  
  // Test 5: Test METEOR calculation
  log('\n5️⃣  Testing METEOR Calculation...', 'cyan');
  
  if (allPackagesInstalled && allNLTKDataInstalled && fs.existsSync(meteorScriptPath)) {
    log('   Running test calculation...', 'blue');
    const result = await testMeteorCalculation(workingPythonCommand);
    if (result.success) {
      log(`   ✅ METEOR calculation successful! Score: ${result.score}`, 'green');
    } else {
      log(`   ❌ METEOR calculation failed: ${result.error}`, 'red');
    }
  } else {
    log('   ⏭️  Skipped (dependencies not met)', 'yellow');
  }
  
  // Test 6: Test Sentence-BERT calculation
  log('\n6️⃣  Testing Sentence-BERT Calculation...', 'cyan');
  
  if (allPackagesInstalled && fs.existsSync(sbertScriptPath)) {
    log('   Running test calculation (this may take a while on first run)...', 'blue');
    const result = await testSentenceBertCalculation(workingPythonCommand);
    if (result.success) {
      log(`   ✅ Sentence-BERT calculation successful! Score: ${result.score}`, 'green');
    } else {
      log(`   ❌ Sentence-BERT calculation failed: ${result.error}`, 'red');
    }
  } else {
    log('   ⏭️  Skipped (dependencies not met)', 'yellow');
  }
  
  // Summary
  log('\n📊 Summary:', 'bright');
  log(`   Python Command: ${workingPythonCommand}`, 'cyan');
  log(`   Packages: ${allPackagesInstalled ? '✅ All installed' : '❌ Some missing'}`, allPackagesInstalled ? 'green' : 'red');
  log(`   NLTK Data: ${allNLTKDataInstalled ? '✅ All installed' : '❌ Some missing'}`, allNLTKDataInstalled ? 'green' : 'red');
  
  if (allPackagesInstalled && allNLTKDataInstalled) {
    log('\n✅ Python environment is ready for METEOR and Sentence-BERT evaluation!', 'green');
  } else {
    log('\n⚠️  Python environment needs setup. Follow the instructions above.', 'yellow');
  }
  
  log('\n💡 Tip: Set PYTHON_PATH in .env file:', 'cyan');
  log(`   PYTHON_PATH=${workingPythonCommand}`, 'cyan');
  log('');
}

main().catch((error) => {
  log(`\n❌ Test failed: ${error.message}`, 'red');
  process.exit(1);
});
