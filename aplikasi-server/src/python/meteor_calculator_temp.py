#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
METEOR Score Calculator with Translate-First Approach
Calculates METEOR score between generated and reference text using NLTK
with automatic translation to ensure both texts are in the same language
"""

import sys
import io
import json
import nltk

# Fix Windows encoding issue - force UTF-8 output
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
from nltk.translate.meteor_score import meteor_score
from nltk.tokenize import word_tokenize
from deep_translator import GoogleTranslator
from langdetect import detect, DetectorFactory
import time

# Set seed for consistent language detection
DetectorFactory.seed = 0

def download_nltk_data():
    """Download required NLTK data if not already present"""
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        nltk.download('punkt', quiet=True)
    
    try:
        nltk.data.find('corpora/wordnet')
    except LookupError:
        nltk.download('wordnet', quiet=True)
    
    try:
        nltk.data.find('corpora/omw-1.4')
    except LookupError:
        nltk.download('omw-1.4', quiet=True)

def detect_language(text):
    """
    Detect the language of the given text
    
    Args:
        text (str): Text to analyze
    
    Returns:
        str: Language code (e.g., 'en', 'id', 'auto' if detection fails)
    """
    try:
        # Clean text for better detection
        clean_text = text.strip()
        if len(clean_text) < 3:
            return 'auto'
        
        detected_lang = detect(clean_text)
        return detected_lang
    except:
        return 'auto'

def translate_text(text, target_language='en', source_language='auto'):
    """
    Translate text to target language using Google Translate via deep-translator
    
    Args:
        text (str): Text to translate
        target_language (str): Target language code (default: 'en')
        source_language (str): Source language code (default: 'auto')
    
    Returns:
        dict: Translation result with original and translated text
    """
    try:
        # Add small delay to avoid rate limiting
        time.sleep(0.1)
        
        # Detect source language if not specified
        if source_language == 'auto':
            detected_lang = detect_language(text)
        else:
            detected_lang = source_language
        
        # Skip translation if already in target language
        if detected_lang == target_language:
            return {
                'success': True,
                'original_text': text,
                'translated_text': text,
                'source_language': detected_lang,
                'target_language': target_language,
                'was_translated': False
            }
        
        # Perform translation using deep-translator
        translator = GoogleTranslator(source=detected_lang, target=target_language)
        translated_text = translator.translate(text)
        
        return {
            'success': True,
            'original_text': text,
            'translated_text': translated_text,
            'source_language': detected_lang,
            'target_language': target_language,
            'was_translated': True
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'original_text': text,
            'translated_text': text,  # Fallback to original
            'source_language': 'unknown',
            'target_language': target_language,
            'was_translated': False
        }

def calculate_detailed_meteor_metrics(generated_tokens, reference_tokens):
    """
    Calculate detailed METEOR metrics including precision, recall, f-mean, and chunk penalty
    
    Args:
        generated_tokens (list): Tokenized generated text
        reference_tokens (list): Tokenized reference text
    
    Returns:
        dict: Detailed metrics breakdown
    """
    # Find word alignments (simplified - METEOR uses more sophisticated alignment)
    generated_set = set(generated_tokens)
    reference_set = set(reference_tokens)
    matches = generated_set.intersection(reference_set)
    
    # Count actual matches in both texts
    match_count = 0
    for token in matches:
        match_count += min(generated_tokens.count(token), reference_tokens.count(token))
    
    # Calculate precision and recall
    precision = match_count / len(generated_tokens) if len(generated_tokens) > 0 else 0.0
    recall = match_count / len(reference_tokens) if len(reference_tokens) > 0 else 0.0
    
    # Calculate F-mean with weighted formula (10 * P * R) / (9P + R)
    if (9 * precision + recall) > 0:
        f_mean = (10 * precision * recall) / (9 * precision + recall)
    else:
        f_mean = 0.0
    
    # Simplified chunk calculation (actual METEOR uses more complex alignment)
    # For simplicity, we estimate chunks based on consecutive matches
    chunks = estimate_chunks(generated_tokens, reference_tokens, matches)
    
    # Calculate chunk penalty
    if match_count > 0:
        penalty = 0.5 * (chunks / match_count) ** 3
    else:
        penalty = 0.0
    
    return {
        'precision': round(precision, 3),
        'recall': round(recall, 3),
        'f_mean': round(f_mean, 3),
        'matches': match_count,
        'chunks': chunks,
        'penalty': round(penalty, 3)
    }

def estimate_chunks(generated_tokens, reference_tokens, matches):
    """
    Estimate number of chunks for penalty calculation
    This is a simplified version of METEOR's chunk calculation
    """
    if not matches:
        return 0
    
    # Simple heuristic: count transitions between matched and unmatched tokens
    chunks = 1
    prev_matched = False
    
    for token in generated_tokens:
        current_matched = token in matches
        if current_matched != prev_matched and current_matched:
            chunks += 1
        prev_matched = current_matched
    
    return max(1, chunks)

def parse_gherkin_scenario(text):
    """
    Parse Gherkin scenario text into Given, When, Then parts
    
    Args:
        text (str): Gherkin scenario text
    
    Returns:
        dict: Dictionary with 'given', 'when', 'then' keys
    """
    if not text:
        return {'given': '', 'when': '', 'then': ''}
    
    import re
    
    # Match Given, When, Then sections
    given_match = re.search(r'Given\s+(.+?)(?=\s+When|$)', text, re.IGNORECASE | re.DOTALL)
    when_match = re.search(r'When\s+(.+?)(?=\s+Then|$)', text, re.IGNORECASE | re.DOTALL)
    then_match = re.search(r'Then\s+(.+?)$', text, re.IGNORECASE | re.DOTALL)
