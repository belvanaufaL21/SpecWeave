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
    
    return {
        'given': given_match.group(1).strip() if given_match else '',
        'when': when_match.group(1).strip() if when_match else '',
        'then': then_match.group(1).strip() if then_match else ''
    }
