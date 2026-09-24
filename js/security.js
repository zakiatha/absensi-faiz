/**
 * E-ABSENSI ASRAMA - SECURITY HARDENING MODULE (SecOps)
 * Defense-in-depth utilities for input sanitization, anti-XSS, anti-CSV injection,
 * cryptographic hashing, brute-force rate-limiting, and prototype pollution defense.
 */

const SecurityUtils = {
  /**
   * Escape HTML entities to eliminate Reflected, Stored, and DOM-based XSS (OWASP A03:2021)
   */
  escapeHTML(input) {
    if (input === null || input === undefined) return '';
    const str = String(input);
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };
    return str.replace(/[&<>"'`=\/]/g, char => map[char] || char);
  },

  /**
   * Prevent CSV Formula Injection / DDE Code Execution (CWE-1236)
   * If cell starts with '=', '+', '-', '@', '\t', '\r', prefix with single quote.
   */
  sanitizeCSVCell(input) {
    if (input === null || input === undefined) return '""';
    let str = String(input).trim();

    // Check for formula trigger characters
    const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r', '|'];
    if (dangerousPrefixes.some(prefix => str.startsWith(prefix))) {
      str = "'" + str;
    }

    // Escape double quotes by doubling them
    return `"${str.replace(/"/g, '""')}"`;
  },

  /**
   * Cryptographic Password Hash (SHA-256 + Salt) using native Web Crypto API
   */
  async hashPassword(password, salt = 'asrama_pesantren_secure_salt_2026') {
    if (!password) return '';
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password + salt);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      // Fallback pseudo-hash for non-crypto environments (offline mock)
      let hash = 0;
      const combined = password + salt;
      for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
      }
      return 'fb_' + Math.abs(hash).toString(16);
    }
  },

  /**
   * Deep prototype pollution and malicious key filter for JSON imports (CWE-1321)
   */
  sanitizeObject(obj, depth = 0) {
    if (depth > 10) return null; // Prevent circular / deep recursion DoS
    if (obj === null || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, depth + 1));
    }

    const cleanObj = {};
    const forbiddenKeys = ['__proto__', 'constructor', 'prototype'];

    for (const key of Object.keys(obj)) {
      if (forbiddenKeys.includes(key)) {
        console.warn(`[Security Alert] Blocked suspicious prototype pollution key: "${key}"`);
        continue;
      }
      // Sanitize key name itself
      const cleanKey = String(key).replace(/[^\w-]/g, '');
      if (cleanKey) {
        cleanObj[cleanKey] = this.sanitizeObject(obj[key], depth + 1);
      }
    }
    return cleanObj;
  },

  /**
   * Strict String length and pattern validation
   */
  validateInput(input, type = 'text', maxLength = 100) {
    if (input === null || input === undefined) return { valid: false, message: 'Wajib diisi' };
    const str = String(input).trim();

    if (str.length === 0) {
      return { valid: false, message: 'Tidak boleh kosong' };
    }

    if (str.length > maxLength) {
      return { valid: false, message: `Maksimal ${maxLength} karakter` };
    }

    if (type === 'username') {
      const usernameRegex = /^[a-zA-Z0-9_.-]{3,30}$/;
      if (!usernameRegex.test(str)) {
        return { valid: false, message: 'Username hanya boleh huruf, angka, titik, strip (3-30 karakter)' };
      }
    }

    if (type === 'phone') {
      const phoneRegex = /^[0-9+() -]{6,20}$/;
      if (!phoneRegex.test(str)) {
        return { valid: false, message: 'Nomor telepon tidak valid' };
      }
    }

    return { valid: true, value: str };
  }
};

/**
 * Brute Force & Credential Stuffing Defense (OWASP A07:2021)
 * Sliding window lockout after consecutive failed attempts.
 */
class LoginRateLimiter {
  constructor(maxAttempts = 5, lockDurationSeconds = 30) {
    this.maxAttempts = maxAttempts;
    this.lockDurationSeconds = lockDurationSeconds;
    this.storageKey = 'absensi_login_attempts_sec';
  }

  getState() {
    const raw = sessionStorage.getItem(this.storageKey);
    if (!raw) return { failedCount: 0, lockedUntil: null };
    try {
      return JSON.parse(raw);
    } catch {
      return { failedCount: 0, lockedUntil: null };
    }
  }

  saveState(state) {
    sessionStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  isLocked() {
    const state = this.getState();
    if (!state.lockedUntil) return false;
    const remaining = Math.ceil((state.lockedUntil - Date.now()) / 1000);
    return remaining > 0 ? remaining : false;
  }

  recordFailure() {
    const state = this.getState();
    state.failedCount = (state.failedCount || 0) + 1;
    if (state.failedCount >= this.maxAttempts) {
      state.lockedUntil = Date.now() + this.lockDurationSeconds * 1000;
    }
    this.saveState(state);
    return state.failedCount;
  }

  recordSuccess() {
    sessionStorage.removeItem(this.storageKey);
  }
}

window.SecurityUtils = SecurityUtils;
window.loginLimiter = new LoginRateLimiter(5, 30);
