# EZ-GEN Stress Test Suite

A comprehensive stress testing suite for EZ-GEN that simulates multiple concurrent users with various valid and invalid inputs to test field validation, error handling, and system stability.

## 🎯 What It Tests

### **Field Validation Tests**
- ❌ **Empty app names**
- ❌ **App names with special characters** (`My@App#2024!`)
- ❌ **Extremely long app names** (100+ characters)
- ❌ **Non-HTTPS URLs** (`http://insecure-site.com`)
- ❌ **Malformed URLs** (`not-a-valid-url`)
- ❌ **Invalid package names** (`invalid-package-name`)
- ❌ **Package names with special characters** (`com.test@app.mobile!`)
- ❌ **Missing required fields**

### **Security Tests**
- 🔒 **SQL Injection attempts** (`'; DROP TABLE apps; --`)
- 🔒 **XSS attempts** (`<script>alert("xss")</script>`)
- 🔒 **Input sanitization validation**

### **Valid Scenarios**
- ✅ **E-commerce apps** with proper configuration
- ✅ **Blog apps** with valid URLs and package names
- ✅ **Portfolio apps** with correct formatting
- ✅ **Business apps** with all required fields

### **Performance & Stability**
- 🚀 **Concurrent user handling** (configurable 1-50+ users)
- ⚡ **Response time measurement**
- 📊 **Success/failure rate tracking**
- 🔄 **System stability under load**
- ⏱️ **Timeout handling**

## 🚀 Quick Start

### **Option 1: Interactive Runner**
```bash
cd stress-tests
./run-stress-test.sh
```

Choose from predefined test modes:
1. **Quick Test** - 5 users, 30 seconds
2. **Standard Test** - 10 users, 60 seconds  
3. **Heavy Load** - 20 users, 120 seconds
4. **Custom Test** - Your configuration

### **Option 2: Direct Command**
```bash
cd stress-tests

# Standard test
node stress-test.js

# Custom configuration
node stress-test.js --users 15 --duration 90 --log-level DEBUG
```

### **Option 3: Demo**
```bash
cd stress-tests
./demo-stress-test.sh
```

## 📊 Test Scenarios

### **Valid Apps (Should Succeed)**
```javascript
{
  appName: 'MyStore',
  websiteUrl: 'https://mystoreapp.com',
  packageName: 'com.mystore.app',
  appType: 'ecommerce'
}
```

### **Invalid App Names (Should Fail)**
```javascript
// Empty name
{ appName: '' }

// Special characters
{ appName: 'My@App#2024!' }

// Too long
{ appName: 'A'.repeat(100) }
```

### **Invalid URLs (Should Fail)**
```javascript
// Non-HTTPS
{ websiteUrl: 'http://insecure-site.com' }

// Malformed
{ websiteUrl: 'not-a-valid-url' }
```

### **Security Tests (Should Fail)**
```javascript
// SQL Injection
{ appName: "'; DROP TABLE apps; --" }

// XSS
{ appName: '<script>alert("xss")</script>' }
```

## 🛠️ Configuration Options

### **Command Line Arguments**
```bash
--users <number>      # Concurrent users (default: 10)
--duration <seconds>  # Test duration (default: 60)
--url <url>          # Server URL (default: http://localhost:5005)
--delay <ms>         # Delay between requests (default: 1000)
--log-level <level>  # DEBUG, INFO, WARN, ERROR (default: INFO)
--output <dir>       # Output directory (default: ./results)
```

### **Examples**
```bash
# Light test
node stress-test.js --users 5 --duration 30

# Heavy load test
node stress-test.js --users 25 --duration 180

# Debug mode
node stress-test.js --log-level DEBUG --users 3 --duration 30

# Custom server
node stress-test.js --url https://your-ezgen-server.com
```

## 📈 Results & Reports

### **Console Output**
Real-time test progress with color-coded results:
- ✅ **Green** - Test passed (expected behavior)
- ❌ **Red** - Test failed (unexpected behavior)  
- 🔥 **Red** - Server errors
- 🌐 **Yellow** - Network issues
- ⏱️ **Yellow** - Timeouts

### **Detailed JSON Reports**
Saved to `results/stress-test-report-[timestamp].json`:

```json
{
  "summary": {
    "totalRequests": 150,
    "successRate": "85.33%",
    "validationRate": "12.67%",
    "errorRate": "2.00%",
    "avgResponseTime": "245.67ms",
    "concurrentUsers": 10
  },
  "stats": {
    "success": 128,
    "validationErrors": 19,
    "networkErrors": 2,
    "serverErrors": 1
  },
  "scenarioBreakdown": {
    "VALID": [...],
    "VALIDATION_ERROR": [...],
    "SECURITY_TEST": [...]
  }
}
```

### **Report Metrics**
- **Success Rate** - % of requests that behaved as expected
- **Validation Rate** - % of invalid requests correctly rejected
- **Error Rate** - % of unexpected errors
- **Response Times** - Min/Max/Average response times
- **Scenario Breakdown** - Results grouped by test type

## 🎯 Test Interpretation

### **Good Results**
- ✅ **High Success Rate** (>90% for valid requests)
- ✅ **High Validation Rate** (>90% for invalid requests correctly rejected)
- ✅ **Low Error Rate** (<5% network/server errors)
- ✅ **Consistent Response Times** (<500ms average)

### **Potential Issues**
- ❌ **Low Success Rate** - Valid requests failing
- ❌ **Low Validation Rate** - Invalid requests succeeding
- ❌ **High Error Rate** - Server stability issues
- ❌ **High Response Times** - Performance problems

### **Example Good Output**
```
📊 SUMMARY:
   Total Requests: 150
   Success Rate: 92.67%
   Validation Rate: 95.83%
   Error Rate: 1.33%

⚡ PERFORMANCE:
   Average Response Time: 234.56ms
   Min Response Time: 45.23ms
   Max Response Time: 1205.67ms
```

## 🔧 Troubleshooting

### **Server Not Running**
```bash
# Start EZ-GEN server first
npm start

# OR with Docker
cd docker && ./test-docker.sh start
```

### **High Error Rates**
- Check server logs for errors
- Reduce concurrent users (`--users 5`)
- Increase delay between requests (`--delay 2000`)

### **Slow Response Times**
- Check system resources (CPU, Memory)
- Test with fewer users
- Monitor Docker container resources

### **Network Errors**
- Verify server is accessible
- Check firewall settings
- Test server URL manually

## 🔍 Debugging

### **Enable Debug Logging**
```bash
node stress-test.js --log-level DEBUG --users 2 --duration 15
```

### **Test Single Scenario**
```bash
# Modify CONFIG in stress-test.js
const CONFIG = {
  maxConcurrentUsers: 1,
  testDuration: 10000,
  logLevel: 'DEBUG'
};
```

### **Check Server Response**
```bash
# Manual test
curl -X POST http://localhost:5005/generate \
  -F "appName=TestApp" \
  -F "websiteUrl=https://example.com" \
  -F "packageName=com.test.app"
```

## 📋 Best Practices

### **Before Testing**
1. ✅ Start EZ-GEN server
2. ✅ Verify server accessibility
3. ✅ Clear previous test results
4. ✅ Monitor system resources

### **During Testing**
1. 👀 Watch console output for patterns
2. 📊 Monitor response times
3. 🔍 Check for error spikes
4. ⚡ Observe system performance

### **After Testing**
1. 📄 Review detailed JSON reports
2. 📊 Analyze success/failure patterns
3. 🔧 Identify performance bottlenecks
4. 🛠️ Fix validation issues found

## 🎯 Use Cases

### **Development Testing**
```bash
cd stress-tests
# Quick validation check
./run-stress-test.sh  # Choose option 1
```

### **Pre-Deployment Testing**
```bash
cd stress-tests
# Comprehensive test
node stress-test.js --users 15 --duration 120
```

### **Performance Benchmarking**
```bash
cd stress-tests
# Heavy load test
node stress-test.js --users 30 --duration 300 --delay 500
```

### **CI/CD Integration**
```bash
cd stress-tests
# Automated testing
node stress-test.js --users 5 --duration 30 --log-level WARN
# Exit code 0 = success, 1 = failure
```

---

## 🚀 Ready to Test!

1. **Start your EZ-GEN server**: `npm start` or `cd docker && ./test-docker.sh start`
2. **Navigate to stress tests**: `cd stress-tests`
3. **Run the stress test**: `./run-stress-test.sh`
4. **Monitor the results**
5. **Check detailed reports** in `results/`

The stress test will validate that your EZ-GEN instance correctly handles field validation, security attempts, concurrent users, and maintains stable performance under load! 🎉
