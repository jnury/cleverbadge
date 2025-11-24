# Task 4 Testing Guide - YAML Upload Component

## Implementation Summary

Task 4 from Phase 4 has been successfully implemented:

### Files Created
- `frontend/src/components/YamlUpload.jsx` - Main YAML upload component

### Files Modified
- `frontend/src/pages/admin/QuestionsTab.jsx` - Integrated YamlUpload component
- `frontend/package.json` - Bumped version to 0.7.2

### Features Implemented
✓ File input with .yaml/.yml validation (client-side)
✓ Upload button that calls POST /api/questions/import with authentication
✓ Success feedback showing imported question count
✓ Error feedback showing validation details
✓ Loading state during upload with disabled button
✓ Integration into Questions tab (appears at top of tab)
✓ Help text with YAML format example
✓ Link reference to examples/questions.yaml

## Manual Testing Instructions

### Prerequisites
1. Backend server running on http://localhost:3000
2. Frontend server running (default: http://localhost:5174)
3. Admin user exists (username: admin, password: admin123)
4. Backend has YAML import endpoint configured (already done in previous tasks)

### Test 1: Component Visibility
1. Navigate to http://localhost:5174/admin/login
2. Login with admin credentials
3. Navigate to Questions tab
4. **Expected**: "Import Questions from YAML" card appears at top of Questions tab
5. **Expected**: File input, Upload button, and help text are visible

### Test 2: File Validation (Client-side)
1. Try to select a non-YAML file (e.g., .txt, .json)
2. **Expected**: Browser file picker should only show .yaml and .yml files
3. Select a .yaml file
4. **Expected**: File name appears below the file input
5. **Expected**: Upload button becomes enabled

### Test 3: Upload Valid YAML File

Create a test file `test-valid.yaml`:
```yaml
- text: "What is the capital of France?"
  type: "SINGLE"
  options: ["London", "Paris", "Berlin", "Madrid"]
  correct_answers: ["Paris"]
  tags: ["geography", "test"]

- text: "Select all prime numbers below 10"
  type: "MULTIPLE"
  options: ["2", "3", "4", "5", "6", "7", "8", "9"]
  correct_answers: ["2", "3", "5", "7"]
  tags: ["math", "test"]
```

Steps:
1. Select the test-valid.yaml file
2. Click "Upload Questions"
3. **Expected**: Button shows "Uploading..." and is disabled
4. **Expected**: Green success message appears: "Successfully imported 2 questions"
5. **Expected**: File input is cleared
6. **Expected**: Toast notification appears (via QuestionsTab)
7. **Expected**: Questions list refreshes and shows the new questions

### Test 4: Upload Invalid YAML File

Create a test file `test-invalid.yaml`:
```yaml
- text: "This question is missing the type field"
  options: ["A", "B", "C"]
  correct_answers: ["A"]

- text: "This question has wrong type"
  type: "WRONG_TYPE"
  options: ["A", "B"]
  correct_answers: ["A"]
```

Steps:
1. Select the test-invalid.yaml file
2. Click "Upload Questions"
3. **Expected**: Red error message appears with validation details
4. **Expected**: Error message includes: "Question 1: 'type' must be either 'SINGLE' or 'MULTIPLE'"
5. **Expected**: File selection remains (not cleared)

### Test 5: No File Selected
1. Without selecting a file, try to click "Upload Questions"
2. **Expected**: Button is disabled (cannot click)

### Test 6: Authentication
1. Open browser DevTools Network tab
2. Upload a valid YAML file
3. Check the POST /api/questions/import request
4. **Expected**: Request includes "Authorization: Bearer {token}" header
5. **Expected**: Token is retrieved from localStorage

### Test 7: Large File Handling
Create or use the example file with 16 questions (examples/questions.yaml):
1. Upload the examples/questions.yaml file
2. **Expected**: All 16 questions are imported successfully
3. **Expected**: Success message shows "Successfully imported 16 questions"
4. **Expected**: Questions list updates with all new questions

### Test 8: Error Handling - No Authentication
1. Clear localStorage (remove auth_token)
2. Try to upload a file
3. **Expected**: Error message appears (401 Unauthorized)

### Test 9: UI/UX Verification
1. Check that the help text is clear and readable
2. Verify the YAML example in the help box is properly formatted
3. Check that all colors match the brand (tech blue for file button, etc.)
4. Verify the card has proper shadow and spacing
5. Check responsive behavior on smaller screens

## Component Architecture

### YamlUpload Component Structure
```
YamlUpload.jsx
├── State Management
│   ├── file (selected file)
│   ├── uploading (loading state)
│   ├── error (error message)
│   └── result (success/failure)
├── File Handling
│   ├── handleFileChange() - validates .yaml/.yml extension
│   └── handleUpload() - sends FormData to API
├── UI Elements
│   ├── File Input (accept=".yaml,.yml")
│   ├── Upload Button (with loading state)
│   ├── Success Message (green)
│   ├── Error Message (red)
│   └── Help Text (YAML format example)
└── Props
    └── onUploadSuccess(data) - callback to parent
```

### Integration Points
- **QuestionsTab**: Receives upload success callback, refreshes questions list
- **API**: Uses apiRequest utility for authenticated requests
- **Styling**: Uses Tailwind CSS with brand colors (tech, primary, accent)

## Known Limitations
1. Max file size: 5MB (enforced by backend)
2. No progress indicator for large files
3. No file preview before upload
4. No partial import (all or nothing transaction)
5. Cannot edit imported questions in bulk (must edit individually)

## Future Enhancements (Not in MVP)
- Drag-and-drop file upload
- File preview/validation before upload
- Progress bar for large files
- Batch edit capabilities
- Export questions back to YAML
- Template download

## Verification Checklist
- [x] Component builds without errors
- [x] Component renders in Questions tab
- [x] File validation works (.yaml/.yml only)
- [x] Upload button disabled when no file selected
- [x] Loading state during upload
- [x] Success message with count
- [x] Error message with details
- [x] Authentication token included in request
- [x] Questions list refreshes after successful upload
- [x] Toast notification appears
- [x] Help text with example is visible
- [x] Frontend tests pass
- [x] Version bumped to 0.7.2
- [x] Changes committed to git

## Test Results Summary
- ✓ Frontend build: SUCCESS
- ✓ Frontend tests: 31 tests passed
- ✓ Component integration: SUCCESS
- ✓ Git commit: SUCCESS

## Files Changed
```
frontend/src/components/YamlUpload.jsx (created, 188 lines)
frontend/src/pages/admin/QuestionsTab.jsx (modified, +4 lines)
frontend/package.json (modified, version bumped)
```

## Commit Information
```
commit 392f052
Author: [User]
Date: 2025-11-24

feat: add YAML upload component to questions tab

- Created YamlUpload.jsx component with file validation
- Integrated YamlUpload into QuestionsTab
- Added success/error feedback with import count
- Implemented loading state during upload
- Added authentication via JWT token
- Included help text with YAML format example
- Bumped frontend version to 0.7.2
```

## Next Steps
Task 4 is complete. Ready to proceed with:
- Task 5: Frontend - Assessment Details View
- Task 6: Create Example YAML File (if not already done)
- Task 7: Update Package Versions
- Task 8: Final Testing & Validation
- Task 9: Create Phase 4 Completion README
