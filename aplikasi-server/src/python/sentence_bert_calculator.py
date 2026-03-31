#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sentence-BERT Score Calculator
Calculates semantic similarity between generated and reference text using Sentence-BERT
"""

import sys
import io
import json
import re
import numpy as np

# Fix Windows encoding issue - force UTF-8 output
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

def send_progress(stage, progress, message):
    """Send progress update to Node.js via stderr in JSON format"""
    progress_data = {
        'type': 'progress',
        'stage': stage,
        'progress': progress,
        'message': message
    }
    print(f"PROGRESS:{json.dumps(progress_data)}", file=sys.stderr, flush=True)

def parse_gherkin_scenario(text):
    """
    Parse Gherkin scenario text into Given, When, Then sections
    
    Args:
        text (str): Gherkin scenario text
    
    Returns:
        dict: Dictionary with 'given', 'when', 'then' keys
    """
    sections = {'given': '', 'when': '', 'then': ''}
    
    if not text:
        return sections
    
    # Try to extract sections using regex
    given_match = re.search(r'(?:Given|Diberikan)\s*:?\s*(.+?)(?=\s*(?:When|Ketika|Then|Maka|$))', text, re.IGNORECASE | re.DOTALL)
    when_match = re.search(r'(?:When|Ketika)\s*:?\s*(.+?)(?=\s*(?:Then|Maka|$))', text, re.IGNORECASE | re.DOTALL)
    then_match = re.search(r'(?:Then|Maka)\s*:?\s*(.+?)$', text, re.IGNORECASE | re.DOTALL)
    
    if given_match:
        sections['given'] = given_match.group(1).strip()
    if when_match:
        sections['when'] = when_match.group(1).strip()
    if then_match:
        sections['then'] = then_match.group(1).strip()
    
    return sections

def calculate_sentence_bert_score(generated_text, reference_text):
    """
    Calculate Sentence-BERT similarity score between generated and reference text
    
    Args:
        generated_text (str): The generated text to evaluate
        reference_text (str): The reference text (ground truth)
    
    Returns:
        dict: Result containing score and details
    """
    try:
        # Stage 1: Preparing (already sent by controller at 8%)
        
        # Stage 2: Tokenizing (8-26%)
        send_progress('tokenizing', 13, 'Memuat model Sentence-BERT')
        
        # Load pre-trained Sentence-BERT model
        # Using paraphrase-multilingual model for better semantic similarity
        # Note: This model is larger but more accurate for paraphrase detection
        model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        
        send_progress('tokenizing', 20, 'Melakukan tokenisasi teks')
        
        # Generate embeddings for overall text
        generated_embedding = model.encode([generated_text])
        reference_embedding = model.encode([reference_text])
        
        send_progress('tokenizing', 26, 'Input embedding selesai')
        
        # Stage 3: Self-Attention (26-46%)
        send_progress('attention', 31, 'Menghitung self-attention layers')
        
        # Calculate overall cosine similarity
        overall_similarity = cosine_similarity(generated_embedding, reference_embedding)[0][0]
        
        send_progress('attention', 40, 'Menghitung hubungan antar kata dalam konteks')
        
        # Calculate dot product and magnitudes for overall
        dot_product_overall = float(np.dot(generated_embedding[0], reference_embedding[0]))
        magnitude_a_overall = float(np.linalg.norm(generated_embedding[0]))
        magnitude_b_overall = float(np.linalg.norm(reference_embedding[0]))
        
        send_progress('attention', 46, 'Self-attention selesai')
        
        # Stage 4: FFN + Residual + Layer Normalization (46-66%)
        send_progress('ffn', 51, 'Transformasi feed-forward network')
        
        # Parse Gherkin sections
        generated_sections = parse_gherkin_scenario(generated_text)
        reference_sections = parse_gherkin_scenario(reference_text)
        
        send_progress('ffn', 58, 'Menerapkan residual connections dan layer normalization')
        
        # Calculate section-wise scores and embeddings
        section_scores = {}
        section_embeddings = {}
        section_details = {}
        
        for section in ['given', 'when', 'then']:
            gen_section = generated_sections[section]
            ref_section = reference_sections[section]
            
            if gen_section and ref_section:
                # Calculate similarity for this section
                gen_emb = model.encode([gen_section])
                ref_emb = model.encode([ref_section])
                section_sim = cosine_similarity(gen_emb, ref_emb)[0][0]
                section_scores[section] = float(section_sim)
                
                # Store embeddings (convert to list for JSON serialization)
                section_embeddings[section] = {
                    'generated': gen_emb[0].tolist(),
                    'reference': ref_emb[0].tolist()
                }
                
                # Calculate detailed metrics for this section
                dot_product = float(np.dot(gen_emb[0], ref_emb[0]))
                magnitude_a = float(np.linalg.norm(gen_emb[0]))
                magnitude_b = float(np.linalg.norm(ref_emb[0]))
                
                section_details[section] = {
                    'dot_product': dot_product,
                    'magnitude_a': magnitude_a,
                    'magnitude_b': magnitude_b,
                    'cosine_similarity': float(section_sim)
                }
            else:
                # If section is missing, score is 0
                section_scores[section] = 0.0
                section_embeddings[section] = {
                    'generated': None,
                    'reference': None
                }
                section_details[section] = {
                    'dot_product': 0.0,
                    'magnitude_a': 0.0,
                    'magnitude_b': 0.0,
                    'cosine_similarity': 0.0
                }
        
        send_progress('ffn', 66, 'Layer normalization selesai')
        
        # Stage 5: Mean Pooling (66-84%)
        send_progress('pooling', 71, 'Menghasilkan representasi vektor kalimat')
        send_progress('pooling', 78, 'Menghitung mean pooling dari token embeddings')
        send_progress('pooling', 84, 'Mean pooling selesai')
        
        # Stage 6: Cosine Similarity (84-95%)
        send_progress('similarity', 89, 'Menghitung cosine similarity antara vektor')
        send_progress('similarity', 95, 'Cosine similarity selesai')
        
        # Calculate overall score as AVERAGE of section scores (for fair comparison with METEOR)
        # This allows apple-to-apple comparison between METEOR and Sentence-BERT
        section_score_values = [score for score in section_scores.values() if score > 0]
        if section_score_values:
            average_section_score = sum(section_score_values) / len(section_score_values)
        else:
            average_section_score = 0.0
        
        print(f"\n=== SENTENCE-BERT SCORE CALCULATION ===", file=sys.stderr)
        print(f"Full text similarity: {overall_similarity:.3f}", file=sys.stderr)
        print(f"Section scores: Given={section_scores.get('given', 0):.3f}, When={section_scores.get('when', 0):.3f}, Then={section_scores.get('then', 0):.3f}", file=sys.stderr)
        print(f"Average section score: {average_section_score:.3f} (used as overall score)", file=sys.stderr)
        print(f"========================================\n", file=sys.stderr)
        
        return {
            'success': True,
            'score': float(average_section_score),  # Use average of sections for fair comparison
            'details': {
                'embedding_dimension': len(generated_embedding[0]),
                'model': 'paraphrase-multilingual-MiniLM-L12-v2',
                'method': 'Sentence-BERT + Cosine Similarity (Average of Sections)',
                'generated_text_length': len(generated_text),
                'reference_text_length': len(reference_text),
                'section_scores': section_scores,
                'sentence_bert_scores': section_scores,  # Alias for consistency
                'section_embeddings': section_embeddings,
                'section_details': section_details,
                'overall_embeddings': {
                    'generated': generated_embedding[0].tolist(),
                    'reference': reference_embedding[0].tolist()
                },
                'full_text_similarity': float(overall_similarity),  # Keep for reference
                'dot_product': dot_product_overall,
                'magnitude_a': magnitude_a_overall,
                'magnitude_b': magnitude_b_overall
            }
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'score': 0.0
        }

def main():
    """Main function to handle command line arguments"""
    if len(sys.argv) != 3:
        result = {
            'success': False,
            'error': 'Usage: python sentence_bert_calculator.py <generated_text> <reference_text>',
            'score': 0.0
        }
        print(json.dumps(result))
        sys.exit(1)
    
    generated_text = sys.argv[1]
    reference_text = sys.argv[2]
    
    result = calculate_sentence_bert_score(generated_text, reference_text)
    print(json.dumps(result))

if __name__ == "__main__":
    main()