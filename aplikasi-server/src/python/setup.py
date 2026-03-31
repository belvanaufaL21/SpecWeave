#!/usr/bin/env python3
"""
Setup script for Python ML services
Installs required dependencies and downloads necessary models/data
"""

import subprocess
import sys
import os

def install_requirements():
    """Install Python requirements"""
    try:
        print("Installing Python requirements...")
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-r", 
            os.path.join(os.path.dirname(__file__), "requirements.txt")
        ])
        print("✓ Requirements installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to install requirements: {e}")
        return False

def test_imports():
    """Test if all required packages can be imported"""
    try:
        print("Testing imports...")
        import nltk
        import sentence_transformers
        import sklearn
        import numpy
        import torch
        import deep_translator
        import langdetect
        print("✓ All packages imported successfully")
        return True
    except ImportError as e:
        print(f"✗ Import failed: {e}")
        return False

def download_models():
    """Download required models and data"""
    try:
        print("Downloading NLTK data...")
        import nltk
        nltk.download('punkt', quiet=True)
        nltk.download('wordnet', quiet=True)
        nltk.download('omw-1.4', quiet=True)
        print("✓ NLTK data downloaded")
        
        print("Downloading Sentence-BERT model (paraphrase-multilingual-MiniLM-L12-v2)...")
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        print("✓ Sentence-BERT model downloaded")
        
        return True
    except Exception as e:
        print(f"✗ Failed to download models: {e}")
        return False

def main():
    """Main setup function"""
    print("Setting up Python ML services...")
    
    success = True
    success &= install_requirements()
    success &= test_imports()
    success &= download_models()
    
    if success:
        print("\n✓ Setup completed successfully!")
        print("You can now run the ML calculators:")
        print("  python meteor_calculator.py 'text1' 'text2'")
        print("  python sentence_bert_calculator.py 'text1' 'text2'")
    else:
        print("\n✗ Setup failed. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()