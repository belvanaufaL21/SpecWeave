#!/usr/bin/env python3
"""
Enhanced METEOR Evaluator for Interactive Testing
Provides detailed component breakdown and word-level analysis
"""

import sys
import json
import re
from typing import Dict, List, Tuple, Any
import nltk
from nltk.translate.meteor_score import meteor_score
from nltk.tokenize import word_tokenize
from nltk.corpus import wordnet
import numpy as np

# Download required NLTK data
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

class EnhancedMeteorEvaluator:
    """Enhanced METEOR evaluator with detailed analysis capabilities"""
    
    def __init__(self):
        self.alpha = 0.9  # Parameter for precision-recall balance
        self.beta = 3.0   # Parameter for fragmentation penalty
        self.gamma = 0.5  # Parameter for synonym matching
        
    def evaluate_detailed(self, generated: str, reference: str, options: Dict = None) -> Dict[str, Any]:
        """
        Perform detailed METEOR evaluation with component breakdown
        
        Args:
            generated: Generated scenario text
            reference: Reference scenario text
            options: Evaluation options
            
        Returns:
            Detailed evaluation results
        """
        if options is None:
            options = {}
            
        # Preprocess texts
        gen_tokens = self.preprocess_text(generated)
        ref_tokens = self.preprocess_text(reference)
        
        # Calculate basic METEOR score
        meteor_score_value = self.calculate_meteor_score(gen_tokens, ref_tokens)
        
        # Calculate detailed components
        precision, recall, f_score = self.calculate_precision_recall_f1(gen_tokens, ref_tokens)
        
        # Word-level alignment analysis
        word_alignment = self.analyze_word_alignment(gen_tokens, ref_tokens)
        
        # Similarity matrix
        similarity_matrix = self.calculate_similarity_matrix(gen_tokens, ref_tokens)
        
        # Fragmentation analysis
        fragmentation_penalty = self.calculate_fragmentation_penalty(word_alignment)
        
        # Detailed results
        result = {
            'meteor_score': round(meteor_score_value, 4),
            'precision': round(precision, 4),
            'recall': round(recall, 4),
            'f_score': round(f_score, 4),
            'fragmentation_penalty': round(fragmentation_penalty, 4),
            'word_alignment': word_alignment,
            'similarity_matrix': similarity_matrix.tolist() if options.get('includeSimilarityMatrix') else None,
            'token_analysis': {
                'generated_tokens': len(gen_tokens),
                'reference_tokens': len(ref_tokens),
                'unique_generated': len(set(gen_tokens)),
                'unique_reference': len(set(ref_tokens)),
                'common_tokens': len(set(gen_tokens) & set(ref_tokens))
            },
            'detailed_breakdown': self.get_detailed_breakdown(gen_tokens, ref_tokens, word_alignment)
        }
        
        return result
    
    def preprocess_text(self, text: str) -> List[str]:
        """
        Preprocess text for METEOR evaluation
        
        Args:
            text: Input text
            
        Returns:
            List of preprocessed tokens
        """
        # Convert to lowercase
        text = text.lower()
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Tokenize
        tokens = word_tokenize(text)
        
        # Filter out punctuation and empty tokens
        tokens = [token for token in tokens if token.isalnum()]
        
        return tokens
    
    def calculate_meteor_score(self, generated_tokens: List[str], reference_tokens: List[str]) -> float:
        """
        Calculate METEOR score using NLTK
        
        Args:
            generated_tokens: Generated text tokens
            reference_tokens: Reference text tokens
            
        Returns:
            METEOR score
        """
        try:
            # NLTK meteor_score expects list of reference sentences
            score = meteor_score([reference_tokens], generated_tokens, alpha=self.alpha, beta=self.beta, gamma=self.gamma)
            return score
        except Exception as e:
            print(f"Error calculating METEOR score: {e}", file=sys.stderr)
            return 0.0
    
    def calculate_precision_recall_f1(self, generated_tokens: List[str], reference_tokens: List[str]) -> Tuple[float, float, float]:
        """
        Calculate precision, recall, and F1 score
        
        Args:
            generated_tokens: Generated text tokens
            reference_tokens: Reference text tokens
            
        Returns:
            Tuple of (precision, recall, f1_score)
        """
        gen_set = set(generated_tokens)
        ref_set = set(reference_tokens)
        
        # Calculate matches (including synonyms)
        matches = self.count_matches_with_synonyms(generated_tokens, reference_tokens)
        
        # Precision: matches / generated tokens
        precision = matches / len(generated_tokens) if len(generated_tokens) > 0 else 0.0
        
        # Recall: matches / reference tokens
        recall = matches / len(reference_tokens) if len(reference_tokens) > 0 else 0.0
        
        # F1 Score
        f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        
        return precision, recall, f1_score
    
    def count_matches_with_synonyms(self, generated_tokens: List[str], reference_tokens: List[str]) -> int:
        """
        Count matches including synonym matches
        
        Args:
            generated_tokens: Generated text tokens
            reference_tokens: Reference text tokens
            
        Returns:
            Number of matches
        """
        matches = 0
        used_ref_indices = set()
        
        for gen_token in generated_tokens:
            for ref_idx, ref_token in enumerate(reference_tokens):
                if ref_idx in used_ref_indices:
                    continue
                    
                # Exact match
                if gen_token == ref_token:
                    matches += 1
                    used_ref_indices.add(ref_idx)
                    break
                    
                # Synonym match
                elif self.are_synonyms(gen_token, ref_token):
                    matches += self.gamma  # Weighted synonym match
                    used_ref_indices.add(ref_idx)
                    break
        
        return matches
    
    def are_synonyms(self, word1: str, word2: str) -> bool:
        """
        Check if two words are synonyms using WordNet
        
        Args:
            word1: First word
            word2: Second word
            
        Returns:
            True if words are synonyms
        """
        try:
            synsets1 = wordnet.synsets(word1)
            synsets2 = wordnet.synsets(word2)
            
            for syn1 in synsets1:
                for syn2 in synsets2:
                    if syn1.wup_similarity(syn2) and syn1.wup_similarity(syn2) > 0.8:
                        return True
            return False
        except:
            return False
    
    def analyze_word_alignment(self, generated_tokens: List[str], reference_tokens: List[str]) -> List[Dict]:
        """
        Analyze word-level alignment between generated and reference
        
        Args:
            generated_tokens: Generated text tokens
            reference_tokens: Reference text tokens
            
        Returns:
            List of word alignment information
        """
        alignment = []
        used_ref_indices = set()
        
        for gen_idx, gen_token in enumerate(generated_tokens):
            best_match = None
            best_similarity = 0.0
            best_ref_idx = -1
            
            for ref_idx, ref_token in enumerate(reference_tokens):
                if ref_idx in used_ref_indices:
                    continue
                
                similarity = self.calculate_word_similarity(gen_token, ref_token)
                
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_match = ref_token
                    best_ref_idx = ref_idx
            
            if best_similarity > 0.3:  # Threshold for considering a match
                alignment.append({
                    'generated': gen_token,
                    'reference': best_match,
                    'similarity': round(best_similarity, 3),
                    'position': {
                        'generated': gen_idx,
                        'reference': best_ref_idx
                    }
                })
                used_ref_indices.add(best_ref_idx)
            else:
                alignment.append({
                    'generated': gen_token,
                    'reference': None,
                    'similarity': 0.0,
                    'position': {
                        'generated': gen_idx,
                        'reference': -1
                    }
                })
        
        return alignment
    
    def calculate_word_similarity(self, word1: str, word2: str) -> float:
        """
        Calculate similarity between two words
        
        Args:
            word1: First word
            word2: Second word
            
        Returns:
            Similarity score (0-1)
        """
        # Exact match
        if word1 == word2:
            return 1.0
        
        # Synonym match
        if self.are_synonyms(word1, word2):
            return 0.8
        
        # Edit distance similarity
        edit_distance = self.levenshtein_distance(word1, word2)
        max_len = max(len(word1), len(word2))
        
        if max_len == 0:
            return 1.0
        
        similarity = 1.0 - (edit_distance / max_len)
        
        # Only consider as similar if above threshold
        return similarity if similarity > 0.6 else 0.0
    
    def levenshtein_distance(self, s1: str, s2: str) -> int:
        """
        Calculate Levenshtein distance between two strings
        
        Args:
            s1: First string
            s2: Second string
            
        Returns:
            Edit distance
        """
        if len(s1) < len(s2):
            return self.levenshtein_distance(s2, s1)
        
        if len(s2) == 0:
            return len(s1)
        
        previous_row = list(range(len(s2) + 1))
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row
        
        return previous_row[-1]
    
    def calculate_similarity_matrix(self, generated_tokens: List[str], reference_tokens: List[str]) -> np.ndarray:
        """
        Calculate similarity matrix between all token pairs
        
        Args:
            generated_tokens: Generated text tokens
            reference_tokens: Reference text tokens
            
        Returns:
            Similarity matrix
        """
        matrix = np.zeros((len(generated_tokens), len(reference_tokens)))
        
        for i, gen_token in enumerate(generated_tokens):
            for j, ref_token in enumerate(reference_tokens):
                matrix[i, j] = self.calculate_word_similarity(gen_token, ref_token)
        
        return matrix
    
    def calculate_fragmentation_penalty(self, word_alignment: List[Dict]) -> float:
        """
        Calculate fragmentation penalty based on word alignment
        
        Args:
            word_alignment: Word alignment information
            
        Returns:
            Fragmentation penalty
        """
        if not word_alignment:
            return 1.0
        
        # Count chunks (consecutive aligned words)
        chunks = 0
        in_chunk = False
        
        for alignment in word_alignment:
            if alignment['similarity'] > 0.3:
                if not in_chunk:
                    chunks += 1
                    in_chunk = True
            else:
                in_chunk = False
        
        # Calculate penalty
        matches = sum(1 for a in word_alignment if a['similarity'] > 0.3)
        
        if matches == 0:
            return 1.0
        
        penalty = chunks / matches
        return penalty
    
    def get_detailed_breakdown(self, generated_tokens: List[str], reference_tokens: List[str], word_alignment: List[Dict]) -> Dict:
        """
        Get detailed breakdown of the evaluation
        
        Args:
            generated_tokens: Generated text tokens
            reference_tokens: Reference text tokens
            word_alignment: Word alignment information
            
        Returns:
            Detailed breakdown
        """
        exact_matches = sum(1 for a in word_alignment if a['similarity'] == 1.0)
        similar_matches = sum(1 for a in word_alignment if 0.3 < a['similarity'] < 1.0)
        no_matches = sum(1 for a in word_alignment if a['similarity'] == 0.0)
        
        return {
            'exact_matches': exact_matches,
            'similar_matches': similar_matches,
            'no_matches': no_matches,
            'match_rate': round(exact_matches / len(generated_tokens), 3) if generated_tokens else 0,
            'similarity_rate': round((exact_matches + similar_matches) / len(generated_tokens), 3) if generated_tokens else 0,
            'coverage': round(len(set(a['reference'] for a in word_alignment if a['reference'])) / len(set(reference_tokens)), 3) if reference_tokens else 0
        }

def main():
    """Main function to handle input and output"""
    try:
        # Read input from stdin
        input_data = sys.stdin.read()
        data = json.loads(input_data)
        
        generated = data.get('generated', '')
        reference = data.get('reference', '')
        options = data.get('options', {})
        
        if not generated or not reference:
            raise ValueError("Both generated and reference texts are required")
        
        # Create evaluator and perform evaluation
        evaluator = EnhancedMeteorEvaluator()
        result = evaluator.evaluate_detailed(generated, reference, options)
        
        # Output result as JSON
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'meteor_score': 0.0,
            'precision': 0.0,
            'recall': 0.0,
            'f_score': 0.0
        }
        print(json.dumps(error_result), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()