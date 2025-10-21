#!/bin/bash

# Flux Studio Load Testing Suite Runner
# Runs all load tests and generates a comprehensive report

echo "========================================"
echo "🚀 Flux Studio Load Testing Suite"
echo "========================================"
echo ""
echo "📅 Test Run: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Create results directory
RESULTS_DIR="tests/load/results/$(date '+%Y%m%d_%H%M%S')"
mkdir -p "$RESULTS_DIR"

echo "📊 Results will be saved to: $RESULTS_DIR"
echo ""

# Function to run a test and capture results
run_test() {
  local test_name=$1
  local test_file=$2
  local output_file="$RESULTS_DIR/${test_name}-results.json"
  local summary_file="$RESULTS_DIR/${test_name}-summary.txt"

  echo "========================================" | tee -a "$summary_file"
  echo "Running: $test_name" | tee -a "$summary_file"
  echo "========================================" | tee -a "$summary_file"
  echo "" | tee -a "$summary_file"

  # Run k6 test with JSON output
  k6 run --out json="$output_file" "$test_file" 2>&1 | tee -a "$summary_file"

  echo "" | tee -a "$summary_file"
  echo "✅ $test_name completed" | tee -a "$summary_file"
  echo "" | tee -a "$summary_file"

  # Wait between tests
  sleep 30
}

# Run all tests
echo "🧪 Starting load tests..."
echo ""

# Test 1: Authentication Load Test
run_test "authentication" "tests/load/auth-load-test.js"

# Test 2: File Operations Load Test
run_test "file-operations" "tests/load/file-ops-load-test.js"

# Test 3: Real-time Features Load Test
run_test "realtime-features" "tests/load/realtime-load-test.js"

# Generate summary report
SUMMARY_REPORT="$RESULTS_DIR/LOAD_TEST_SUMMARY.md"

echo "# Flux Studio Load Test Results" > "$SUMMARY_REPORT"
echo "" >> "$SUMMARY_REPORT"
echo "**Test Run Date**: $(date '+%Y-%m-%d %H:%M:%S')" >> "$SUMMARY_REPORT"
echo "" >> "$SUMMARY_REPORT"
echo "## Test Overview" >> "$SUMMARY_REPORT"
echo "" >> "$SUMMARY_REPORT"
echo "Three comprehensive load tests were executed:" >> "$SUMMARY_REPORT"
echo "" >> "$SUMMARY_REPORT"
echo "1. **Authentication Load Test** - Tests signup, login, OAuth, token verification" >> "$SUMMARY_REPORT"
echo "2. **File Operations Load Test** - Tests upload, download, list, search, update, delete" >> "$SUMMARY_REPORT"
echo "3. **Real-time Features Load Test** - Tests WebSocket connections, messaging, presence" >> "$SUMMARY_REPORT"
echo "" >> "$SUMMARY_REPORT"
echo "## Results Summary" >> "$SUMMARY_REPORT"
echo "" >> "$SUMMARY_REPORT"

# Extract key metrics from each test
for test_name in "authentication" "file-operations" "realtime-features"; do
  summary_file="$RESULTS_DIR/${test_name}-summary.txt"

  echo "### $test_name" >> "$SUMMARY_REPORT"
  echo "" >> "$SUMMARY_REPORT"
  echo "\`\`\`" >> "$SUMMARY_REPORT"

  # Extract key metrics (this is simplified - actual extraction would parse JSON)
  if [ -f "$summary_file" ]; then
    grep -A 20 "checks" "$summary_file" >> "$SUMMARY_REPORT" 2>/dev/null || echo "Metrics not available" >> "$SUMMARY_REPORT"
  fi

  echo "\`\`\`" >> "$SUMMARY_REPORT"
  echo "" >> "$SUMMARY_REPORT"
done

echo "## Recommendations" >> "$SUMMARY_REPORT"
echo "" >> "$SUMMARY_REPORT"
echo "Based on the test results:" >> "$SUMMARY_REPORT"
echo "" >> "$SUMMARY_REPORT"
echo "- [ ] Review any failed checks or error rates > 1%" >> "$SUMMARY_REPORT"
echo "- [ ] Investigate requests with p(95) > threshold" >> "$SUMMARY_REPORT"
echo "- [ ] Consider scaling if concurrent users approach limits" >> "$SUMMARY_REPORT"
echo "- [ ] Implement caching for endpoints with high latency" >> "$SUMMARY_REPORT"
echo "- [ ] Add database indexes for slow queries" >> "$SUMMARY_REPORT"
echo "" >> "$SUMMARY_REPORT"
echo "## Files" >> "$SUMMARY_REPORT"
echo "" >> "$SUMMARY_REPORT"
echo "- Authentication Results: \`${test_name}-results.json\`" >> "$SUMMARY_REPORT"
echo "- File Operations Results: \`file-operations-results.json\`" >> "$SUMMARY_REPORT"
echo "- Real-time Features Results: \`realtime-features-results.json\`" >> "$SUMMARY_REPORT"
echo "" >> "$SUMMARY_REPORT"

# Final summary
echo ""
echo "========================================"
echo "✅ All Load Tests Completed"
echo "========================================"
echo ""
echo "📊 Results saved to: $RESULTS_DIR"
echo ""
echo "📄 Summary report: $SUMMARY_REPORT"
echo ""
echo "View summary:"
echo "  cat $SUMMARY_REPORT"
echo ""
echo "View detailed results:"
echo "  cat $RESULTS_DIR/authentication-summary.txt"
echo "  cat $RESULTS_DIR/file-operations-summary.txt"
echo "  cat $RESULTS_DIR/realtime-features-summary.txt"
echo ""
