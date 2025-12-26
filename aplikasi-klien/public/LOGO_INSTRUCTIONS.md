# Logo PNG Instructions

## Current Status
- Logo component is ready to use PNG files
- Currently using CSS fallback (white background with "SW" text)

## To Use PNG Logo:

1. **Create/Get PNG Logo File:**
   - File name: `logo.png`
   - Location: `client/public/logo.png`
   - Recommended size: 100x100px or larger (square format)
   - Background: Transparent or white
   - Colors: White/light colors for good contrast on dark backgrounds

2. **Update Logo Component:**
   - Open: `client/src/components/common/Logo.jsx`
   - Comment out the CSS logo div (lines with "Simple CSS Logo")
   - Uncomment the img tag section (lines with "logo.png")

3. **Example PNG Logo Requirements:**
   - White "S" and "W" shapes on transparent background
   - Or full SpecWeave logo in white/light colors
   - Square aspect ratio works best
   - High resolution for crisp display

## Current Fallback:
- White rounded square with purple "SW" text
- Maintains all size variants and animations
- Will be replaced once PNG is added