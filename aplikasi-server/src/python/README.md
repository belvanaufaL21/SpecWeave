# Python ML Services

This directory contains Python scripts for machine learning-based text evaluation services used by the SpecWeave application.

## Overview

The ML services provide two text similarity calculation methods:

1. **METEOR Calculator with Translate-First** (`meteor_calculator.py`) - Uses NLTK's METEOR score with automatic translation to ensure both texts are in the same language
2. **Sentence-BERT Calculator** (`sentence_bert_calculator.py`) - Uses Sentence-BERT embeddings with cosine similarity

## Setup

### Prerequisites

- Python 3.8 or higher
- pip package manager
- Internet connection (for Google Translate API and model downloads)

### Installation

1. Run the setup script to install dependencies and download models:
```bash
cd aplikasi-server/src/python
python setup.py
```

2. Alternatively, install manually:
```bash
pip install -r requirements.txt
python -c "import nltk; nltk.download('punkt'); nltk.download('wordnet'); nltk.download('omw-1.4')"
```

## Usage

### METEOR Calculator with Translate-First

The METEOR calculator automatically detects the language of both texts and translates them to a common language before calculating the METEOR score. This ensures accurate comparison even when texts are in different languages.

```bash
python meteor_calculator.py "generated text" "reference text" [target_language]
```

Examples:
```bash
# English texts (no translation needed)
python meteor_calculator.py "Given I am a user When I login Then I see dashboard" "Given I am a customer When I sign in Then I view dashboard"

# Mixed languages (automatic translation to English)
python meteor_calculator.py "Ketika saya pengguna Ketika saya login Maka saya lihat dashboard" "Given I am a user When I login Then I see dashboard"

# Force translation to Indonesian
python meteor_calculator.py "Given I am a user When I login Then I see dashboard" "Ketika saya pengguna Ketika saya login Maka saya lihat dashboard" "id"
```

**Supported target languages:**
- `en` - English (default)
- `id` - Indonesian
- `es` - Spanish
- `fr` - French
- `de` - German
- And many more (ISO 639-1 language codes)

### Sentence-BERT Calculator

```bash
python sentence_bert_calculator.py "generated text" "reference text"
```

Example:
```bash
python sentence_bert_calculator.py "Given I am a user When I login Then I see dashboard" "Given I am a customer When I sign in Then I view dashboard"
```

## Output Format

### METEOR Calculator Output

```json
{
  "success": true,
  "score": 0.756,
  "details": {
    "generated_tokens": 12,
    "reference_tokens": 12,
    "method": "METEOR + Translate-First",
    "target_language": "en",
    "generated_text_length": 65,
    "reference_text_length": 67,
    "translated_generated_length": 65,
    "translated_reference_length": 67
  },
  "translation_info": {
    "generated": {
      "original_language": "en",
      "was_translated": false,
      "original_text": "Given I am a user...",
      "translated_text": "Given I am a user..."
    },
    "reference": {
      "original_language": "id",
      "was_translated": true,
      "original_text": "Ketika saya pengguna...",
      "translated_text": "When I am a user..."
    }
  }
}
```

### Sentence-BERT Calculator Output

```json
{
  "success": true,
  "score": 0.756,
  "details": {
    "embedding_dimension": 384,
    "model": "paraphrase-multilingual-MiniLM-L12-v2",
    "method": "Sentence-BERT + Cosine Similarity",
    "generated_text_length": 65,
    "reference_text_length": 67
  }
}
```

On error:
```json
{
  "success": false,
  "error": "Error description",
  "score": 0.0
}
```

## Testing

Run the test suite to validate both calculators:

```bash
python test_calculators.py
```

This will test:
- Basic functionality with sample data
- Translation functionality with mixed languages
- Score ranges for identical, similar, and different texts
- Error handling for invalid inputs

## Integration with Node.js

The calculators are designed to be called from Node.js using `child_process.spawn()`:

```javascript
const { spawn } = require('child_process');

// METEOR with default English target
const meteorProcess = spawn('python', [
  'src/python/meteor_calculator.py',
  generatedText,
  referenceText
]);

// METEOR with Indonesian target
const meteorProcessId = spawn('python', [
  'src/python/meteor_calculator.py',
  generatedText,
  referenceText,
  'id'
]);

// Sentence-BERT
const sbertProcess = spawn('python', [
  'src/python/sentence_bert_calculator.py',
  generatedText,
  referenceText
]);
```

## Dependencies

- **nltk**: Natural Language Toolkit for METEOR score calculation
- **sentence-transformers**: Sentence-BERT model for semantic embeddings
- **scikit-learn**: Cosine similarity calculation
- **numpy**: Numerical operations
- **torch**: PyTorch backend for transformers
- **deep-translator**: Google Translate API for automatic translation
- **langdetect**: Language detection for automatic translation

## Models Used

- **METEOR**: Uses NLTK's built-in METEOR implementation with WordNet
- **Sentence-BERT**: Uses `paraphrase-multilingual-MiniLM-L12-v2` model (optimized for paraphrase detection, multilingual support)
- **Translation**: Uses Google Translate API via deep-translator for automatic language translation

## Translation Features

### Language Detection
- Automatic detection of source language using `langdetect`
- Fallback to original text if detection fails
- Consistent detection with seeded random state

### Translation Strategy
- **Translate-First Approach**: Both texts are translated to the same target language before comparison
- **Smart Translation**: Skips translation if text is already in target language
- **Fallback Handling**: Uses original text if translation fails
- **Rate Limiting**: Built-in delays to avoid API rate limits

### Supported Use Cases
1. **Monolingual**: Both texts in same language (no translation)
2. **Bilingual**: Texts in different languages (automatic translation)
3. **Multilingual**: Multiple language pairs with configurable target language

## Performance Notes

- **METEOR**: Fast after initial setup, translation adds ~1-2 seconds per request
- **Sentence-BERT**: Slower initial load (model download), but fast inference
- **Translation**: Requires internet connection, ~500ms-2s per translation
- First run may be slower due to model downloads and NLTK data
- Subsequent runs are faster as models and data are cached

## Troubleshooting

### Common Issues

1. **Import errors**: Ensure all dependencies are installed via `pip install -r requirements.txt`
2. **NLTK data missing**: Run `python -c "import nltk; nltk.download('punkt'); nltk.download('wordnet')"`
3. **Translation errors**: Check internet connection, Google Translate requires network access
4. **Language detection fails**: Very short texts may not be detected correctly
5. **Memory issues**: Sentence-BERT requires ~500MB RAM, translation adds ~100MB

### Error Codes

- Exit code 0: Success
- Exit code 1: Invalid arguments or execution error

### Translation Troubleshooting

- **Rate limiting**: Built-in delays help avoid Google Translate rate limits
- **Network issues**: Translation falls back to original text if network fails
- **Unsupported languages**: Check ISO 639-1 language codes for supported languages
- **Text too long**: Very long texts may fail translation, consider chunking