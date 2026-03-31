const { spawn } = require('child_process');
const path = require('path');

// Get Python path from environment or use default
const pythonCommand = process.env.PYTHON_PATH || 'python';

console.log('🔍 Checking Python dependencies for Sentence-BERT...\n');
console.log(`Using Python: ${pythonCommand}\n`);

// Check Python version
const checkVersion = spawn(pythonCommand, ['--version']);

checkVersion.stdout.on('data', (data) => {
  console.log(`✓ Python version: ${data.toString().trim()}`);
});

checkVersion.stderr.on('data', (data) => {
  console.log(`✓ Python version: ${data.toString().trim()}`);
});

checkVersion.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Python not found or not working properly');
    process.exit(1);
  }
  
  // Check if sentence-transformers is installed
  console.log('\n🔍 Checking sentence-transformers installation...\n');
  
  const checkPackage = spawn(pythonCommand, ['-c', 'import sentence_transformers; print(sentence_transformers.__version__)']);
  
  let hasError = false;
  
  checkPackage.stdout.on('data', (data) => {
    console.log(`✓ sentence-transformers version: ${data.toString().trim()}`);
  });
  
  checkPackage.stderr.on('data', (data) => {
    hasError = true;
    console.error(`❌ Error: ${data.toString().trim()}`);
  });
  
  checkPackage.on('close', (code) => {
    if (code !== 0 || hasError) {
      console.error('\n❌ sentence-transformers is not installed!');
      console.log('\n📦 To install, run:');
      console.log(`   ${pythonCommand} -m pip install sentence-transformers\n`);
      process.exit(1);
    } else {
      console.log('\n✅ All Python dependencies are installed correctly!');
      
      // Test the actual script
      console.log('\n🧪 Testing Sentence-BERT calculator script...\n');
      
      const scriptPath = path.join(__dirname, 'src', 'python', 'sentence_bert_calculator.py');
      const testProcess = spawn(pythonCommand, [
        scriptPath,
        'Given a user logs in',
        'Given a user is logged in'
      ]);
      
      let result = '';
      let errorOutput = '';
      
      testProcess.stdout.on('data', (data) => {
        result += data.toString();
      });
      
      testProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      testProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const parsed = JSON.parse(result);
            console.log('✓ Script test successful!');
            console.log(`  Score: ${parsed.score}`);
            console.log(`  Model: ${parsed.details?.model}`);
            console.log('\n✅ Sentence-BERT is ready to use!\n');
          } catch (e) {
            console.error('❌ Failed to parse script output:', e.message);
            console.error('Output:', result);
            process.exit(1);
          }
        } else {
          console.error('❌ Script test failed!');
          console.error('Error output:', errorOutput);
          process.exit(1);
        }
      });
    }
  });
});
