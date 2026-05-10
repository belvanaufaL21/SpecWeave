#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
METEOR Score Calculator - Standard Implementation
Mengikuti Banerjee & Lavie (2005) menggunakan NLTK sebagai sumber skor utama.

Perubahan utama dari versi sebelumnya:
1. Skor utama = NLTK official meteor_score pada teks utuh (bukan rata-rata section)
2. Algoritma chunk diperbaiki: chunk = sequence aligned tokens yang konsekutif
   di KEDUA sisi (hipotesis & referensi), sesuai paper aslinya
3. Untuk teks Indonesia: Sastrawi stemming sebagai preprocessing,
   lalu IdentityStemmer di NLTK agar tidak double-stem dengan Porter
4. Per-section metrics tetap dihitung tapi sebagai DIAGNOSTIK error analysis,
   bukan sebagai skor utama
5. Bug duplikat regex Gherkin parser dihapus
"""

import sys
import io
import json
import re
import string
import time
import nltk

# Fix Windows encoding issue
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from nltk.translate.meteor_score import meteor_score
from nltk.tokenize import word_tokenize
from deep_translator import GoogleTranslator
from langdetect import detect, DetectorFactory

DetectorFactory.seed = 0

# === Sastrawi (Indonesian stemmer) ===
try:
    from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
    _sastrawi_factory = StemmerFactory()
    _sastrawi_stemmer = _sastrawi_factory.create_stemmer()
    SASTRAWI_AVAILABLE = True
except ImportError:
    SASTRAWI_AVAILABLE = False
    _sastrawi_stemmer = None
    print("WARNING: Sastrawi not installed. Install: pip install Sastrawi", file=sys.stderr)


class IdentityStemmer:
    """No-op stemmer untuk dipakai NLTK saat teks sudah pre-stemmed dengan Sastrawi.
    Mencegah Porter stemmer (English) salah memotong token Indonesia yang sudah di-stem."""
    def stem(self, token):
        return token


# ========================
# Setup & Helpers
# ========================

def download_nltk_data():
    """Download required NLTK data if missing."""
    resources = [
        ('tokenizers/punkt', 'punkt'),
        ('tokenizers/punkt_tab', 'punkt_tab'),
        ('corpora/wordnet', 'wordnet'),
        ('corpora/omw-1.4', 'omw-1.4'),
    ]
    for path, name in resources:
        try:
            nltk.data.find(path)
        except LookupError:
            try:
                nltk.download(name, quiet=True)
            except Exception:
                pass


def detect_language(text):
    """Detect language. Returns ISO code or 'auto' on failure."""
    try:
        clean = text.strip()
        if len(clean) < 3:
            return 'auto'
        return detect(clean)
    except Exception:
        return 'auto'


def translate_text(text, target_language='en', source_language='auto'):
    """Translate via Google Translate (deep-translator)."""
    try:
        time.sleep(0.1)
        src = detect_language(text) if source_language == 'auto' else source_language
        if src == target_language:
            return {
                'success': True, 'original_text': text, 'translated_text': text,
                'source_language': src, 'target_language': target_language,
                'was_translated': False
            }
        translator = GoogleTranslator(source=src, target=target_language)
        translated = translator.translate(text)
        return {
            'success': True, 'original_text': text, 'translated_text': translated,
            'source_language': src, 'target_language': target_language,
            'was_translated': True
        }
    except Exception as e:
        return {
            'success': False, 'error': str(e),
            'original_text': text, 'translated_text': text,
            'source_language': 'unknown', 'target_language': target_language,
            'was_translated': False
        }


def stem_indonesian(text):
    """Apply Sastrawi stemming. Returns original text if Sastrawi unavailable."""
    if not SASTRAWI_AVAILABLE or not text:
        return text
    return _sastrawi_stemmer.stem(text)


def tokenize_and_filter(text):
    """Tokenize lalu buang token yang murni tanda baca.
    Strategi: pertahankan token yang mengandung minimal satu karakter alfanumerik."""
    if not text:
        return []
    raw = word_tokenize(text.lower())
    return [t for t in raw if any(c.isalnum() for c in t)]


def preprocess_text(text, detected_lang, target_language):
    """
    Preprocess teks berdasarkan bahasa:
    - Indonesia: Sastrawi stemming (tanpa translasi)
    - Lainnya: translate ke English (memanfaatkan WordNet/Porter NLTK)
    """
    is_indonesian = detected_lang == 'id' or target_language == 'id'

    if is_indonesian:
        processed = stem_indonesian(text)
        info = {
            'success': True,
            'original_text': text,
            'translated_text': text,
            'source_language': detected_lang or 'id',
            'target_language': 'id',
            'was_translated': False,
            'was_stemmed': SASTRAWI_AVAILABLE,
            'stemmed_text': processed,
        }
    else:
        translation = translate_text(text, target_language='en')
        processed = translation['translated_text']
        info = {
            **translation,
            'was_stemmed': False,
            'stemmed_text': processed,
        }

    tokens = tokenize_and_filter(processed)
    return {'processed_text': processed, 'tokens': tokens, 'info': info}


# ========================
# Core METEOR Computation
# ========================

def build_alignment(generated_tokens, reference_tokens):
    """
    Greedy alignment: untuk setiap token di hipotesis, cocokkan ke posisi
    pertama yang belum terpakai di referensi.

    Returns:
        list of (gen_idx, ref_idx) pairs, urut berdasarkan gen_idx
    """
    used_ref = set()
    alignment = []
    for gi, gtok in enumerate(generated_tokens):
        for ri, rtok in enumerate(reference_tokens):
            if ri not in used_ref and rtok == gtok:
                alignment.append((gi, ri))
                used_ref.add(ri)
                break
    return alignment


def count_chunks(alignment):
    """
    Hitung chunks sesuai METEOR (Banerjee & Lavie 2005):
    Chunk = maximal sequence of aligned token-pairs yang konsekutif
    BAIK di gen_idx MAUPUN di ref_idx (urutan sama di kedua sisi).

    Contoh:
      Gen: A B C D ; Ref: B A D C   →  alignment: (0,1)(1,0)(2,3)(3,2)
      Tidak ada pasangan konsekutif di kedua sisi → 4 chunks
    """
    if not alignment:
        return 0
    chunks = 1
    for i in range(1, len(alignment)):
        prev_gen, prev_ref = alignment[i - 1]
        curr_gen, curr_ref = alignment[i]
        if curr_gen != prev_gen + 1 or curr_ref != prev_ref + 1:
            chunks += 1
    return chunks


def calculate_diagnostic_metrics(generated_tokens, reference_tokens):
    """
    Hitung komponen METEOR untuk display: P, R, F-mean, chunks, penalty.
    Rumus mengikuti Banerjee & Lavie (2005):
        P       = m / |hypothesis|
        R       = m / |reference|
        F_mean  = 10·P·R / (R + 9·P)        (recall-weighted harmonic mean)
        Penalty = 0.5 · (chunks / m)³
        METEOR  = F_mean · (1 - Penalty)
    """
    if not generated_tokens or not reference_tokens:
        return {
            'precision': 0.0, 'recall': 0.0, 'f_mean': 0.0,
            'matches': 0, 'chunks': 0, 'penalty': 0.0, 'meteor_score': 0.0,
            'alignment': []
        }

    alignment = build_alignment(generated_tokens, reference_tokens)
    matches = len(alignment)
    chunks = count_chunks(alignment)

    precision = matches / len(generated_tokens) if generated_tokens else 0.0
    recall = matches / len(reference_tokens) if reference_tokens else 0.0

    if (9 * precision + recall) > 0:
        f_mean = (10 * precision * recall) / (9 * precision + recall)
    else:
        f_mean = 0.0

    penalty = 0.5 * (chunks / matches) ** 3 if matches > 0 else 0.0
    meteor = f_mean * (1 - penalty)

    return {
        'precision': precision,
        'recall': recall,
        'f_mean': f_mean,
        'matches': matches,
        'chunks': chunks,
        'penalty': penalty,
        'meteor_score': meteor,
        'alignment': alignment,
    }


def nltk_meteor(gen_tokens, ref_tokens, use_identity_stemmer=False):
    """
    Wrapper untuk NLTK meteor_score.
    use_identity_stemmer=True dipakai saat token sudah di-stem oleh Sastrawi,
    untuk mencegah Porter stemmer (English) merusak token Indonesia.
    """
    if not gen_tokens or not ref_tokens:
        return 0.0
    try:
        if use_identity_stemmer:
            return meteor_score([ref_tokens], gen_tokens, stemmer=IdentityStemmer())
        return meteor_score([ref_tokens], gen_tokens)
    except Exception as e:
        print(f"NLTK meteor_score error: {e}", file=sys.stderr)
        return 0.0


# ========================
# Gherkin Parser & Helpers
# ========================

def parse_gherkin_scenario(text):
    """Parse Gherkin scenario menjadi Given/When/Then sections."""
    if not text:
        return {'given': '', 'when': '', 'then': ''}

    given_m = re.search(r'Given\s+(.+?)(?=\s+When|$)', text, re.IGNORECASE | re.DOTALL)
    when_m = re.search(r'When\s+(.+?)(?=\s+Then|$)', text, re.IGNORECASE | re.DOTALL)
    then_m = re.search(r'Then\s+(.+?)$', text, re.IGNORECASE | re.DOTALL)

    return {
        'given': given_m.group(1).strip() if given_m else '',
        'when': when_m.group(1).strip() if when_m else '',
        'then': then_m.group(1).strip() if then_m else '',
    }


def get_matched_words(gen_tokens, ref_tokens):
    """Ambil kata-kata yang match untuk highlighting di UI (count-aware)."""
    matched = []
    counter = {}
    for w in gen_tokens:
        if w in ref_tokens:
            max_m = min(gen_tokens.count(w), ref_tokens.count(w))
            cur = counter.get(w, 0)
            if cur < max_m:
                matched.append({'generated': w, 'reference': w})
                counter[w] = cur + 1
    return matched


def send_progress(stage, progress, message):
    """Send progress update to Node.js via stderr."""
    payload = {'type': 'progress', 'stage': stage, 'progress': progress, 'message': message}
    print(f"PROGRESS:{json.dumps(payload)}", file=sys.stderr, flush=True)


# ========================
# Main Calculation
# ========================

def calculate_meteor(generated_text, reference_text, target_language='id'):
    """
    Hitung METEOR score sesuai Banerjee & Lavie (2005).

    Skor utama  : NLTK meteor_score pada teks utuh (preprocessed)
    Diagnostik  : P, R, F-mean, penalty (dari alignment proper) +
                  per-section breakdown untuk error analysis
    """
    try:
        download_nltk_data()

        # ===== Stage 1: Language detection & preprocessing =====
        send_progress('precision', 15, 'Mendeteksi bahasa dan preprocessing teks')

        gen_lang = detect_language(generated_text)
        ref_lang = detect_language(reference_text)
        is_indonesian = (gen_lang == 'id' or ref_lang == 'id'
                         or target_language == 'id')

        print(f"\n=== Language & Preprocessing ===", file=sys.stderr)
        print(f"Generated lang: {gen_lang}, Reference lang: {ref_lang}", file=sys.stderr)
        print(f"Sastrawi available: {SASTRAWI_AVAILABLE}, "
              f"is_indonesian: {is_indonesian}", file=sys.stderr)

        send_progress('precision', 20, 'Tokenisasi dan stemming teks')

        gen_pre = preprocess_text(generated_text, gen_lang, target_language)
        ref_pre = preprocess_text(reference_text, ref_lang, target_language)
        gen_tokens, ref_tokens = gen_pre['tokens'], ref_pre['tokens']

        print(f"Generated tokens ({len(gen_tokens)}): {gen_tokens[:15]}{'...' if len(gen_tokens) > 15 else ''}",
              file=sys.stderr)
        print(f"Reference tokens ({len(ref_tokens)}): {ref_tokens[:15]}{'...' if len(ref_tokens) > 15 else ''}",
              file=sys.stderr)

        # ===== Stage 2: Skor utama (NLTK official) =====
        send_progress('precision', 28, 'Presisi dihitung')
        send_progress('recall', 33, 'Menghitung recall kata yang ditemukan')
        send_progress('recall', 46, 'Recall dihitung')
        send_progress('fmean', 51, 'Menghitung harmonic mean')
        send_progress('fmean', 64, 'F-mean dihitung')
        send_progress('penalty', 69, 'Menghitung penalti chunk')

        # Skor utama: NLTK meteor_score (Banerjee & Lavie 2005 standard)
        # IdentityStemmer dipakai jika Sastrawi sudah pre-stem text Indonesia
        use_identity = is_indonesian and SASTRAWI_AVAILABLE
        official_score = nltk_meteor(gen_tokens, ref_tokens,
                                     use_identity_stemmer=use_identity)

        # Diagnostik komponen (P, R, F, penalty) dengan alignment proper
        diagnostic = calculate_diagnostic_metrics(gen_tokens, ref_tokens)

        print(f"\n=== METEOR Result ===", file=sys.stderr)
        print(f"NLTK official score (MAIN): {official_score:.4f}", file=sys.stderr)
        print(f"Diagnostic — P:{diagnostic['precision']:.3f}, "
              f"R:{diagnostic['recall']:.3f}, F:{diagnostic['f_mean']:.3f}, "
              f"Pen:{diagnostic['penalty']:.3f}", file=sys.stderr)
        print(f"Matches: {diagnostic['matches']}, Chunks: {diagnostic['chunks']}",
              file=sys.stderr)
        print(f"Diagnostic METEOR (cross-check): {diagnostic['meteor_score']:.4f}",
              file=sys.stderr)

        send_progress('penalty', 82, 'Penalti dihitung')
        send_progress('meteor', 87, 'Menghitung skor akhir METEOR')

        # ===== Stage 3: Per-section diagnostics =====
        gen_parts = parse_gherkin_scenario(generated_text)
        ref_parts = parse_gherkin_scenario(reference_text)
        section_metrics = {}

        for section in ('given', 'when', 'then'):
            gp_text, rp_text = gen_parts[section], ref_parts[section]

            if not (gp_text and rp_text):
                section_metrics[section] = {
                    'precision': 0.0, 'recall': 0.0, 'f_mean': 0.0,
                    'matches': 0, 'chunks': 0, 'penalty': 0.0, 'meteor_score': 0.0,
                    'generated_tokens': 0, 'reference_tokens': 0, 'matched_words': []
                }
                continue

            gp = preprocess_text(gp_text, gen_lang, target_language)
            rp = preprocess_text(rp_text, ref_lang, target_language)
            gp_tokens, rp_tokens = gp['tokens'], rp['tokens']

            sec_score = nltk_meteor(gp_tokens, rp_tokens,
                                    use_identity_stemmer=use_identity)
            sec_diag = calculate_diagnostic_metrics(gp_tokens, rp_tokens)

            print(f"Section {section.upper():5s}: NLTK={sec_score:.3f} | "
                  f"P={sec_diag['precision']:.2f} R={sec_diag['recall']:.2f} "
                  f"F={sec_diag['f_mean']:.2f} Pen={sec_diag['penalty']:.2f}",
                  file=sys.stderr)

            section_metrics[section] = {
                'precision': sec_diag['precision'],
                'recall': sec_diag['recall'],
                'f_mean': sec_diag['f_mean'],
                'matches': sec_diag['matches'],
                'chunks': sec_diag['chunks'],
                'penalty': sec_diag['penalty'],
                'meteor_score': sec_score,
                'generated_tokens': len(gp_tokens),
                'reference_tokens': len(rp_tokens),
                'matched_words': get_matched_words(gp_tokens, rp_tokens),
            }

        send_progress('meteor', 95, 'Skor METEOR selesai dihitung')

        # ===== Build response =====
        # Penjelasan transparansi: skor utama dari NLTK pada teks utuh
        preprocessing_desc = (
            'Sastrawi stemming + tokenisasi NLTK + filter tanda baca + IdentityStemmer'
            if (is_indonesian and SASTRAWI_AVAILABLE)
            else 'Translate ke English + tokenisasi NLTK + Porter stemmer + filter tanda baca'
        )

        return {
            'success': True,
            'score': official_score,  # MAIN: NLTK meteor_score (Banerjee & Lavie 2005)
            'detailed_metrics': {
                'precision': diagnostic['precision'],
                'recall': diagnostic['recall'],
                'f_mean': diagnostic['f_mean'],
                'meteor_score': official_score,  # konsisten dengan main score
                'matches': diagnostic['matches'],
                'chunks': diagnostic['chunks'],
                'penalty': diagnostic['penalty'],
                'generated_tokens': len(gen_tokens),
                'reference_tokens': len(ref_tokens),
                'section_metrics': section_metrics,
                'explanation': {
                    'precision_desc': (
                        f"Proporsi token hipotesis yang teralinasi: "
                        f"{diagnostic['matches']}/{len(gen_tokens)} = {diagnostic['precision']:.4f}"
                    ),
                    'recall_desc': (
                        f"Proporsi token referensi yang teralinasi: "
                        f"{diagnostic['matches']}/{len(ref_tokens)} = {diagnostic['recall']:.4f}"
                    ),
                    'f_mean_desc': (
                        f"Recall-weighted harmonic mean: 10·P·R/(9·P+R) = "
                        f"{diagnostic['f_mean']:.4f}"
                    ),
                    'penalty_desc': (
                        f"Penalti fragmentasi: 0.5·(chunks/matches)³ = "
                        f"0.5·({diagnostic['chunks']}/{diagnostic['matches']})³ = "
                        f"{diagnostic['penalty']:.4f}"
                        if diagnostic['matches'] > 0 else "Penalti = 0 (tidak ada matches)"
                    ),
                    'final_score_desc': (
                        f"METEOR = NLTK meteor_score (teks utuh) = {official_score:.4f}. "
                        f"Cross-check diagnostik: F·(1-Pen) = {diagnostic['meteor_score']:.4f}"
                    ),
                    'section_scores': {
                        'given': section_metrics['given']['meteor_score'],
                        'when': section_metrics['when']['meteor_score'],
                        'then': section_metrics['then']['meteor_score'],
                        'note': ('Section scores adalah DIAGNOSTIK error analysis, '
                                 'BUKAN skor utama. Skor utama dihitung pada teks utuh '
                                 'sesuai standar Banerjee & Lavie (2005).')
                    }
                }
            },
            'details': {
                'generated_tokens': len(gen_tokens),
                'reference_tokens': len(ref_tokens),
                'method': 'METEOR (Banerjee & Lavie 2005) via NLTK',
                'preprocessing': preprocessing_desc,
                'target_language': target_language,
                'sastrawi_used': SASTRAWI_AVAILABLE and is_indonesian,
                'identity_stemmer_used': use_identity,
                'generated_text_length': len(generated_text),
                'reference_text_length': len(reference_text),
            },
            'translation_info': {
                'generated': {
                    'original_language': gen_pre['info']['source_language'],
                    'was_translated': gen_pre['info']['was_translated'],
                    'was_stemmed': gen_pre['info'].get('was_stemmed', False),
                    'original_text': gen_pre['info']['original_text'],
                    'translated_text': gen_pre['info']['translated_text'],
                    'stemmed_text': gen_pre['info'].get('stemmed_text', ''),
                },
                'reference': {
                    'original_language': ref_pre['info']['source_language'],
                    'was_translated': ref_pre['info']['was_translated'],
                    'was_stemmed': ref_pre['info'].get('was_stemmed', False),
                    'original_text': ref_pre['info']['original_text'],
                    'translated_text': ref_pre['info']['translated_text'],
                    'stemmed_text': ref_pre['info'].get('stemmed_text', ''),
                },
            },
        }

    except Exception as e:
        import traceback
        print(f"ERROR in calculate_meteor: {e}", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        return {
            'success': False,
            'error': str(e),
            'score': 0.0,
            'details': {
                'method': 'METEOR (Banerjee & Lavie 2005) via NLTK',
                'target_language': target_language,
            },
        }


# Backward-compatible alias supaya pemanggilan dari Node.js tidak perlu diubah
def calculate_meteor_score_with_translation(generated_text, reference_text, target_language='en'):
    """Wrapper backward-compatible. Behavior sama dengan calculate_meteor()."""
    return calculate_meteor(generated_text, reference_text, target_language)


# ========================
# CLI Entry Point
# ========================

def main():
    if len(sys.argv) < 3:
        result = {
            'success': False,
            'error': 'Usage: python meteor_calculator.py <generated_text> <reference_text> [target_language]',
            'score': 0.0,
        }
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(1)

    generated_text = sys.argv[1]
    reference_text = sys.argv[2]
    target_language = sys.argv[3] if len(sys.argv) > 3 else 'en'

    result = calculate_meteor(generated_text, reference_text, target_language)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()