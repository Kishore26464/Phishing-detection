import re
import urllib.parse

SUSPICIOUS_KEYWORDS = [
    "login", "signin", "verify", "update", "secure", "account",
    "banking", "paypal", "ebay", "amazon", "apple", "microsoft",
    "confirm", "password", "credential", "wallet", "kyc", "otp"
]

def extract_features(url: str) -> list:
    try:
        parsed = urllib.parse.urlparse(url)
        hostname = parsed.hostname or ""
        path = parsed.path or ""
        full = url.lower()

        url_length = len(url)
        dot_count = url.count(".")
        hyphen_count = url.count("-")
        digit_count = sum(c.isdigit() for c in url)
        has_https = 1 if parsed.scheme == "https" else 0
        has_ip = 1 if re.match(r"(\d{1,3}\.){3}\d{1,3}", hostname) else 0
        special_char_count = len(re.findall(r"[@_!#$%^&*()<>?/\\|}{~:]", url))
        subdomain_count = len(hostname.split(".")) - 2 if hostname else 0
        path_length = len(path)
        has_suspicious_keyword = 1 if any(k in full for k in SUSPICIOUS_KEYWORDS) else 0
        double_slash_count = url.count("//") - 1
        at_symbol = 1 if "@" in url else 0
        tilde_symbol = 1 if "~" in url else 0
        query_length = len(parsed.query) if parsed.query else 0
        has_port = 1 if parsed.port else 0

        return [
            url_length, dot_count, hyphen_count, digit_count,
            has_https, has_ip, special_char_count, subdomain_count,
            path_length, has_suspicious_keyword, double_slash_count,
            at_symbol, tilde_symbol, query_length, has_port
        ]

    except Exception:
        return [0] * 15

FEATURE_NAMES = [
    "url_length", "dot_count", "hyphen_count", "digit_count",
    "has_https", "has_ip", "special_char_count", "subdomain_count",
    "path_length", "has_suspicious_keyword", "double_slash_count",
    "at_symbol", "tilde_symbol", "query_length", "has_port"
]

if __name__ == "__main__":
    test_urls = [
        "https://www.google.com",
        "http://paypal-login-verify.suspicious-site.com/account/update?id=123",
        "http://192.168.1.1/login",
        "https://secure-banking-update.com/kyc/verify@user",
    ]
    for url in test_urls:
        features = extract_features(url)
        print(f"\nURL: {url}")
        for name, val in zip(FEATURE_NAMES, features):
            print(f"  {name}: {val}")
