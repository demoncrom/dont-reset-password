const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('./setup');

// Load the domain module
loadModule('extension/utils/domain.js');
const { extractDomain, getDomainFromUrl } = globalThis.DRP_Domain;

describe('DRP_Domain.extractDomain', () => {
  describe('standard domains', () => {
    it('returns google.com as-is', () => {
      assert.equal(extractDomain('google.com'), 'google.com');
    });

    it('returns github.com as-is', () => {
      assert.equal(extractDomain('github.com'), 'github.com');
    });

    it('returns example.org as-is', () => {
      assert.equal(extractDomain('example.org'), 'example.org');
    });
  });

  describe('multi-level TLDs', () => {
    it('handles .co.uk', () => {
      assert.equal(extractDomain('bbc.co.uk'), 'bbc.co.uk');
    });

    it('handles .com.cn', () => {
      assert.equal(extractDomain('amazon.com.cn'), 'amazon.com.cn');
    });

    it('handles .edu.au', () => {
      assert.equal(extractDomain('example.edu.au'), 'example.edu.au');
    });

    it('handles .com.br', () => {
      assert.equal(extractDomain('example.com.br'), 'example.com.br');
    });

    it('handles .co.jp', () => {
      assert.equal(extractDomain('example.co.jp'), 'example.co.jp');
    });
  });

  describe('subdomains', () => {
    it('strips subdomain from google.com', () => {
      assert.equal(extractDomain('mail.google.com'), 'google.com');
    });

    it('strips subdomain from bbc.co.uk', () => {
      assert.equal(extractDomain('login.bbc.co.uk'), 'bbc.co.uk');
    });

    it('strips multiple subdomains', () => {
      assert.equal(extractDomain('a.b.c.google.com'), 'google.com');
    });

    it('strips subdomain from multi-level TLD', () => {
      assert.equal(extractDomain('www.amazon.com.cn'), 'amazon.com.cn');
    });

    it('strips deep subdomain from multi-level TLD', () => {
      assert.equal(extractDomain('shop.www.amazon.com.cn'), 'amazon.com.cn');
    });
  });

  describe('edge cases', () => {
    it('returns IP address unchanged', () => {
      assert.equal(extractDomain('192.168.1.1'), '192.168.1.1');
    });

    it('returns localhost unchanged', () => {
      assert.equal(extractDomain('localhost'), 'localhost');
    });

    it('returns empty string for empty input', () => {
      assert.equal(extractDomain(''), '');
    });

    it('returns empty string for null', () => {
      assert.equal(extractDomain(null), '');
    });

    it('returns empty string for undefined', () => {
      assert.equal(extractDomain(undefined), '');
    });

    it('strips port from hostname', () => {
      assert.equal(extractDomain('example.com:8080'), 'example.com');
    });

    it('lowercases the hostname', () => {
      assert.equal(extractDomain('GOOGLE.COM'), 'google.com');
    });

    it('trims whitespace', () => {
      assert.equal(extractDomain('  google.com  '), 'google.com');
    });
  });
});

describe('DRP_Domain.getDomainFromUrl', () => {
  it('extracts domain from https URL', () => {
    assert.equal(getDomainFromUrl('https://www.google.com/search?q=test'), 'google.com');
  });

  it('extracts domain from http URL', () => {
    assert.equal(getDomainFromUrl('http://login.bbc.co.uk/signin'), 'bbc.co.uk');
  });

  it('extracts domain from URL with port', () => {
    assert.equal(getDomainFromUrl('https://example.com:443/path'), 'example.com');
  });

  it('returns empty string for invalid URL', () => {
    assert.equal(getDomainFromUrl('not-a-url'), '');
  });

  it('returns empty string for empty string', () => {
    assert.equal(getDomainFromUrl(''), '');
  });

  it('extracts domain from chrome:// URL', () => {
    // chrome:// URLs won't have a valid domain for our purposes
    // The URL constructor should handle this
    const result = getDomainFromUrl('chrome://extensions');
    assert.equal(typeof result, 'string');
  });
});
