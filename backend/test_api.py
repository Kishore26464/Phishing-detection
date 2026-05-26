"""
test_api.py
End-to-end API testing script.

Tests all endpoints with known phishing/legitimate URLs and SMS.
Run with: python backend/test_api.py
"""

import json
import sys
from typing import Dict, Any
import requests

# ─── CONFIGURATION ─────────────────────────────────────────────────────────

# Set to local server during development
API_BASE_URL = "http://localhost:8000/api/v1"

# Or use deployed server (uncomment if testing production)
# API_BASE_URL = "https://your-render-url.onrender.com/api/v1"

TIMEOUT = 30

# ─── COLOR OUTPUT ──────────────────────────────────────────────────────────

class Colors:
    HEADER    = '\033[95m'
    OKBLUE    = '\033[94m'
    OKGREEN   = '\033[92m'
    WARNING   = '\033[93m'
    FAIL      = '\033[91m'
    ENDC      = '\033[0m'
    BOLD      = '\033[1m'

def print_header(text):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*70}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*70}{Colors.ENDC}\n")

def print_test(test_name: str):
    print(f"{Colors.OKBLUE}▶ {test_name}{Colors.ENDC}")

def print_pass(message: str = "PASS"):
    print(f"  {Colors.OKGREEN}✓ {message}{Colors.ENDC}")

def print_fail(message: str = "FAIL", error: str = ""):
    print(f"  {Colors.FAIL}✗ {message}{Colors.ENDC}")
    if error:
        print(f"    {Colors.FAIL}Error: {error}{Colors.ENDC}")

def print_info(text: str):
    print(f"  {Colors.OKBLUE}ℹ {text}{Colors.ENDC}")

# ─── TEST DATA ─────────────────────────────────────────────────────────────

# Phishing URL feature vector (high-risk indicators)
PHISHING_URL_FEATURES = {
    "UsingIP": 0, "LongURL": 1, "ShortURL": 0, "Symbol@": 0,
    "Redirecting//": 0, "PrefixSuffix-": 1, "SubDomains": 1,
    "HTTPS": 1, "DomainRegLen": 1, "Favicon": 0, "NonStdPort": 0,
    "HTTPSDomainURL": 0, "RequestURL": 1, "AnchorURL": 1,
    "LinksInScriptTags": 1, "ServerFormHandler": 1, "InfoEmail": 0,
    "AbnormalURL": 1, "WebsiteForwarding": 1, "StatusBarCust": 0,
    "DisableRightClick": 1, "UsingPopupWindow": 1, "IframeRedirection": 1,
    "AgeofDomain": 1, "DNSRecording": 0, "WebsiteTraffic": 1,
    "PageRank": 1, "GoogleIndex": 0, "LinksPointingToPage": 1,
    "StatsReport": 1
}

# Legitimate URL feature vector (safe indicators)
LEGITIMATE_URL_FEATURES = {
    "UsingIP": 0, "LongURL": 0, "ShortURL": 0, "Symbol@": 0,
    "Redirecting//": 0, "PrefixSuffix-": 0, "SubDomains": 0,
    "HTTPS": 0, "DomainRegLen": 0, "Favicon": 0, "NonStdPort": 0,
    "HTTPSDomainURL": 0, "RequestURL": 0, "AnchorURL": 0,
    "LinksInScriptTags": 0, "ServerFormHandler": 0, "InfoEmail": 0,
    "AbnormalURL": 0, "WebsiteForwarding": 0, "StatusBarCust": 0,
    "DisableRightClick": 0, "UsingPopupWindow": 0, "IframeRedirection": 0,
    "AgeofDomain": 0, "DNSRecording": 1, "WebsiteTraffic": 1,
    "PageRank": 1, "GoogleIndex": 1, "LinksPointingToPage": 1,
    "StatsReport": 0
}

# ─── TESTS ────────────────────────────────────────────────────────────────

def test_health():
    """Test health endpoint."""
    print_test("Health Check")
    try:
        url = "http://localhost:8000/health"
        resp = requests.get(url, timeout=TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            print_info(f"Status: {data.get('status', 'unknown')}")
            print_pass()
            return True
        else:
            print_fail(f"HTTP {resp.status_code}")
            return False
    except Exception as e:
        print_fail("Connection failed", str(e))
        return False

def test_scan_phishing_url():
    """Test scanning a phishing URL."""
    print_test("Scan Phishing URL")
    try:
        payload = {
            "url": "http://suspicious-banking-verify.com/account-update",
            "features": PHISHING_URL_FEATURES
        }
        resp = requests.post(
            f"{API_BASE_URL}/scan-url",
            json=payload,
            timeout=TIMEOUT
        )
        if resp.status_code == 200:
            data = resp.json()
            threat = data.get("threat_level", "unknown").upper()
            confidence = data.get("confidence", 0)
            
            print_info(f"URL: {payload['url']}")
            print_info(f"Threat Level: {threat}")
            print_info(f"Confidence: {confidence:.2%}")
            
            if threat in ["DANGEROUS", "SUSPICIOUS"]:
                print_pass()
                return True
            else:
                print_fail("Expected DANGEROUS/SUSPICIOUS threat level")
                return False
        else:
            print_fail(f"HTTP {resp.status_code}", resp.text)
            return False
    except Exception as e:
        print_fail("Request failed", str(e))
        return False

def test_scan_legitimate_url():
    """Test scanning a legitimate URL."""
    print_test("Scan Legitimate URL")
    try:
        payload = {
            "url": "https://www.google.com",
            "features": LEGITIMATE_URL_FEATURES
        }
        resp = requests.post(
            f"{API_BASE_URL}/scan-url",
            json=payload,
            timeout=TIMEOUT
        )
        if resp.status_code == 200:
            data = resp.json()
            threat = data.get("threat_level", "unknown").upper()
            confidence = data.get("confidence", 0)
            
            print_info(f"URL: {payload['url']}")
            print_info(f"Threat Level: {threat}")
            print_info(f"Confidence: {confidence:.2%}")
            
            if threat == "SAFE":
                print_pass()
                return True
            else:
                print_fail("Expected SAFE threat level")
                return False
        else:
            print_fail(f"HTTP {resp.status_code}", resp.text)
            return False
    except Exception as e:
        print_fail("Request failed", str(e))
        return False

def test_scan_phishing_sms():
    """Test scanning a phishing SMS."""
    print_test("Scan Phishing SMS")
    try:
        payload = {
            "message": "URGENT! Your bank account has been compromised. Verify your identity immediately by clicking: https://fake-banking-verify.com. Do not share this link."
        }
        resp = requests.post(
            f"{API_BASE_URL}/scan-sms",
            json=payload,
            timeout=TIMEOUT
        )
        if resp.status_code == 200:
            data = resp.json()
            threat = data.get("threat_level", "unknown").upper()
            confidence = data.get("confidence", 0)
            
            print_info(f"Message: {payload['message'][:50]}...")
            print_info(f"Threat Level: {threat}")
            print_info(f"Confidence: {confidence:.2%}")
            
            if threat in ["DANGEROUS", "SUSPICIOUS"]:
                print_pass()
                return True
            else:
                print_fail("Expected DANGEROUS/SUSPICIOUS threat level")
                return False
        else:
            print_fail(f"HTTP {resp.status_code}", resp.text)
            return False
    except Exception as e:
        print_fail("Request failed", str(e))
        return False

def test_scan_legitimate_sms():
    """Test scanning a legitimate SMS."""
    print_test("Scan Legitimate SMS")
    try:
        # Use a message with business/casual content that avoids phishing keywords
        # Avoids: track, verify, click, urgent, confirm, update, etc.
        payload = {
            "message": "Hi Sarah! Just wanted to remind you about the meeting tomorrow at 2pm. Looking forward to catching up!"
        }
        resp = requests.post(
            f"{API_BASE_URL}/scan-sms",
            json=payload,
            timeout=TIMEOUT
        )
        if resp.status_code == 200:
            data = resp.json()
            threat = data.get("threat_level", "unknown").upper()
            confidence = data.get("confidence", 0)
            
            print_info(f"Message: {payload['message'][:50]}...")
            print_info(f"Threat Level: {threat}")
            print_info(f"Confidence: {confidence:.2%}")
            
            if threat == "SAFE":
                print_pass()
                return True
            else:
                print_fail("Expected SAFE threat level")
                return False
        else:
            print_fail(f"HTTP {resp.status_code}", resp.text)
            return False
    except Exception as e:
        print_fail("Request failed", str(e))
        return False

def test_threat_history():
    """Test retrieving threat history."""
    print_test("Get Threat History")
    try:
        resp = requests.get(
            f"{API_BASE_URL}/threat-history?page=1&page_size=10",
            timeout=TIMEOUT
        )
        if resp.status_code == 200:
            data = resp.json()
            history = data.get("history", [])
            total = data.get("total", 0)
            
            print_info(f"Total scans: {total}")
            print_info(f"Showing page 1: {len(history)} entries")
            print_pass()
            return True
        else:
            print_fail(f"HTTP {resp.status_code}", resp.text)
            return False
    except Exception as e:
        print_fail("Request failed", str(e))
        return False

def test_app_analysis():
    """Test APK permission analysis."""
    print_test("Analyze App Permissions")
    try:
        payload = {
            "app_name": "TestApp",
            "permissions": [
                "android.permission.INTERNET",
                "android.permission.CAMERA",
                "android.permission.READ_SMS",
                "android.permission.SEND_SMS",
                "android.permission.RECORD_AUDIO"
            ]
        }
        resp = requests.post(
            f"{API_BASE_URL}/analyze-app",
            json=payload,
            timeout=TIMEOUT
        )
        if resp.status_code == 200:
            data = resp.json()
            threat = data.get("threat_level", "unknown").upper()
            score = data.get("risk_score", 0)
            
            print_info(f"App: {payload['app_name']}")
            print_info(f"Permissions analyzed: {len(payload['permissions'])}")
            print_info(f"Risk Score: {score}/100")
            print_info(f"Threat Level: {threat}")
            print_pass()
            return True
        else:
            print_fail(f"HTTP {resp.status_code}", resp.text)
            return False
    except Exception as e:
        print_fail("Request failed", str(e))
        return False

# ─── MAIN ──────────────────────────────────────────────────────────────────

def main():
    print_header("🔒 PHISHING & MALWARE DETECTION API - COMPREHENSIVE TEST SUITE")
    
    print(f"API Base URL: {Colors.OKBLUE}{API_BASE_URL}{Colors.ENDC}\n")
    
    results = {
        "Health Check": test_health(),
        "Scan Phishing URL": test_scan_phishing_url(),
        "Scan Legitimate URL": test_scan_legitimate_url(),
        "Scan Phishing SMS": test_scan_phishing_sms(),
        "Scan Legitimate SMS": test_scan_legitimate_sms(),
        "Get Threat History": test_threat_history(),
        "Analyze App Permissions": test_app_analysis(),
    }
    
    # ─── SUMMARY ──────────────────────────────────────────────────────────
    
    print_header("TEST SUMMARY")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = f"{Colors.OKGREEN}PASS{Colors.ENDC}" if result else f"{Colors.FAIL}FAIL{Colors.ENDC}"
        print(f"  {test_name}: {status}")
    
    print(f"\n{Colors.BOLD}Total: {passed}/{total} tests passed{Colors.ENDC}\n")
    
    if passed == total:
        print(f"{Colors.OKGREEN}{Colors.BOLD}✓ ALL TESTS PASSED!{Colors.ENDC}\n")
        return 0
    else:
        print(f"{Colors.FAIL}{Colors.BOLD}✗ Some tests failed. Check logs above.{Colors.ENDC}\n")
        return 1

if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print(f"\n{Colors.FAIL}Test interrupted by user.{Colors.ENDC}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.FAIL}Unexpected error: {e}{Colors.ENDC}")
        sys.exit(1)
