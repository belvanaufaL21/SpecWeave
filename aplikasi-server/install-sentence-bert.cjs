const { spawn } = require('child_process');

// Get Python path from environment or use default
const pythonCommand = process.env.PYTHON_PATH || 'python';

console.log('📦 Installing Sentence-BERT dependencies...\n');
console.log(`Using Python: ${pythonCommand}\n`);

// Install sentence-transformers
const install = spawn(pythonCommand, ['-m', 'pip', 'install', 'sentence-transformers', 'scikit-learn', 'numpy']);

install.stdout.on('data', (data) => {
  process.stdout.write(data);
});

install.stderr.on('data', (data) => {
  process.stderr.write(data);
});

install.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Installation completed successfully!');
    console.log('\n🧪 Run "node check-python-deps.js" to verify the installation.\n');
  } else {
    console.error('\n❌ Installation failed!');
    console.error('Please try installing manually:');
    console.error(`   ${pythonCommand} -m pip install sentence-transformers scikit-learn numpy\n`);
    process.exit(1);
  }
});
