const oauthManager = require('./lib/oauth-manager');

// Test GitHub OAuth configuration
const providers = ['figma', 'slack', 'github'];

console.log('\n=== OAuth Manager Configuration Test ===\n');

providers.forEach(provider => {
  try {
    const config = oauthManager.providers.get(provider);
    if (config) {
      console.log(`✅ ${provider.toUpperCase()} configured:`);
      console.log(`   Client ID: ${config.clientId ? 'SET' : 'NOT SET'}`);
      console.log(`   Client Secret: ${config.clientSecret ? 'SET' : 'NOT SET'}`);
      console.log(`   Redirect URI: ${config.redirectUri}`);
      console.log(`   Scopes: ${config.scope.join(', ')}`);
    } else {
      console.log(`❌ ${provider.toUpperCase()} NOT configured`);
    }
    console.log('');
  } catch (error) {
    console.log(`❌ Error checking ${provider}: ${error.message}`);
  }
});

console.log('\n=== Test Complete ===\n');
