#!/usr/bin/env python3
"""
Test script for METEOR and Sentence-BERT calculators
Validates that both calculators work correctly with sample data
"""

import json
import subprocess
import sys
import os

def run_calculator(script_name, generated_text, reference_text):
    """Run a calculator script and return the result"""
    try:
        script_path = os.path.join(os.path.dirname(__file__), script_name)
        result = subprocess.run([
            sys.executable, script_path, generated_text, reference_text
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            return json.loads(result.stdout)
        else:
            return {
                'success': False,
                'error': f"Script failed with return code {result.returncode}: {result.stderr}",
                'score': 0.0
            }
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'error': "Calculator timed out after 30 seconds",
            'score': 0.0
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'score': 0.0
        }

def test_meteor_calculator():
    """Test METEOR calculator with sample data including translation"""
    print("Testing METEOR calculator with translate-first...")
    
    test_cases = [
        {
            'name': 'Identical texts (English)',
            'generated': 'Given I am a user When I login Then I should see dashboard',
            'reference': 'Given I am a user When I login Then I should see dashboard',
            'expected_min': 0.9  # Should be very high for identical texts
        },
        {
            'name': 'Similar texts (English)',
            'generated': 'Given I am a user When I login Then I should see dashboard',
            'reference': 'Given I am a customer When I sign in Then I should view dashboard',
            'expected_min': 0.3  # Should be moderate for similar texts
        },
        {
            'name': 'Mixed languages (Indonesian-English)',
            'generated': 'Ketika saya adalah pengguna Ketika saya login Maka saya harus melihat dashboard',
            'reference': 'Given I am a user When I login Then I should see dashboard',
            'expected_min': 0.4  # Should be moderate after translation
        },
        {
            'name': 'Indonesian texts',
            'generated': 'Ketika saya adalah pengguna Ketika saya login Maka saya harus melihat dashboard',
            'reference': 'Ketika saya adalah pelanggan Ketika saya masuk Maka saya harus melihat dasbor',
            'expected_min': 0.3  # Should be moderate for similar Indonesian texts
        },
        {
            'name': 'Different texts',
            'generated': 'Given I am a user When I login Then I should see dashboard',
            'reference': 'Given the weather is sunny When I go outside Then I feel happy',
            'expected_min': 0.0  # Should be low for different texts
        }
    ]
    
    all_passed = True
    
    for test_case in test_cases:
        result = run_calculator('meteor_calculator.py', test_case['generated'], test_case['reference'])
        
        if result['success']:
            score = result['score']
            passed = score >= test_case['expected_min']
            status = "✓ PASS" if passed else "✗ FAIL"
            
            # Show translation info if available
            translation_info = ""
            if 'translation_info' in result:
                gen_translated = result['translation_info']['generated']['was_translated']
                ref_translated = result['translation_info']['reference']['was_translated']
                if gen_translated or ref_translated:
                    translation_info = f" (translated: gen={gen_translated}, ref={ref_translated})"
            
            print(f"  {test_case['name']}: {status} (score: {score}){translation_info}")
            
            if not passed:
                all_passed = False
        else:
            print(f"  {test_case['name']}: ✗ ERROR - {result['error']}")
            all_passed = False
    
    return all_passed

def test_sentence_bert_calculator():
    """Test Sentence-BERT calculator with sample data"""
    print("Testing Sentence-BERT calculator...")
    
    test_cases = [
        {
            'name': 'Identical texts',
            'generated': 'Given I am a user When I login Then I should see dashboard',
            'reference': 'Given I am a user When I login Then I should see dashboard',
            'expected_min': 0.99  # Should be very high for identical texts
        },
        {
            'name': 'Similar texts',
            'generated': 'Given I am a user When I login Then I should see dashboard',
            'reference': 'Given I am a customer When I sign in Then I should view dashboard',
            'expected_min': 0.7  # Should be high for semantically similar texts
        },
        {
            'name': 'Different texts',
            'generated': 'Given I am a user When I login Then I should see dashboard',
            'reference': 'Given the weather is sunny When I go outside Then I feel happy',
            'expected_min': 0.0  # Should be low for different texts
        }
    ]
    
    all_passed = True
    
    for test_case in test_cases:
        result = run_calculator('sentence_bert_calculator.py', test_case['generated'], test_case['reference'])
        
        if result['success']:
            score = result['score']
            passed = score >= test_case['expected_min']
            status = "✓ PASS" if passed else "✗ FAIL"
            print(f"  {test_case['name']}: {status} (score: {score})")
            
            if not passed:
                all_passed = False
        else:
            print(f"  {test_case['name']}: ✗ ERROR - {result['error']}")
            all_passed = False
    
    return all_passed

def test_error_handling():
    """Test error handling with invalid inputs"""
    print("Testing error handling...")
    
    # Test with missing arguments
    try:
        result = subprocess.run([
            sys.executable, 
            os.path.join(os.path.dirname(__file__), 'meteor_calculator.py')
        ], capture_output=True, text=True)
        
        if result.returncode != 0:
            output = json.loads(result.stdout)
            if not output['success'] and 'Usage:' in output['error']:
                print("  Missing arguments: ✓ PASS")
            else:
                print("  Missing arguments: ✗ FAIL - Unexpected error format")
                return False
        else:
            print("  Missing arguments: ✗ FAIL - Should have failed")
            return False
    except Exception as e:
        print(f"  Missing arguments: ✗ ERROR - {e}")
        return False
    
    return True

def main():
    """Main test function"""
    print("Running calculator tests...\n")
    
    meteor_passed = test_meteor_calculator()
    print()
    
    sbert_passed = test_sentence_bert_calculator()
    print()
    
    error_passed = test_error_handling()
    print()
    
    if meteor_passed and sbert_passed and error_passed:
        print("✓ All tests passed! Calculators are working correctly.")
        return True
    else:
        print("✗ Some tests failed. Please check the output above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)