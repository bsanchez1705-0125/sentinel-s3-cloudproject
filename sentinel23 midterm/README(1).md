# Sentinel-S3 Website — Deployment Guide

## Files You Received

| File | Purpose |
|---|---|
| `index.html` | Your modified website (drop-in replacement) |
| `config.js` | ⚠️ Fill in your AWS values here before deploying |
| `auth.js` | Cognito PKCE login/logout logic (no edits needed) |
| `dashboard.js` | Fetches DynamoDB events via API Gateway (no edits needed) |

---

## Step 1 — Fill in config.js

Open `config.js` and replace the placeholder values:

```js
cognitoDomain:    "your-domain.auth.us-east-1.amazoncognito.com"
userPoolClientId: "your-app-client-id"
redirectUri:      "https://YOUR-CLOUDFRONT-DOMAIN.cloudfront.net/index.html"
apiEndpoint:      "https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/events"
```

---

## Step 2 — Cognito App Client Settings

In the AWS Console → Cognito → User Pools → Your Pool → App Integration → App clients:

- ✅ Set **Allowed callback URL** to your CloudFront URL + `/index.html`
- ✅ Set **Allowed sign-out URL** to the same URL
- ✅ Enable **Authorization code grant** flow
- ✅ Enable scopes: `openid`, `email`, `profile`
- ✅ Make sure the app client has **NO client secret** (public SPA client)

---

## Step 3 — API Gateway (Lambda → DynamoDB)

Your Lambda function needs to:
1. Scan (or Query) the `CowrieEvents` DynamoDB table
2. Return JSON in this shape:

```json
{
  "items": [
    {
      "timestamp":  "2024-01-15T03:22:11Z",
      "sourceIp":   "192.168.1.1",
      "username":   "root",
      "password":   "123456",
      "commands":   "ls -la; cat /etc/passwd"
    }
  ]
}
```

3. Add a **Cognito Authorizer** to the GET /events method in API Gateway
   - This ensures only logged-in users can fetch data
4. Enable **CORS** on the /events route (allow your CloudFront origin)

---

## Step 4 — Upload to S3

Your S3 bucket file layout should look like:

```
sentinel-s3-bucket-1234/
├── index.html          ← from this package
├── config.js           ← from this package (with your values filled in)
├── auth.js             ← from this package
├── dashboard.js        ← from this package
├── assets/
│   ├── css/
│   │   ├── main.css
│   │   ├── ie9.css
│   │   └── noscript.css
│   └── js/
│       ├── jquery.min.js
│       ├── skel.min.js
│       ├── util.js
│       └── main.js
└── images/
    ├── bg.jpg
    ├── overlay.png
    ├── pic01.jpg
    ├── pic02.jpg
    └── pic03.jpg
```

---

## How It Works (User Flow)

1. User visits your CloudFront URL → sees the Sentinel-S3 homepage
2. User clicks **Login** → redirected to Cognito Hosted UI
3. After successful login → redirected back to your site with an auth code
4. `auth.js` exchanges the code for tokens (PKCE flow, no secret needed)
5. The **Login** nav button changes to **Dashboard**
6. Dashboard article opens and auto-fetches events from your API Gateway
7. Events table shows: Timestamp, Source IP, Username, Password, Commands
8. User can search/filter events and paginate through results
9. Clicking **Sign Out** clears tokens and redirects to Cognito logout

---

## Local Testing

You can test locally by:
1. Running a simple HTTP server: `python3 -m http.server 8080`
2. Setting `redirectUri` in config.js to `http://localhost:8080/index.html`
3. Adding `http://localhost:8080/index.html` to Cognito Allowed Callback URLs
