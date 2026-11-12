/**
 * Secure Code Review Assistant
 * Rule-Based JavaScript Static Analysis Engine
 *
 * Designed for academic static analysis of JavaScript source code.
 * Analyzes source code line-by-line against curated security rule definitions.
 */

const RULES = [
    // 1. Hardcoded Secrets, Passwords, and API Keys
    {
        id: "HARDCODED_SECRET",
        issue: "Hardcoded Password / Secret",
        vulnerabilityType: "CWE-798: Use of Hard-coded Credentials",
        severity: "High",
        pattern: /(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|private[_-]?key)\s*[:=]\s*["'`]([^\n"'`]{4,})["'`]/i,
        excludePattern: /(?:process\.env|config|placeholder|your[-_]password|example|dummy|changeme|test)/i,
        description: "Potential hardcoded credential or sensitive secret detected directly in source code.",
        recommendation: "Store secrets and credentials in environment variables (e.g., process.env.SECRET_KEY) or a dedicated secret management vault instead of hardcoding them in source files."
    },
    {
        id: "AWS_OR_JWT_TOKEN",
        issue: "Hardcoded Token or Key",
        vulnerabilityType: "CWE-798: Hardcoded Security Tokens",
        severity: "Critical",
        pattern: /(?:AKIA[0-9A-Z]{16}|ey[A-Za-z0-9_-]{10,}\.ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----)/,
        description: "Hardcoded authentication token, AWS access key, or private key structure detected in code.",
        recommendation: "Revoke and rotate any exposed keys immediately. Load credentials at runtime through secure environment variables or vault integrations."
    },

    // 2. Potential SQL Injection
    {
        id: "SQL_INJECTION_CONCAT",
        issue: "Potential SQL Injection",
        vulnerabilityType: "CWE-89: Improper Neutralization of Special Elements used in an SQL Command",
        severity: "Critical",
        pattern: /(?:SELECT\s+[\s\S]+?FROM|INSERT\s+INTO\s+\w+|UPDATE\s+\w+\s+SET|DELETE\s+FROM\s+\w+)[\s\S]*?['"`]\s*\+\s*[^,;\n]+|(?:SELECT\s+[\s\S]+?FROM|INSERT\s+INTO\s+\w+|UPDATE\s+\w+\s+SET|DELETE\s+FROM\s+\w+)[\s\S]*?\$\{[^}]+\}/i,
        description: "Dynamic SQL query formed using string concatenation or template literal interpolation with variables.",
        recommendation: "Use parameterized queries or prepared statements (e.g., db.query('SELECT * FROM users WHERE id = ?', [userId])) to prevent SQL injection."
    },
    {
        id: "SQL_QUERY_CONCAT_CALL",
        issue: "Unsafe Database Query Call",
        vulnerabilityType: "CWE-89: SQL Injection via Query Execution",
        severity: "Critical",
        pattern: /(?:\.query|\.execute)\s*\(\s*(?:['"`].*?(?:SELECT|UPDATE|DELETE|INSERT)[\s\S]*?['"`]\s*\+|\`[\s\S]*?\$\{[^}]+\}[\s\S]*?\`)/i,
        description: "Executing database query constructed via dynamic string formatting or interpolation.",
        recommendation: "Pass query parameters as bound values through the database driver rather than formatting strings."
    },

    // 3. Potential Command Injection
    {
        id: "COMMAND_INJECTION",
        issue: "Potential Command Injection",
        vulnerabilityType: "CWE-78: Improper Neutralization of Special Elements used in an OS Command",
        severity: "Critical",
        pattern: /(?:child_process\s*\.\s*(?:exec|execSync)|(?<!\.)\b(?:exec|execSync))\s*\(\s*(?:`[^`]*\$\{[^}]+\}[^`]*`|["'][^"']+["']\s*\+\s*[^,)]+|\w+\s*\+\s*["'])/,
        description: "System command executed with dynamically concatenated input strings without strict validation.",
        recommendation: "Avoid passing user input to shell commands. Use execFile() or spawn() with an argument array instead of shell execution."
    },

    // 4. Weak Cryptographic Algorithms
    {
        id: "WEAK_CRYPTO_HASH",
        issue: "Weak Cryptographic Algorithm",
        vulnerabilityType: "CWE-327: Use of a Broken or Risky Cryptographic Algorithm",
        severity: "Medium",
        pattern: /createHash\s*\(\s*["'](?:md5|sha1)["']\s*\)/i,
        description: "Use of MD5 or SHA-1 detected. These hashing algorithms are vulnerable to collision attacks.",
        recommendation: "Upgrade to cryptographically strong hash functions such as SHA-256 or SHA-3 for integrity checks, or bcrypt/argon2 for password hashing."
    },

    // 5. Unsafe Code Execution (eval, new Function, string timers)
    {
        id: "UNSAFE_EVAL",
        issue: "Unsafe Code Execution (eval)",
        vulnerabilityType: "CWE-95: Improper Neutralization of Directives in Dynamically Evaluated Code",
        severity: "Critical",
        pattern: /\beval\s*\([^)]+\)/,
        description: "Usage of eval() allows execution of arbitrary code strings, creating severe code injection risks.",
        recommendation: "Avoid eval() entirely. Use JSON.parse() for data serialization or safe dictionary lookups for dynamic operations."
    },
    {
        id: "DYNAMIC_FUNCTION_CONSTRUCTOR",
        issue: "Unsafe Dynamic Function Creation",
        vulnerabilityType: "CWE-95: Dynamic Code Execution via Function Constructor",
        severity: "High",
        pattern: /new\s+Function\s*\([^)]*\)/,
        description: "new Function() creates executable code from strings at runtime, similar to eval().",
        recommendation: "Refactor code to use predefined functions or closures instead of dynamically constructing executable functions."
    },
    {
        id: "STRING_TIMER_EXECUTION",
        issue: "Implicit Code Evaluation in Timer",
        vulnerabilityType: "CWE-95: Code Injection in setTimeout/setInterval",
        severity: "Medium",
        pattern: /(?:setTimeout|setInterval)\s*\(\s*["'`][^"'`]+["'`]\s*,/,
        description: "Passing strings as arguments to setTimeout or setInterval causes implicit eval() code execution.",
        recommendation: "Pass a reference to a function callback rather than a string to setTimeout or setInterval."
    },

    // 6. Additional Security Risks
    {
        id: "INSECURE_HTTP_ENDPOINT",
        issue: "Insecure HTTP Protocol Reference",
        vulnerabilityType: "CWE-319: Cleartext Transmission of Sensitive Information",
        severity: "Low",
        pattern: /["']http:\/\/(?!(?:localhost|127\.0\.0\.1|0\.0\.0\.0))[^"']+["']/i,
        description: "Unencrypted HTTP URL referenced in source code, vulnerable to eavesdropping and MITM attacks.",
        recommendation: "Enforce HTTPS with valid TLS certificates for all remote network communications."
    },
    {
        id: "DOM_XSS_INNERHTML",
        issue: "Potential DOM Cross-Site Scripting",
        vulnerabilityType: "CWE-79: Improper Neutralization of Input During Web Page Generation",
        severity: "Medium",
        pattern: /\.(?:innerHTML|outerHTML)\s*=\s*(?![`"']<[^$]*>['"`]$)/,
        description: "Direct assignment to innerHTML or outerHTML without explicit sanitization may lead to DOM-based XSS.",
        recommendation: "Use element.textContent or element.innerText for plain text, or sanitize HTML using a security library like DOMPurify."
    },
    {
        id: "DISABLED_TLS_VALIDATION",
        issue: "Disabled TLS Certificate Validation",
        vulnerabilityType: "CWE-295: Improper Certificate Validation",
        severity: "High",
        pattern: /(?:NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]0['"]|rejectUnauthorized\s*:\s*false)/,
        description: "TLS certificate validation explicitly disabled, making the application vulnerable to Man-In-The-Middle (MITM) attacks.",
        recommendation: "Never disable TLS verification in production. Install and trust required CA certificates properly."
    }
];

/**
 * Analyzes JavaScript source code line by line and returns detected findings.
 *
 * @param {string} sourceCode - Raw source code of the file.
 * @param {string} filename - Name of the analyzed file.
 * @returns {object} Analysis result containing findings and summary counts.
 */
function analyzeCode(sourceCode, filename = "source.js") {
    if (typeof sourceCode !== "string") {
        throw new Error("Invalid source code input: must be a string");
    }

    const lines = sourceCode.split(/\r?\n/);
    const findings = [];
    const seenSignatures = new Set();

    let insideMultiLineComment = false;

    lines.forEach((lineText, index) => {
        const lineNumber = index + 1;
        const trimmed = lineText.trim();

        // Check for multi-line comment boundary
        if (insideMultiLineComment) {
            if (trimmed.includes("*/")) {
                insideMultiLineComment = false;
            }
            return;
        }

        if (trimmed.startsWith("/*")) {
            if (!trimmed.includes("*/")) {
                insideMultiLineComment = true;
            }
            return;
        }

        // Skip single-line comments
        if (trimmed.startsWith("//") || trimmed.startsWith("#")) {
            return;
        }

        RULES.forEach(rule => {
            if (rule.pattern.test(lineText)) {
                // Check exclusion pattern if present
                if (rule.excludePattern && rule.excludePattern.test(lineText)) {
                    return;
                }

                // Prevent duplicate detections for the same rule on the same line
                const signature = `${rule.id}:${lineNumber}`;
                if (seenSignatures.has(signature)) {
                    return;
                }
                seenSignatures.add(signature);

                findings.push({
                    issue: rule.issue,
                    vulnerabilityType: rule.vulnerabilityType,
                    severity: rule.severity,
                    file: filename,
                    line: lineNumber,
                    description: rule.description,
                    codeSnippet: trimmed.length > 120 ? trimmed.slice(0, 117) + "..." : trimmed,
                    recommendation: rule.recommendation
                });
            }
        });
    });

    const summary = {
        total: findings.length,
        critical: findings.filter(f => f.severity === "Critical").length,
        high: findings.filter(f => f.severity === "High").length,
        medium: findings.filter(f => f.severity === "Medium").length,
        low: findings.filter(f => f.severity === "Low").length
    };

    return {
        filename,
        summary,
        findings,
        limitations: [
            "Pattern-based static analysis does not perform runtime execution or dynamic taint tracking.",
            "Obfuscated or dynamically constructed code strings may evade regular expression rules.",
            "Designed for academic and assistive static security audits."
        ]
    };
}

module.exports = {
    RULES,
    analyzeCode
};
