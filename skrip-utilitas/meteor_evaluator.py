#!/usr/bin/env python3
"""
METEOR Evaluation Script for SpecWeave
Based on Banerjee & Lavie (2005) - METEOR: An Automatic Metric for MT Evaluation

This script implements METEOR evaluation for assessing the quality of generated
Gherkin scenarios against reference templates or previous high-quality scenarios.
"""

import sys
import json
import nltk
import numpy as np
from itertools import chain
from nltk.stem.porter import PorterStemmer
from nltk.corpus import wordnet
import os
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Download required NLTK data if not present
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('wordnet')

try:
    nltk.data.find('corpora/omw-1.4')
except LookupError:
    nltk.download('omw-1.4')

class MeteorEvaluator:
    """
    METEOR Evaluator implementation based on Banerjee & Lavie (2005)
    
    Implements word-level alignment with exact match, stem match, and synonym match
    Calculates precision, recall, F-mean, fragmentation penalty, and final METEOR score
    """
    
    def __init__(self):
        self.stemmer = PorterStemmer()
        logger.info("METEOR Evaluator initialized")
    
    def exact_match(self, candidate_word, reference_word):
        """Check if two words match exactly (case-insensitive)"""
        return candidate_word.lower() == reference_word.lower()
    
    def stem_match(self, candidate_word, reference_word):
        """Check if two words match after stemming"""
        try:
            return self.stemmer.stem(candidate_word.lower()) == self.stemmer.stem(reference_word.lower())
        except:
            return False
    
    def synonym_match(self, candidate_word, reference_word):
        """Check if two words are synonyms using WordNet"""
        try:
            # Get synsets for both words
            syn_candidate = set(chain.from_iterable([w.lemma_names() for w in wordnet.synsets(candidate_word.lower())]))
            syn_reference = set(chain.from_iterable([w.lemma_names() for w in wordnet.synsets(reference_word.lower())]))
            
            # Check if there's any overlap in synonyms
            return len(syn_candidate.intersection(syn_reference)) > 0
        except:
            return False
    
    def align_words(self, candidate_tokens, reference_tokens):
        """
        Perform word-to-word alignment between candidate and reference
        Returns list of (candidate_index, reference_index) tuples
        """
        matches = []
        used_reference = set()
        
        # Stage 1: Exact matches
        for i, c_word in enumerate(candidate_tokens):
            for j, r_word in enumerate(reference_tokens):
                if j in used_reference:
                    continue
                if self.exact_match(c_word, r_word):
                    matches.append((i, j))
                    used_reference.add(j)
                    break
        
        # Stage 2: Stem matches (for unmatched words)
        matched_candidate = set([m[0] for m in matches])
        for i, c_word in enumerate(candidate_tokens):
            if i in matched_candidate:
                continue
            for j, r_word in enumerate(reference_tokens):
                if j in used_reference:
                    continue
                if self.stem_match(c_word, r_word):
                    matches.append((i, j))
                    used_reference.add(j)
                    break
        
        # Stage 3: Synonym matches (for still unmatched words)
        matched_candidate = set([m[0] for m in matches])
        for i, c_word in enumerate(candidate_tokens):
            if i in matched_candidate:
                continue
            for j, r_word in enumerate(reference_tokens):
                if j in used_reference:
                    continue
                if self.synonym_match(c_word, r_word):
                    matches.append((i, j))
                    used_reference.add(j)
                    break
        
        return matches
    
    def calculate_chunks(self, matches):
        """
        Calculate number of chunks in the alignment
        A chunk is a sequence of consecutive unigrams in both sentences
        """
        if not matches:
            return 0
        
        # Sort matches by candidate position
        sorted_matches = sorted(matches, key=lambda x: x[0])
        
        chunks = 1
        for k in range(1, len(sorted_matches)):
            prev_c, prev_r = sorted_matches[k - 1]
            curr_c, curr_r = sorted_matches[k]
            
            # If not consecutive in both candidate and reference, it's a new chunk
            if not (curr_c == prev_c + 1 and curr_r == prev_r + 1):
                chunks += 1
        
        return chunks
    
    def tokenize_text(self, text):
        """Tokenize text into words, handling punctuation appropriately"""
        # Simple tokenization - split by whitespace and remove punctuation
        import re
        # Remove punctuation and split
        tokens = re.findall(r'\b\w+\b', text.lower())
        return tokens
    
    def evaluate(self, candidate, reference):
        """
        Calculate METEOR score between candidate and reference text
        
        Args:
            candidate (str): Generated text to evaluate
            reference (str): Reference text for comparison
            
        Returns:
            dict: Dictionary containing all METEOR metrics
        """
        try:
            # Tokenize both texts
            candidate_tokens = self.tokenize_text(candidate)
            reference_tokens = self.tokenize_text(reference)
            
            if not candidate_tokens or not reference_tokens:
                return {
                    'meteor_score': 0.0,
                    'precision': 0.0,
                    'recall': 0.0,
                    'fmean': 0.0,
                    'fragmentation_penalty': 0.0,
                    'chunks': 0,
                    'matched_unigrams': 0,
                    'candidate_length': len(candidate_tokens),
                    'reference_length': len(reference_tokens)
                }
            
            # Perform word alignment
            matches = self.align_words(candidate_tokens, reference_tokens)
            matched_unigrams = len(matches)
            
            if matched_unigrams == 0:
                return {
                    'meteor_score': 0.0,
                    'precision': 0.0,
                    'recall': 0.0,
                    'fmean': 0.0,
                    'fragmentation_penalty': 0.0,
                    'chunks': 0,
                    'matched_unigrams': 0,
                    'candidate_length': len(candidate_tokens),
                    'reference_length': len(reference_tokens)
                }
            
            # Calculate precision and recall
            precision = matched_unigrams / len(candidate_tokens)
            recall = matched_unigrams / len(reference_tokens)
            
            # Calculate F-mean (recall-weighted harmonic mean)
            # Formula from paper: Fmean = (10 * P * R) / (R + 9P)
            if precision + recall == 0:
                fmean = 0.0
            else:
                fmean = (10 * precision * recall) / (recall + 9 * precision)
            
            # Calculate fragmentation penalty
            chunks = self.calculate_chunks(matches)
            fragmentation_penalty = 0.5 * (chunks / matched_unigrams)
            
            # Calculate final METEOR score
            meteor_score = fmean * (1 - fragmentation_penalty)
            
            return {
                'meteor_score': round(meteor_score, 4),
                'precision': round(precision, 4),
                'recall': round(recall, 4),
                'fmean': round(fmean, 4),
                'fragmentation_penalty': round(fragmentation_penalty, 4),
                'chunks': chunks,
                'matched_unigrams': matched_unigrams,
                'candidate_length': len(candidate_tokens),
                'reference_length': len(reference_tokens)
            }
            
        except Exception as e:
            logger.error(f"Error in METEOR evaluation: {str(e)}")
            return {
                'meteor_score': 0.0,
                'precision': 0.0,
                'recall': 0.0,
                'fmean': 0.0,
                'fragmentation_penalty': 0.0,
                'chunks': 0,
                'matched_unigrams': 0,
                'candidate_length': 0,
                'reference_length': 0,
                'error': str(e)
            }

def get_quality_level(meteor_score):
    """
    Convert METEOR score to quality level classification
    Based on thresholds defined in the research document
    """
    if meteor_score >= 0.85:
        return 'excellent'
    elif meteor_score >= 0.70:
        return 'good'
    elif meteor_score >= 0.50:
        return 'acceptable'
    elif meteor_score >= 0.25:
        return 'poor'
    else:
        return 'very_poor'

def main():
    """
    Main function for command-line usage
    Expects JSON input with 'candidate' and 'reference' fields
    """
    try:
        # Read input from stdin
        input_data = sys.stdin.read().strip()
        
        if not input_data:
            raise ValueError("No input data provided")
        
        # Parse JSON input
        data = json.loads(input_data)
        
        candidate = data.get('candidate', '')
        reference = data.get('reference', '')
        
        if not candidate or not reference:
            raise ValueError("Both 'candidate' and 'reference' fields are required")
        
        # Initialize evaluator and calculate METEOR score
        evaluator = MeteorEvaluator()
        result = evaluator.evaluate(candidate, reference)
        
        # Add quality level
        result['quality_level'] = get_quality_level(result['meteor_score'])
        
        # Output result as JSON
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'meteor_score': 0.0,
            'precision': 0.0,
            'recall': 0.0,
            'fmean': 0.0,
            'fragmentation_penalty': 0.0,
            'chunks': 0,
            'matched_unigrams': 0,
            'candidate_length': 0,
            'reference_length': 0,
            'quality_level': 'very_poor'
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()