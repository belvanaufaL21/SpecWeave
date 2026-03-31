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
    
    # SPECIAL CASE: If texts are identical (all tokens match in same order)
    # Then chunks = 1 (single continuous match) and penalty should be ZERO
    if generated_tokens == reference_tokens:
        chunks = 1
        penalty = 0.0  # No penalty for perfect match
    else:
        # Simplified chunk calculation (actual METEOR uses more complex alignment)
        # For simplicity, we estimate chunks based on consecutive matches
        chunks = estimate_chunks(generated_tokens, reference_tokens, matches)
        
        # Calculate chunk penalty
        if match_count > 0:
            penalty = 0.5 * (chunks / match_count) ** 3
        else:
            penalty = 0.0
    
    return {
        'precision': precision,
        'recall': recall,
        'f_mean': f_mean,
        'matches': match_count,
        'chunks': chunks,
        'penalty': penalty
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
    then_match = re.search(r'Then\s+(.+?)$', text, re.IGNORECASE | re.DOTALL)
    return {
        'given': given_match.group(1).strip() if given_match else '',
        'when': when_match.group(1).strip() if when_match else '',
        'then': then_match.group(1).strip() if then_match else ''
    }
def send_progress(stage, progress, message):
    """Send progress update to Node.js via stderr in JSON format"""
    progress_data = {
        'type': 'progress',
        'stage': stage,
        'progress': progress,
        'message': message
    }
    print(f"PROGRESS:{json.dumps(progress_data)}", file=sys.stderr, flush=True)

def calculate_meteor_score_with_translation(generated_text, reference_text, target_language='en'):
    """
    Calculate METEOR score between generated and reference text with translate-first approach
    Includes detailed metrics breakdown (precision, recall, f-mean, score METEOR)
    
    Args:
        generated_text (str): The generated text to evaluate
        reference_text (str): The reference text (ground truth)
        target_language (str): Target language for translation (default: 'en')
    
    Returns:
        dict: Result containing score, detailed metrics, translation details, and metadata
    """
    try:
        # Stage 1: Preparing (already sent by controller at 10%)
        
        # Ensure NLTK data is available
        download_nltk_data()
        
        # Stage 2: Precision - Start (10-28%)
        send_progress('precision', 15, 'Mendeteksi bahasa dan mempersiapkan tokenisasi')
        
        # Detect language
        detected_lang = detect_language(generated_text)
        print(f"\n=== Language Detection ===", file=sys.stderr)
        print(f"Detected language: {detected_lang}", file=sys.stderr)
        
        send_progress('precision', 20, 'Melakukan tokenisasi teks')
        
        # SKIP translasi untuk bahasa Indonesia
        # Alasan: Translasi mengubah jumlah token secara tidak konsisten
        # METEOR NLTK sudah support bahasa Indonesia
        if detected_lang == 'id' or target_language == 'id':
            print(f"Skipping translation for Indonesian text", file=sys.stderr)
            generated_final = generated_text
            reference_final = reference_text
            translation_used = False
            # Create dummy translation objects for consistency
            generated_translation = {
                'success': True,
                'original_text': generated_text,
                'translated_text': generated_text,
                'source_language': 'id',
                'target_language': 'id',
                'was_translated': False
            }
            reference_translation = {
                'success': True,
                'original_text': reference_text,
                'translated_text': reference_text,
                'source_language': 'id',
                'target_language': 'id',
                'was_translated': False
            }
        else:
            # Step 1: Translate both texts to target language
            print(f"Translating to {target_language}", file=sys.stderr)
            generated_translation = translate_text(generated_text, target_language)
            reference_translation = translate_text(reference_text, target_language)
            
            # Use translated texts for METEOR calculation
            generated_final = generated_translation['translated_text']
            reference_final = reference_translation['translated_text']
            translation_used = True
        
        # Step 2: Tokenize texts
        send_progress('precision', 25, 'Menghitung presisi kata yang cocok')
        
        import string
        # Include all common punctuation marks including Indonesian and Unicode variants
        punctuation = set(
            string.punctuation +  # Standard ASCII punctuation: !"#$%&'()*+,-./:;<=>?@[\]^_`{|}~
            '``' + "''" +  # NLTK's quote tokens
            '""' + '""' +  # Unicode double quotes (curly quotes)
            '–' + '—' +    # En dash and em dash
            '…' +          # Ellipsis
            '•' +          # Bullet point
            '°' +          # Degree symbol
            '×' + '÷' +    # Multiplication and division
            '±' +          # Plus-minus
            '§' +          # Section sign
            '¶' +          # Paragraph sign
            '†' + '‡' +    # Dagger symbols
            '‰' +          # Per mille
            '′' + '″' +    # Prime symbols
            '‹' + '›' +    # Single angle quotes
            '«' + '»'      # Double angle quotes
        )
        
        generated_tokens_raw = word_tokenize(generated_final.lower())
        reference_tokens_raw = word_tokenize(reference_final.lower())
        
        # Filter out punctuation tokens (keep only alphanumeric tokens)
        # Strategy: Keep only tokens that contain at least one letter or digit
        # This ensures all pure punctuation tokens are removed
        generated_tokens = [
            token for token in generated_tokens_raw 
            if any(c.isalnum() for c in token)  # Must contain at least one alphanumeric character
        ]
        reference_tokens = [
            token for token in reference_tokens_raw 
            if any(c.isalnum() for c in token)  # Must contain at least one alphanumeric character
        ]
        
        # Debug: Log filtered punctuation
        filtered_gen = [t for t in generated_tokens_raw if t in punctuation]
        filtered_ref = [t for t in reference_tokens_raw if t in punctuation]
        if filtered_gen or filtered_ref:
            print(f"\n🔍 Filtered punctuation:", file=sys.stderr)
            if filtered_gen:
                print(f"  Generated: {filtered_gen}", file=sys.stderr)
            if filtered_ref:
                print(f"  Reference: {filtered_ref}", file=sys.stderr)
            print(f"  Tokens after filtering - Generated: {len(generated_tokens)}, Reference: {len(reference_tokens)}", file=sys.stderr)
        
        # Step 3: Calculate detailed METEOR metrics
        send_progress('precision', 28, 'Presisi dihitung')
        
        # Stage 3: Recall (28-46%)
        send_progress('recall', 33, 'Menghitung recall kata yang ditemukan')
        
        detailed_metrics = calculate_detailed_meteor_metrics(generated_tokens, reference_tokens)
        
        send_progress('recall', 46, 'Recall dihitung')
        
        # Stage 4: F-Mean (46-64%)
        send_progress('fmean', 51, 'Menghitung harmonic mean dari precision dan recall')
        
        # Step 4: Calculate official METEOR score using NLTK
        # METEOR expects reference as list of token lists
        official_score = meteor_score([reference_tokens], generated_tokens)
        
        send_progress('fmean', 64, 'F-Mean dihitung')
        
        # Stage 5: Penalty (64-82%)
        send_progress('penalty', 69, 'Menghitung penalti fragmentasi urutan kata')
        
        # Debug logging
        print(f"\n=== METEOR Calculation Debug ===", file=sys.stderr)
        print(f"Translation used: {translation_used}", file=sys.stderr)
        print(f"Generated text: {generated_text[:100]}...", file=sys.stderr)
        print(f"Reference text: {reference_text[:100]}...", file=sys.stderr)
        print(f"Generated tokens: {len(generated_tokens)}", file=sys.stderr)
        print(f"Reference tokens: {len(reference_tokens)}", file=sys.stderr)
        print(f"Matches (our count): {detailed_metrics['matches']}", file=sys.stderr)
        print(f"Precision (our calc): {detailed_metrics['precision']}", file=sys.stderr)
        print(f"Recall (our calc): {detailed_metrics['recall']}", file=sys.stderr)
        print(f"F-mean (our calc): {detailed_metrics['f_mean']}", file=sys.stderr)
        print(f"Penalty: {detailed_metrics['penalty']}", file=sys.stderr)
        print(f"Our final score: {detailed_metrics['f_mean'] * (1 - detailed_metrics['penalty'])}", file=sys.stderr)
        print(f"NLTK official score: {official_score}", file=sys.stderr)
        print(f"================================\n", file=sys.stderr)
        
        send_progress('penalty', 82, 'Penalti dihitung')
        
        # Stage 6: METEOR Score (82-95%)
        send_progress('meteor', 87, 'Menghitung skor akhir METEOR')
        
        # Step 5: Calculate final METEOR score with penalty
        final_score = detailed_metrics['f_mean'] * (1 - detailed_metrics['penalty'])
        
        # Step 6: Calculate per-section metrics (Given/When/Then)
        generated_parts = parse_gherkin_scenario(generated_text)
        reference_parts = parse_gherkin_scenario(reference_text)
        
        section_metrics = {}
        section_scores = []  # Collect section scores for averaging
        
        for section in ['given', 'when', 'then']:
            gen_part = generated_parts[section]
            ref_part = reference_parts[section]
            
            if gen_part and ref_part:
                # SKIP translasi untuk bahasa Indonesia (sama seperti overall)
                if detected_lang == 'id' or target_language == 'id':
                    gen_part_final = gen_part
                    ref_part_final = ref_part
                else:
                    # Translate parts untuk bahasa lain
                    gen_part_trans = translate_text(gen_part, target_language)
                    ref_part_trans = translate_text(ref_part, target_language)
                    gen_part_final = gen_part_trans['translated_text']
                    ref_part_final = ref_part_trans['translated_text']
                
                # Tokenize
                gen_tokens_raw = word_tokenize(gen_part_final.lower())
                ref_tokens_raw = word_tokenize(ref_part_final.lower())
                
                # Filter out punctuation tokens (same strategy as overall)
                # Keep only tokens that contain at least one letter or digit
                gen_tokens = [
                    token for token in gen_tokens_raw 
                    if any(c.isalnum() for c in token)
                ]
                ref_tokens = [
                    token for token in ref_tokens_raw 
                    if any(c.isalnum() for c in token)
                ]
                
                # Calculate METEOR for this section
                # SPECIAL CASE: If tokens are identical, score = 1.0 (perfect match)
                if gen_tokens == ref_tokens:
                    section_score = 1.0
                else:
                    section_score = meteor_score([ref_tokens], gen_tokens) if gen_tokens and ref_tokens else 0.0
                
                section_detailed = calculate_detailed_meteor_metrics(gen_tokens, ref_tokens)
                
                # Add to section scores for averaging
                section_scores.append(section_score)
                
                # Concise debug logging untuk section
                print(f"\n=== Section {section.upper()} ===", file=sys.stderr)
                print(f"  Tokens: Generated={len(gen_tokens)}, Reference={len(ref_tokens)}, Matches={section_detailed['matches']}", file=sys.stderr)
                print(f"  Precision={section_detailed['precision']:.3f}, Recall={section_detailed['recall']:.3f}, F-Mean={section_detailed['f_mean']:.3f}", file=sys.stderr)
                print(f"  Penalty={section_detailed['penalty']:.3f}, METEOR Score={section_score:.3f}", file=sys.stderr)
                
                # Get matched words for highlighting - FIXED to match actual count
                matched_words = []
                word_match_count = {}  # Track how many times each word has been matched
                
                for gen_word in gen_tokens:
                    if gen_word in ref_tokens:
                        # Count how many times this word appears in both texts
                        gen_count = gen_tokens.count(gen_word)
                        ref_count = ref_tokens.count(gen_word)
                        max_matches = min(gen_count, ref_count)
                        
                        # Only add if we haven't exceeded the max matches for this word
                        current_count = word_match_count.get(gen_word, 0)
                        if current_count < max_matches:
                            matched_words.append({
                                'generated': gen_word,
                                'reference': gen_word
                            })
                            word_match_count[gen_word] = current_count + 1
                
                section_metrics[section] = {
                    'precision': section_detailed['precision'],
                    'recall': section_detailed['recall'],
                    'f_mean': section_detailed['f_mean'],
                    'matches': section_detailed['matches'],
                    'chunks': section_detailed['chunks'],
                    'penalty': section_detailed['penalty'],
                    'meteor_score': section_score,
                    'generated_tokens': len(gen_tokens),
                    'reference_tokens': len(ref_tokens),
                    'matched_words': matched_words
                }
            else:
                section_metrics[section] = {
                    'precision': 0.0,
                    'recall': 0.0,
                    'f_mean': 0.0,
                    'matches': 0,
                    'chunks': 0,
                    'penalty': 0.0,
                    'meteor_score': 0.0,
                    'generated_tokens': 0,
                    'reference_tokens': 0
                }
        
        # Calculate average METEOR score from sections
        average_section_score = sum(section_scores) / len(section_scores) if section_scores else 0.0
        
        # Calculate overall metrics from sections (sum of all sections)
        total_matches = sum(m['matches'] for m in section_metrics.values())
        total_gen_tokens = sum(m['generated_tokens'] for m in section_metrics.values())
        total_ref_tokens = sum(m['reference_tokens'] for m in section_metrics.values())
        
        # FALLBACK: If no section metrics (non-Gherkin text), use overall detailed_metrics
        if total_gen_tokens == 0 or total_ref_tokens == 0:
            print(f"\n⚠️  No section metrics found, using overall metrics", file=sys.stderr)
            total_matches = detailed_metrics['matches']
            total_gen_tokens = len(generated_tokens)
            total_ref_tokens = len(reference_tokens)
            average_section_score = official_score  # Use NLTK official score
        
        overall_precision = total_matches / total_gen_tokens if total_gen_tokens > 0 else 0.0
        overall_recall = total_matches / total_ref_tokens if total_ref_tokens > 0 else 0.0
        overall_f_mean = (10 * overall_precision * overall_recall) / (9 * overall_precision + overall_recall) if (9 * overall_precision + overall_recall) > 0 else 0.0
        
        # Calculate overall penalty (average of section penalties weighted by matches)
        total_chunks = sum(m['chunks'] for m in section_metrics.values())
        if total_chunks == 0:  # Fallback for non-Gherkin
            total_chunks = detailed_metrics['chunks']
        overall_penalty = 0.5 * (total_chunks / total_matches) ** 3 if total_matches > 0 else 0.0
        
        # Calculate final score from overall metrics
        final_score_from_sections = overall_f_mean * (1 - overall_penalty)
        
        print(f"\n=== FINAL SCORE CALCULATION ===", file=sys.stderr)
        print(f"Section scores: {[round(s, 3) for s in section_scores]}", file=sys.stderr)
        print(f"Average section score: {average_section_score:.3f}", file=sys.stderr)
        print(f"Overall from sections: Precision={overall_precision:.3f}, Recall={overall_recall:.3f}, F-Mean={overall_f_mean:.3f}", file=sys.stderr)
        print(f"Final score from sections: {final_score_from_sections:.3f}", file=sys.stderr)
        print(f"================================\n", file=sys.stderr)
        
        send_progress('meteor', 95, 'Skor METEOR selesai dihitung')
        
        return {
            'success': True,
            'score': average_section_score,  # Use average of section scores (no rounding)
            'detailed_metrics': {
                'precision': overall_precision,
                'recall': overall_recall,
                'f_mean': overall_f_mean,
                'meteor_score': final_score_from_sections,
                'matches': total_matches,
                'chunks': total_chunks,
                'penalty': overall_penalty,
                'generated_tokens': total_gen_tokens,
                'reference_tokens': total_ref_tokens,
                'section_metrics': section_metrics,  # Add per-section metrics
                'explanation': {
                    'precision_desc': f"Proporsi kata dalam teks yang dihasilkan yang cocok dengan referensi: {total_matches}/{total_gen_tokens} = {overall_precision}",
                    'recall_desc': f"Proporsi kata dalam teks referensi yang tertangkap oleh teks yang dihasilkan: {total_matches}/{total_ref_tokens} = {overall_recall}",
                    'f_mean_desc': f"Weighted mean dari presisi dan recall: 10×({overall_precision}×{overall_recall})/(9×{overall_precision}+{overall_recall}) = {overall_f_mean}",
                    'penalty_desc': f"Penalti urutan kata berdasarkan {total_chunks} chunks dari {total_matches} matches: 0.5×({total_chunks}/{total_matches})³ = {overall_penalty}",
                    'final_score_desc': f"Skor METEOR final (rata-rata section): {average_section_score}",
                    'section_scores': {
                        'given': section_metrics['given']['meteor_score'],
                        'when': section_metrics['when']['meteor_score'],
                        'then': section_metrics['then']['meteor_score'],
                        'average': average_section_score
                    }
                }
            },
            'details': {
                'generated_tokens': total_gen_tokens,
                'reference_tokens': total_ref_tokens,
                'method': 'METEOR Per-Section Average',
                'target_language': target_language,
                'generated_text_length': len(generated_text),
                'reference_text_length': len(reference_text),
                'translated_reference_length': len(reference_final)
            },
            'translation_info': {
                'generated': {
                    'original_language': generated_translation['source_language'],
                    'was_translated': generated_translation['was_translated'],
                    'original_text': generated_translation['original_text'],
                    'translated_text': generated_translation['translated_text']
                },
                'reference': {
                    'original_language': reference_translation['source_language'],
                    'was_translated': reference_translation['was_translated'],
                    'original_text': reference_translation['original_text'],
                    'translated_text': reference_translation['translated_text']
                }
            }
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'score': 0.0,
            'details': {
                'method': 'METEOR + Translate-First',
                'target_language': target_language
            }
        }

def main():
    """Main function to handle command line arguments"""
    if len(sys.argv) < 3:
        result = {
            'success': False,
            'error': 'Usage: python meteor_calculator.py <generated_text> <reference_text> [target_language]',
            'score': 0.0
        }
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(1)
    
    generated_text = sys.argv[1]
    reference_text = sys.argv[2]
    
    # Optional target language parameter (default: English)
    target_language = 'en'
    if len(sys.argv) > 3:
        target_language = sys.argv[3]
    
    result = calculate_meteor_score_with_translation(generated_text, reference_text, target_language)
    # Use ensure_ascii=False to preserve Unicode, but don't use indent to reduce output size
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
