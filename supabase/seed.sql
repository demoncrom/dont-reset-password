-- ============================================================
-- Seed data: password rules for popular websites
-- ============================================================

-- Google
INSERT INTO domains (domain, display_name) VALUES ('google.com', 'Google');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'google.com'), 8, 100, false, false, false, false, 'Requires a mix of letters, numbers, and symbols', 0.9, 10);

-- Apple
INSERT INTO domains (domain, display_name) VALUES ('apple.com', 'Apple');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'apple.com'), 8, 32, true, true, true, false, 'Cannot contain more than 3 consecutive identical characters', 0.85, 8);

-- Microsoft
INSERT INTO domains (domain, display_name) VALUES ('microsoft.com', 'Microsoft');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'microsoft.com'), 8, 256, false, false, false, false, 'Must contain at least 2 of: uppercase, lowercase, number, special character', 0.85, 9);

-- Amazon
INSERT INTO domains (domain, display_name) VALUES ('amazon.com', 'Amazon');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'amazon.com'), 6, 1000, false, false, false, false, 'At least 6 characters', 0.8, 7);

-- Facebook / Meta
INSERT INTO domains (domain, display_name) VALUES ('facebook.com', 'Facebook');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'facebook.com'), 6, 1000, false, false, false, false, 'Must be at least 6 characters and include a number or symbol', 0.8, 6);

-- GitHub
INSERT INTO domains (domain, display_name) VALUES ('github.com', 'GitHub');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'github.com'), 8, 1000, true, true, true, false, 'At least 15 characters OR at least 8 characters with 1 number and 1 lowercase letter', 0.9, 12);

-- Twitter / X
INSERT INTO domains (domain, display_name) VALUES ('x.com', 'X (Twitter)');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'x.com'), 8, 1000, false, false, false, false, 'At least 8 characters', 0.75, 5);

-- Netflix
INSERT INTO domains (domain, display_name) VALUES ('netflix.com', 'Netflix');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'netflix.com'), 4, 60, false, false, false, false, 'Between 4 and 60 characters', 0.8, 6);

-- LinkedIn
INSERT INTO domains (domain, display_name) VALUES ('linkedin.com', 'LinkedIn');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'linkedin.com'), 8, 1000, false, false, false, false, 'At least 8 characters', 0.75, 5);

-- Chase Bank
INSERT INTO domains (domain, display_name) VALUES ('chase.com', 'Chase Bank');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, allowed_special_chars, no_spaces, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'chase.com'), 8, 32, true, true, true, true, '! @ # $ % ^ & * ( )', true, 0.95, 15);

-- Bank of America
INSERT INTO domains (domain, display_name) VALUES ('bankofamerica.com', 'Bank of America');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, no_spaces, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'bankofamerica.com'), 8, 20, true, true, true, false, true, 0.85, 8);

-- PayPal
INSERT INTO domains (domain, display_name) VALUES ('paypal.com', 'PayPal');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'paypal.com'), 8, 20, true, true, true, true, 'Must include 1 special character, no spaces', 0.85, 9);

-- Dropbox
INSERT INTO domains (domain, display_name) VALUES ('dropbox.com', 'Dropbox');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'dropbox.com'), 8, 1000, false, false, false, false, 'At least 8 characters, with a strength meter', 0.75, 5);

-- Taobao (淘宝)
INSERT INTO domains (domain, display_name) VALUES ('taobao.com', '淘宝');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'taobao.com'), 6, 20, false, false, false, false, '6-20 characters, letters and numbers', 0.8, 7);

-- Alipay (支付宝)
INSERT INTO domains (domain, display_name) VALUES ('alipay.com', '支付宝');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'alipay.com'), 8, 20, false, false, true, false, '8-20 characters, must include number and letter', 0.8, 6);

-- WeChat (微信)
INSERT INTO domains (domain, display_name) VALUES ('weixin.qq.com', '微信');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'weixin.qq.com'), 8, 16, false, true, true, false, '8-16 characters, must include letters and numbers', 0.8, 7);

-- JD (京东)
INSERT INTO domains (domain, display_name) VALUES ('jd.com', '京东');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'jd.com'), 6, 20, false, false, false, false, '6-20 characters, letters/numbers/symbols', 0.75, 5);

-- Baidu (百度)
INSERT INTO domains (domain, display_name) VALUES ('baidu.com', '百度');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'baidu.com'), 8, 20, false, false, false, false, '8-20 characters', 0.75, 5);

-- Bilibili (B站)
INSERT INTO domains (domain, display_name) VALUES ('bilibili.com', 'Bilibili');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'bilibili.com'), 6, 16, false, false, false, false, '6-16 characters, supports letters, numbers, and symbols', 0.75, 5);

-- Adobe
INSERT INTO domains (domain, display_name) VALUES ('adobe.com', 'Adobe');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'adobe.com'), 8, 1000, true, true, true, true, 'Must contain uppercase, lowercase, number, and special character', 0.85, 8);

-- Spotify
INSERT INTO domains (domain, display_name) VALUES ('spotify.com', 'Spotify');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'spotify.com'), 8, 1000, false, false, false, false, 'At least 8 characters with 1 letter and 1 number or special character', 0.8, 6);

-- Reddit
INSERT INTO domains (domain, display_name) VALUES ('reddit.com', 'Reddit');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'reddit.com'), 8, 1000, false, false, false, false, 'At least 8 characters', 0.75, 5);

-- Discord
INSERT INTO domains (domain, display_name) VALUES ('discord.com', 'Discord');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'discord.com'), 8, 72, false, false, false, false, 'Must be at least 8 characters long', 0.8, 6);

-- Slack
INSERT INTO domains (domain, display_name) VALUES ('slack.com', 'Slack');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'slack.com'), 8, 1000, false, false, false, false, 'At least 8 characters', 0.75, 5);

-- Notion
INSERT INTO domains (domain, display_name) VALUES ('notion.so', 'Notion');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'notion.so'), 8, 1000, false, false, false, false, 'At least 8 characters', 0.75, 4);

-- Steam
INSERT INTO domains (domain, display_name) VALUES ('steampowered.com', 'Steam');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'steampowered.com'), 7, 64, true, true, true, false, 'Must contain at least one uppercase letter, lowercase letter, and number', 0.85, 7);

-- Outlook / Hotmail
INSERT INTO domains (domain, display_name) VALUES ('live.com', 'Outlook / Hotmail');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'live.com'), 8, 256, false, false, false, false, 'Must contain at least 2 of: uppercase, lowercase, number, special character', 0.85, 8);

-- Zoom
INSERT INTO domains (domain, display_name) VALUES ('zoom.us', 'Zoom');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'zoom.us'), 8, 32, true, true, true, false, 'Must have uppercase, lowercase, and a number. Cannot contain only numbers.', 0.85, 7);

-- eBay
INSERT INTO domains (domain, display_name) VALUES ('ebay.com', 'eBay');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'ebay.com'), 8, 64, true, true, true, true, 'Must include uppercase, lowercase, number, and special character', 0.85, 7);

-- Walmart
INSERT INTO domains (domain, display_name) VALUES ('walmart.com', 'Walmart');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'walmart.com'), 8, 100, true, true, true, false, 'At least 8 characters with upper, lower, and number', 0.8, 6);

-- Instagram
INSERT INTO domains (domain, display_name) VALUES ('instagram.com', 'Instagram');
INSERT INTO password_rules (domain_id, min_length, max_length, require_uppercase, require_lowercase, require_number, require_special, notes, confidence_score, contributor_count)
VALUES ((SELECT id FROM domains WHERE domain = 'instagram.com'), 6, 1000, false, false, false, false, 'At least 6 characters, must include numbers, letters, and punctuation marks', 0.8, 6);
