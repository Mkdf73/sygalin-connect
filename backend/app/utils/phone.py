import re

def normalize_phone(phone: str, default_country_code: str = "237") -> str:
    """
    Standardize phone numbers to E.164 format (+237...).
    - Removes non-digits.
    - Adds default country code if missing (assumes CM if 9 digits starting with 6).
    - Ensures leading +.
    """
    if not phone:
        return ""
    
    # Remove all non-digits
    digits = re.sub(r"\D", "", phone)
    
    # Handle Cameroon local format (9 digits, starts with 6)
    if len(digits) == 9 and digits.startswith("6"):
        digits = default_country_code + digits
        
    # Handle numbers starting with double zero (00237...)
    if phone.startswith("00") and len(digits) > 10:
        # already handled by re.sub for digits, just need to make sure we don't double add prefix
        pass

    # Ensure it starts with +
    if not digits.startswith("+"):
        return f"+{digits}"
        
    return digits
