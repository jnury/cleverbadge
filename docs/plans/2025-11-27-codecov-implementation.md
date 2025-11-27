# Codecov Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Codecov integration for unified coverage tracking, PR comments, and README badge.

**Architecture:** Modify CI workflow to upload coverage reports to Codecov instead of GitHub artifacts. Codecov merges backend and frontend reports automatically.

**Tech Stack:** GitHub Actions, codecov/codecov-action@v5, Vitest coverage (lcov format)

---

### Task 1: Remove Backend Coverage Artifact Steps

**Files:**
- Modify: `.github/workflows/ci.yml:68-90`

**Step 1: Remove backend coverage summary step**

In `.github/workflows/ci.yml`, delete lines 68-82 (the "Backend Coverage Summary" step):

```yaml
      - name: Backend Coverage Summary
        if: always()
        run: |
          echo "## 🧪 Backend Test Coverage" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo '```' >> $GITHUB_STEP_SUMMARY
          # Extract the coverage table from vitest output
          if [ -f backend-coverage-output.txt ]; then
            grep -A 20 "% Coverage report from" backend-coverage-output.txt | tail -n +2 >> $GITHUB_STEP_SUMMARY || echo "Coverage data not found in output" >> $GITHUB_STEP_SUMMARY
          else
            echo "Coverage output file not found" >> $GITHUB_STEP_SUMMARY
          fi
          echo '```' >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "📊 Full coverage report available in artifacts" >> $GITHUB_STEP_SUMMARY
```

**Step 2: Remove backend artifact upload step**

Delete lines 84-90 (the "Upload backend coverage" step):

```yaml
      - name: Upload backend coverage
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: backend-coverage
          path: backend/coverage/
          if-no-files-found: warn
```

**Step 3: Add Codecov upload step for backend**

Add after the "Run backend tests" step:

```yaml
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v5
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false
```

**Step 4: Verify YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"`
Expected: No output (valid YAML)

**Step 5: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: replace backend coverage artifacts with Codecov upload"
```

---

### Task 2: Remove Frontend Coverage Artifact Steps

**Files:**
- Modify: `.github/workflows/ci.yml` (frontend-tests job)

**Step 1: Remove frontend coverage summary step**

Delete the "Frontend Coverage Summary" step:

```yaml
      - name: Frontend Coverage Summary
        if: always()
        run: |
          echo "## 🎨 Frontend Test Coverage" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo '```' >> $GITHUB_STEP_SUMMARY
          # Extract the coverage table from vitest output
          if [ -f frontend-coverage-output.txt ]; then
            grep -A 20 "% Coverage report from" frontend-coverage-output.txt | tail -n +2 >> $GITHUB_STEP_SUMMARY || echo "Coverage data not found in output" >> $GITHUB_STEP_SUMMARY
          else
            echo "Coverage output file not found" >> $GITHUB_STEP_SUMMARY
          fi
          echo '```' >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "📊 Full coverage report available in artifacts" >> $GITHUB_STEP_SUMMARY
```

**Step 2: Remove frontend artifact upload step**

Delete the "Upload frontend coverage" step:

```yaml
      - name: Upload frontend coverage
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: frontend-coverage
          path: frontend/coverage/
          if-no-files-found: warn
```

**Step 3: Add Codecov upload step for frontend**

Add after the "Run frontend unit tests" step:

```yaml
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v5
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false
```

**Step 4: Verify YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"`
Expected: No output (valid YAML)

**Step 5: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: replace frontend coverage artifacts with Codecov upload"
```

---

### Task 3: Add Codecov Badge to README

**Files:**
- Modify: `README.md:1-3`

**Step 1: Add badge after title**

Change the beginning of `README.md` from:

```markdown
# Clever Badge

Online skills assessment platform for evaluating candidates through shareable MCQ tests.
```

To:

```markdown
# Clever Badge

[![codecov](https://codecov.io/gh/jnury/cleverbadge/graph/badge.svg)](https://codecov.io/gh/jnury/cleverbadge)

Online skills assessment platform for evaluating candidates through shareable MCQ tests.
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add Codecov coverage badge to README"
```

---

### Task 4: Update Package Versions

**Files:**
- Modify: `backend/package.json:2`
- Modify: `frontend/package.json:2`

**Step 1: Bump backend patch version**

In `backend/package.json`, change:
```json
"version": "1.2.1",
```
To:
```json
"version": "1.2.2",
```

**Step 2: Bump frontend patch version**

In `frontend/package.json`, change:
```json
"version": "1.2.1",
```
To:
```json
"version": "1.2.2",
```

**Step 3: Commit**

```bash
git add backend/package.json frontend/package.json
git commit -m "chore: bump version to 1.2.2 for Codecov integration"
```

---

### Task 5: Final Verification

**Step 1: Verify CI workflow syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"`
Expected: No output (valid YAML)

**Step 2: Review all changes**

Run: `git log --oneline -5`
Expected: See 4 commits for this feature

**Step 3: View final workflow structure**

Run: `grep -n "name:" .github/workflows/ci.yml | head -20`
Expected: See Codecov upload steps, no artifact upload steps

---

## Summary

After completing all tasks:
1. CI workflow uploads coverage to Codecov (no more artifact uploads)
2. README displays coverage badge
3. Package versions bumped to 1.2.2
4. Ready to push and see Codecov working on first CI run
