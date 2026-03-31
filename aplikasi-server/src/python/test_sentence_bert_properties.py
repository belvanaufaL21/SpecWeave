#!/usr/bin/env python3
"""
Property-based tests for Sentence-BERT calculator
Tests Property 13: Sentence-BERT Score Calculation Correctness
"""

import pytest
from hypothesis import given, strategies as st, settings
from sentence_bert_calculator import calculate_sentence_bert_score
import json
import os


# Custom strategies for generating test data
@st.composite
def text_pairs(draw):
    """Generate pairs of texts for testing"""
    # Generate shorter texts for faster testing
    text1 = draw(st.text(
        alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs')),
        min_size=1,
        max_size=50
    ).filter(lambda x: x.strip()))
    
    text2 = draw(st.text(
        alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Zs')),
        min_size=1,
        max_size=50
    ).filter(lambda x: x.strip()))
    
    return text1, text2


@st.composite
def simple_gherkin_scenarios(draw):
    """Generate simple Gherkin-style scenario texts"""
    given_clause = draw(st.text(min_size=3, max_size=20).filter(lambda x: x.strip()))
    when_clause = draw(st.text(min_size=3, max_size=20).filter(lambda x: x.strip()))
    then_clause = draw(st.text(min_size=3, max_size=20).filter(lambda x: x.strip()))
    
    scenario1 = f"Given {given_clause} When {when_clause} Then {then_clause}"
    
    # Generate a second scenario that might be similar or different
    given_clause2 = draw(st.text(min_size=3, max_size=20).filter(lambda x: x.strip()))
    when_clause2 = draw(st.text(min_size=3, max_size=20).filter(lambda x: x.strip()))
    then_clause2 = draw(st.text(min_size=3, max_size=20).filter(lambda x: x.strip()))
    
    scenario2 = f"Given {given_clause2} When {when_clause2} Then {then_clause2}"
    
    return scenario1, scenario2


class TestSentenceBertProperties:
    """Property-based tests for Sentence-BERT calculator"""
    
    @given(text_pairs())
    @settings(max_examples=10, deadline=60000)  # 60 second deadline
    def test_property_13_score_range_and_precision(self, text_pair):
        """
        Property 13: Sentence-BERT Score Calculation Correctness
        
        For any pair of texts (generated, reference), Sentence-BERT calculation should:
        1. Produce cosine similarity values between 0-1
        2. Have 3 decimal precision
        3. Be reproducible
        4. Use consistent model
        
        **Feature: meteor-sentence-bert-testing, Property 13: Sentence-BERT Score Calculation Correctness**
        **Validates: Requirements 8.4**
        """
        generated_text, reference_text = text_pair
        
        # Calculate score
        result = calculate_sentence_bert_score(generated_text, reference_text)
        
        # Test 1: Should always succeed with valid inputs
        assert result['success'] is True, f"Calculation should succeed for valid inputs, got error: {result.get('error', 'Unknown')}"
        
        # Test 2: Score should be between 0 and 1 (cosine similarity range)
        score = result['score']
        assert 0.0 <= score <= 1.0, f"Score {score} should be between 0.0 and 1.0"
        
        # Test 3: Score should have exactly 3 decimal places
        score_str = str(score)
        if '.' in score_str:
            decimal_places = len(score_str.split('.')[1])
            assert decimal_places <= 3, f"Score {score} should have at most 3 decimal places, got {decimal_places}"
        
        # Test 4: Result should contain required details
        assert 'details' in result, "Result should contain details"
        details = result['details']
        
        # Test 5: Model should be consistent
        assert details['model'] == 'paraphrase-multilingual-MiniLM-L12-v2', f"Model should be 'paraphrase-multilingual-MiniLM-L12-v2', got {details['model']}"
        
        # Test 6: Method should be consistent
        assert details['method'] == 'Sentence-BERT + Cosine Similarity', f"Method should be 'Sentence-BERT + Cosine Similarity', got {details['method']}"
        
        # Test 7: Embedding dimension should be consistent (384 for paraphrase-multilingual-MiniLM-L12-v2)
        assert details['embedding_dimension'] == 384, f"Embedding dimension should be 384, got {details['embedding_dimension']}"
    
    def test_property_13_identical_texts_high_similarity(self):
        """
        Property 13 (Identical texts case): Identical texts should have very high similarity (≥ 0.99)
        
        **Feature: meteor-sentence-bert-testing, Property 13: Sentence-BERT Score Calculation Correctness**
        **Validates: Requirements 8.4**
        """
        text = "Given I am a user When I login Then I should see dashboard"
        result = calculate_sentence_bert_score(text, text)
        
        assert result['success'] is True, f"Calculation should succeed for identical texts, got error: {result.get('error', 'Unknown')}"
        
        score = result['score']
        # Identical texts should have very high similarity (allowing for floating point precision)
        assert score >= 0.99, f"Identical texts should have similarity ≥ 0.99, got {score}"
    
    @given(text_pairs())
    @settings(max_examples=5, deadline=60000)
    def test_property_13_reproducibility(self, text_pair):
        """
        Property 13 (Reproducibility): Same inputs should always produce same outputs
        
        **Feature: meteor-sentence-bert-testing, Property 13: Sentence-BERT Score Calculation Correctness**
        **Validates: Requirements 8.4**
        """
        generated_text, reference_text = text_pair
        
        # Calculate score twice
        result1 = calculate_sentence_bert_score(generated_text, reference_text)
        result2 = calculate_sentence_bert_score(generated_text, reference_text)
        
        # Both should succeed
        assert result1['success'] is True, f"First calculation should succeed, got error: {result1.get('error', 'Unknown')}"
        assert result2['success'] is True, f"Second calculation should succeed, got error: {result2.get('error', 'Unknown')}"
        
        # Scores should be identical (reproducible)
        assert result1['score'] == result2['score'], f"Scores should be identical: {result1['score']} != {result2['score']}"
        
        # Details should be identical
        assert result1['details'] == result2['details'], "Details should be identical between runs"
    
    @given(simple_gherkin_scenarios())
    @settings(max_examples=5, deadline=60000)
    def test_property_13_gherkin_scenario_handling(self, scenario_pair):
        """
        Property 13 (Gherkin scenarios): Should handle Gherkin-style scenarios correctly
        
        **Feature: meteor-sentence-bert-testing, Property 13: Sentence-BERT Score Calculation Correctness**
        **Validates: Requirements 8.4**
        """
        scenario1, scenario2 = scenario_pair
        
        result = calculate_sentence_bert_score(scenario1, scenario2)
        
        # Should succeed with Gherkin scenarios
        assert result['success'] is True, f"Calculation should succeed for Gherkin scenarios, got error: {result.get('error', 'Unknown')}"
        
        # Score should be valid
        score = result['score']
        assert 0.0 <= score <= 1.0, f"Score {score} should be between 0.0 and 1.0"
        
        # Should contain text length information
        details = result['details']
        assert 'generated_text_length' in details, "Details should contain generated_text_length"
        assert 'reference_text_length' in details, "Details should contain reference_text_length"
        assert details['generated_text_length'] == len(scenario1), f"Generated text length should match: {details['generated_text_length']} != {len(scenario1)}"
        assert details['reference_text_length'] == len(scenario2), f"Reference text length should match: {details['reference_text_length']} != {len(scenario2)}"
    
    def test_property_13_symmetry_property(self):
        """
        Property 13 (Symmetry): Cosine similarity should be symmetric: sim(A,B) = sim(B,A)
        
        **Feature: meteor-sentence-bert-testing, Property 13: Sentence-BERT Score Calculation Correctness**
        **Validates: Requirements 8.4**
        """
        # Use fixed texts for faster testing
        text1 = "Given I am a user When I login Then I see dashboard"
        text2 = "Given I am a user When I login Then I see dashboard additional content"
        
        result1 = calculate_sentence_bert_score(text1, text2)
        result2 = calculate_sentence_bert_score(text2, text1)
        
        # Both should succeed
        assert result1['success'] is True, f"First calculation should succeed, got error: {result1.get('error', 'Unknown')}"
        assert result2['success'] is True, f"Second calculation should succeed, got error: {result2.get('error', 'Unknown')}"
        
        # Scores should be identical due to symmetry of cosine similarity
        assert result1['score'] == result2['score'], f"Cosine similarity should be symmetric: {result1['score']} != {result2['score']}"


if __name__ == "__main__":
    # Run the tests
    pytest.main([__file__, "-v"])