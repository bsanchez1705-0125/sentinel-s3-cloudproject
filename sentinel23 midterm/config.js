// ============================================================
//  SENTINEL CONFIG
// ============================================================
const SENTINEL_CONFIG = {

  // Cognito Hosted UI domain (no https://, no trailing slash)
  cognitoDomain: "us-east-2hc9vwqib2.auth.us-east-2.amazoncognito.com",

  // App Client ID
  userPoolClientId: "5jnrjc37qp097muadqadj6snk9",

  // CloudFront redirect URI — must match Cognito callback URL exactly
  redirectUri: "https://d1lntby3a9gmd4.cloudfront.net/index.html",

  // Lambda Function URL (bypasses API Gateway)
  apiEndpoint: "https://vrunopmtno5cnvbiskek2h3kdy0pmxlk.lambda-url.us-east-2.on.aws/",

};
