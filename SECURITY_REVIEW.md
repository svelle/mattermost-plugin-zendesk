# Security Review: Mattermost Zendesk Plugin

**Date:** 2026-03-03
**Reviewer:** Automated security review (Claude)
**Scope:** Full codebase — server (Go), webapp (TypeScript/React), configuration, dependencies
**Plugin ID:** `com.github.svelle.mattermost-plugin-zendesk`

---

## Executive Summary

This plugin provides bidirectional Zendesk integration for Mattermost — OAuth-based account linking, ticket CRUD, Help Center article search, webhook-driven notifications, and a rich RHS panel. The overall security posture is **reasonable** with several strong patterns (constant-time HMAC comparison, proper OAuth state management, typed JSON deserialization). However, the review identified **2 critical**, **4 high**, and several medium/low-severity issues that should be addressed before production deployment.

---

## Critical Findings

### 1. CRITICAL — Webhook Signature Verification Bypass

**File:** `server/webhook.go:32-38`

```go
signature := r.Header.Get("X-Zendesk-Webhook-Signature")
if signature != "" {
    if !verifyWebhookSignature(body, signature, config.WebhookSecret) {
        http.Error(w, "Invalid webhook signature", http.StatusUnauthorized)
        return
    }
}
```

**Issue:** When the `X-Zendesk-Webhook-Signature` header is absent (empty string), signature verification is **completely skipped**. An attacker can send arbitrary webhook payloads without any signature and they will be processed.

**Impact:** Any external attacker who knows (or guesses) the webhook URL can inject fabricated Zendesk events, causing the bot to post attacker-controlled messages into subscribed Mattermost channels. This is a channel spoofing / information injection vector.

**Fix:** Require the signature header to be present. Reject requests with a missing signature:
```go
signature := r.Header.Get("X-Zendesk-Webhook-Signature")
if signature == "" {
    http.Error(w, "Missing webhook signature", http.StatusUnauthorized)
    return
}
if !verifyWebhookSignature(body, signature, config.WebhookSecret) {
    http.Error(w, "Invalid webhook signature", http.StatusUnauthorized)
    return
}
```

---

### 2. CRITICAL — No Channel Permission Check on Bot Posts

**Files:** `server/post_action.go:113-141`, `server/dialog.go:133-152`

**Issue:** When a ticket is created via `handleCreateTicketDirect` or `handleCreateTicketDialog`, the confirmation message is posted to whatever `ChannelID` the request body specifies. There is **no check** that the calling user has permission to post in (or even see) that channel. An authenticated Mattermost user can cause the bot to post messages containing ticket metadata into **any** channel (including private channels and DMs they are not a member of).

**Impact:** Information disclosure (ticket subjects, priority, etc. posted to channels the user shouldn't access) and bot abuse (spam arbitrary channels).

**Fix:** Add a channel permission check before posting:
```go
if !p.client.User.HasPermissionToChannel(userID, req.ChannelID, model.PermissionCreatePost) {
    writeJSON(w, http.StatusForbidden, map[string]string{"error": "no permission to post in this channel"})
    return
}
```

The same issue exists in `handleAttachPostToTicket` (`server/post_action.go:206-228`).

---

## High Findings

### 3. HIGH — No Request Body Size Limits

**Files:** All HTTP handlers in `server/api.go`, `server/webhook.go`, `server/oauth.go`, `server/dialog.go`, `server/post_action.go`

**Issue:** No handler uses `http.MaxBytesReader` or `io.LimitReader` to constrain request body sizes. The webhook handler uses bare `io.ReadAll(r.Body)` (`webhook.go:25`) and the Zendesk client uses `io.ReadAll(resp.Body)` (`zendesk/client.go:53`).

**Impact:** An attacker can send extremely large POST bodies to exhaust server memory — a denial-of-service vector.

**Fix:** Wrap all `r.Body` reads with size limits:
```go
r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // 1 MB limit
```
Similarly, limit response body reads from the Zendesk API:
```go
respBody, err := io.ReadAll(io.LimitReader(resp.Body, 10<<20)) // 10 MB limit
```

---

### 4. HIGH — Zendesk HTTP Client Has No Timeout

**File:** `server/zendesk/client.go:23`

```go
HTTPClient: http.DefaultClient,
```

**Issue:** The Zendesk API client uses Go's `http.DefaultClient`, which has **no timeout**. If the Zendesk API becomes unresponsive, every in-flight request will hang indefinitely, consuming goroutines and eventually exhausting server resources.

**Impact:** A slowloris-style condition on the upstream Zendesk API (or DNS resolution hang) will cascade into a denial of service on the Mattermost server.

**Fix:**
```go
HTTPClient: &http.Client{
    Timeout: 30 * time.Second,
},
```

---

### 5. HIGH — OAuth Token Response Body Logged

**File:** `server/oauth.go:97`

```go
p.API.LogError("OAuth token exchange failed", "status", resp.StatusCode, "body", string(body))
```

**Issue:** On a non-200 response from Zendesk's token endpoint, the **entire response body** is logged. Depending on the error condition, this could include tokens, error descriptions with client credentials, or other sensitive information in the Mattermost server logs.

**Impact:** Credential / token leakage to anyone with access to server logs.

**Fix:** Log a truncated or redacted version:
```go
p.API.LogError("OAuth token exchange failed", "status", resp.StatusCode)
```

---

### 6. HIGH — Zendesk API Error Details Leaked to Users

**Files:** Multiple locations

| File | Line | Leaking Pattern |
|------|------|-----------------|
| `server/dialog.go` | 125 | `"Failed to create ticket: " + err.Error()` |
| `server/post_action.go` | 106 | `"Failed to create ticket: " + err.Error()` |
| `server/command/command.go` | 193 | `fmt.Sprintf("Failed to get ticket #%d: %s", ticketID, err.Error())` |
| `server/command/command.go` | 230 | `fmt.Sprintf("Search failed: %s", err.Error())` |
| `server/command/command.go` | 282 | `fmt.Sprintf("Article search failed: %s", err.Error())` |
| `server/command/command.go` | 335 | `fmt.Sprintf("Failed to create subscription: %s", err.Error())` |

**Issue:** Zendesk API errors (from `client.go:59`) contain the full HTTP status code and response body: `"zendesk API error (status 403): {"error":"Forbidden","description":"..."}"`. This internal detail is returned verbatim to end users.

**Impact:** Information disclosure — attackers learn internal API structure, Zendesk error messages, potentially Zendesk account configuration details.

**Fix:** Log the full error server-side; return a generic message to users:
```go
p.API.LogError("Failed to create ticket", "error", err.Error())
writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to create ticket"})
```

---

## Medium Findings

### 7. MEDIUM — Subscription Index Race Condition

**File:** `server/store/kvstore/startertemplate.go:131-158`

**Issue:** `StoreSubscription` performs a non-atomic read-modify-write on the subscription index: it reads the index, appends the channel ID, then writes it back. If two concurrent subscribe operations execute simultaneously, one write will overwrite the other, causing a lost subscription.

**Impact:** Data loss — subscriptions silently disappear under concurrent use.

**Fix:** Use Mattermost's `KV.SetAtomicWithOptions` or a compare-and-swap loop to ensure atomicity. The same issue exists in `DeleteSubscription`.

---

### 8. MEDIUM — Missing Post Read Permission Check

**File:** `server/post_action.go:46-51`, `server/post_action.go:173-178`

**Issue:** `handleCreateTicketFromPost` and `handleAttachPostToTicket` fetch any post by ID using `p.client.Post.GetPost(req.PostID)` without verifying that the requesting user has access to the channel containing that post. An authenticated user could exfiltrate the content of posts from channels they are not a member of.

**Impact:** Information disclosure — read access to posts in arbitrary channels.

**Fix:** After fetching the post, verify the user has permission to read the channel:
```go
if !p.client.User.HasPermissionToChannel(userID, post.ChannelId, model.PermissionReadChannel) {
    writeJSON(w, http.StatusForbidden, map[string]string{"error": "no access to this post"})
    return
}
```

---

### 9. MEDIUM — OAuth Connect Endpoint Vulnerable to Login CSRF

**File:** `server/oauth.go:17-49`

**Issue:** The `/api/v1/oauth/connect` endpoint is a simple GET that redirects to Zendesk's OAuth authorization page. If an attacker controls a Zendesk account and can get a victim to visit this URL (e.g., via an `<img>` tag), the victim's Mattermost account will be linked to the **attacker's** Zendesk account without the victim's knowledge.

While the OAuth callback properly validates the `state` parameter (preventing classical CSRF on the callback), the connect endpoint itself has no CSRF protection — visiting the URL is sufficient to start the flow, and the user may authorize without realizing the Zendesk account is attacker-controlled.

**Impact:** Account linkage hijacking — the attacker can then see all ticket operations the victim performs, or the victim may unknowingly operate on the attacker's Zendesk instance.

**Fix:** Require the connect endpoint to be initiated via a POST request with a CSRF token, or present a confirmation page before redirecting to Zendesk.

---

### 10. MEDIUM — Subdomain Not Validated / Sanitized

**File:** `server/configuration.go:41-43`

```go
func (c *configuration) GetZendeskURL() string {
    return "https://" + c.ZendeskSubdomain + ".zendesk.com"
}
```

**Issue:** The `ZendeskSubdomain` config value is not validated beyond a non-empty check. A malicious or careless admin could set a subdomain containing path traversal characters (e.g., `evil.com/#`) or URL-breaking characters, potentially redirecting API calls and OAuth flows to attacker-controlled servers.

**Impact:** SSRF / credential theft if the subdomain is manipulated to point to an attacker's server.

**Fix:** Validate that the subdomain contains only alphanumeric characters, hyphens, and underscores:
```go
if !regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9_-]*$`).MatchString(c.ZendeskSubdomain) {
    return errors.New("zendesk subdomain contains invalid characters")
}
```

---

## Low Findings

### 11. LOW — Webhook Processing Goroutine Has No Panic Recovery

**File:** `server/webhook.go:48`

```go
go p.processWebhookEvent(&event)
```

**Issue:** If `processWebhookEvent` panics (e.g., nil pointer dereference on malformed data), the goroutine crashes silently. In Go, an unrecovered panic in a goroutine terminates the entire process.

**Fix:** Add panic recovery:
```go
go func() {
    defer func() {
        if r := recover(); r != nil {
            p.API.LogError("Panic in webhook processing", "error", fmt.Sprintf("%v", r))
        }
    }()
    p.processWebhookEvent(&event)
}()
```

---

### 12. LOW — No Rate Limiting on Search Endpoints

**Files:** `server/api.go` — `handleTicketSearch`, `handleArticleSearch`, `handleUserSearch`, `handleOrganizationSearch`

**Issue:** Authenticated users can issue unlimited search queries. Since each search fans out to the Zendesk API, a single user could exhaust the organization's Zendesk API rate limit.

**Fix:** Implement per-user rate limiting (e.g., token bucket) on search and write endpoints.

---

### 13. LOW — `EncryptionKey` Configuration Field is Misleading

**File:** `server/configuration.go:23`

**Issue:** The configuration struct includes an `EncryptionKey` field with a `generated` type in `plugin.json`, but it is never used in the server code. Encryption is handled by Mattermost's KV store, not by this plugin. This misleads administrators into thinking the plugin manages its own encryption.

**Fix:** Either remove the field or document its purpose clearly. If unused, remove it to reduce the attack surface.

---

### 14. LOW — OAuth Tokens Have No Expiry or Refresh Mechanism

**File:** `server/store/kvstore/startertemplate.go:69-75`

**Issue:** OAuth tokens are stored indefinitely with no TTL and no refresh mechanism. If a token is compromised, it remains valid until manually deleted. If a token expires on the Zendesk side, the user gets opaque errors until they reconnect.

**Fix:** Store token expiry metadata and implement automatic refresh using OAuth refresh tokens when available. At minimum, add token revocation on disconnect that calls the Zendesk token revocation endpoint.

---

## Informational Findings

### 15. INFO — Frontend Security Posture (Webapp)

The React frontend demonstrates good security practices:
- **No `dangerouslySetInnerHTML` usage** — all content rendered as text nodes
- **Proper URL encoding** — `encodeURIComponent()` used on all search queries
- **No local/session storage for secrets** — all auth handled server-side
- **External links use `rel="noopener noreferrer"`** — prevents tabnapping
- **No `eval()` or `Function()` usage**
- **`html_body` field from Zendesk comments is fetched but never rendered** — preventing XSS from Zendesk content

### 16. INFO — Positive Security Patterns

| Pattern | Location | Notes |
|---------|----------|-------|
| Constant-time HMAC comparison | `webhook.go:57` | Uses `hmac.Equal()` — prevents timing attacks |
| OAuth state with TTL | `startertemplate.go:39` | 10-minute expiry prevents stale state abuse |
| Typed JSON deserialization | All handlers | Prevents mass assignment / unexpected fields |
| Route regex constraints | `api.go:37` | `{id:[0-9]+}` prevents non-numeric injection |
| URL query parameter escaping | `zendesk/client.go` | `url.QueryEscape()` on all search inputs |
| Thread-safe config access | `configuration.go:60-69` | `RWMutex` + clone pattern |
| Permission checks on subscribe/unsubscribe | `command/command.go:306,350` | `HasPermissionToChannel` enforced |

---

## Summary Table

| # | Severity | Finding | File(s) |
|---|----------|---------|---------|
| 1 | **CRITICAL** | Webhook signature bypass when header missing | `webhook.go:32-38` |
| 2 | **CRITICAL** | No channel permission check on bot posts | `post_action.go`, `dialog.go` |
| 3 | HIGH | No request body size limits (DoS) | All handlers |
| 4 | HIGH | HTTP client has no timeout | `zendesk/client.go:23` |
| 5 | HIGH | OAuth response body logged | `oauth.go:97` |
| 6 | HIGH | Zendesk API errors leaked to users | Multiple |
| 7 | MEDIUM | Subscription index race condition | `startertemplate.go:131-158` |
| 8 | MEDIUM | No post read permission check | `post_action.go:46,173` |
| 9 | MEDIUM | OAuth connect Login CSRF | `oauth.go:17-49` |
| 10 | MEDIUM | Subdomain not validated | `configuration.go:41-43` |
| 11 | LOW | Webhook goroutine has no panic recovery | `webhook.go:48` |
| 12 | LOW | No rate limiting on search endpoints | `api.go` |
| 13 | LOW | Unused `EncryptionKey` config field | `configuration.go:23` |
| 14 | LOW | OAuth tokens have no expiry/refresh | `startertemplate.go:69-75` |

---

## Recommendations Priority Order

1. **Immediate** — Fix webhook signature bypass (#1)
2. **Immediate** — Add channel permission checks on all bot posts (#2)
3. **Immediate** — Add post read permission checks (#8)
4. **Short-term** — Add request body size limits (#3)
5. **Short-term** — Set HTTP client timeouts (#4)
6. **Short-term** — Stop logging token response bodies (#5)
7. **Short-term** — Return generic error messages to users (#6)
8. **Short-term** — Validate subdomain format (#10)
9. **Medium-term** — Fix subscription index atomicity (#7)
10. **Medium-term** — Add CSRF protection to OAuth connect (#9)
11. **Medium-term** — Add panic recovery to webhook goroutine (#11)
12. **Long-term** — Implement rate limiting (#12)
13. **Long-term** — Implement OAuth token refresh (#14)
