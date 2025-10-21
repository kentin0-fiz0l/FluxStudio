#!/usr/bin/env python3
"""
FluxStudio - GitHub Repository Creation via API
This script creates the GitHub repository using GitHub's REST API
"""

import os
import sys
import json
import subprocess
from urllib.request import Request, urlopen
from urllib.error import HTTPError

# Configuration
GITHUB_USERNAME = "kentin0-fiz0l"
REPO_NAME = "FluxStudio"
REPO_DESCRIPTION = "Creative design collaboration platform with real-time messaging and collaborative editing"

def get_github_token():
    """Try to get GitHub token from various sources"""

    # Try gh CLI
    try:
        result = subprocess.run(
            ['gh', 'auth', 'token'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except:
        pass

    # Try environment variable
    token = os.environ.get('GITHUB_TOKEN') or os.environ.get('GH_TOKEN')
    if token:
        return token

    # Try reading from file (if user saves it)
    token_files = [
        os.path.expanduser('~/.github_token'),
        os.path.expanduser('~/.config/gh/token'),
    ]
    for token_file in token_files:
        if os.path.exists(token_file):
            with open(token_file, 'r') as f:
                token = f.read().strip()
                if token:
                    return token

    return None

def create_github_repo(token):
    """Create GitHub repository via API"""

    url = "https://api.github.com/user/repos"

    data = {
        "name": REPO_NAME,
        "description": REPO_DESCRIPTION,
        "private": False,
        "auto_init": False,
        "has_issues": True,
        "has_projects": True,
        "has_wiki": False
    }

    headers = {
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
    }

    req = Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers=headers,
        method='POST'
    )

    try:
        with urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            return True, result
    except HTTPError as e:
        error_body = e.read().decode('utf-8')
        try:
            error_data = json.loads(error_body)
            return False, error_data
        except:
            return False, {"message": error_body}

def setup_git_remote():
    """Configure git remote and push"""

    commands = [
        ['git', 'remote', 'remove', 'origin'],  # Remove existing (ignore errors)
        ['git', 'remote', 'add', 'origin', f'git@github.com:{GITHUB_USERNAME}/{REPO_NAME}.git'],
        ['git', 'branch', '-M', 'main'],
        ['git', 'push', '-u', 'origin', 'main']
    ]

    for cmd in commands:
        try:
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0 and 'remote add' in ' '.join(cmd):
                # Remote add failed, but might already exist
                continue
            elif result.returncode != 0 and cmd[0] == 'git' and cmd[1] == 'push':
                print(f"\n❌ Failed to push: {result.stderr}")
                return False
        except Exception as e:
            if 'remote remove' not in ' '.join(cmd):  # Ignore remove errors
                print(f"\n❌ Command failed: {' '.join(cmd)}")
                print(f"Error: {e}")
                return False

    return True

def main():
    print("=" * 50)
    print("FluxStudio - GitHub Repository Creation")
    print("=" * 50)
    print()

    # Get GitHub token
    print("1. Getting GitHub authentication token...")
    token = get_github_token()

    if not token:
        print("\n❌ No GitHub token found!")
        print()
        print("Please set up authentication using one of these methods:")
        print()
        print("Option 1: GitHub CLI")
        print("  gh auth login")
        print()
        print("Option 2: Environment Variable")
        print("  export GITHUB_TOKEN='your_token_here'")
        print()
        print("Option 3: Create token manually")
        print("  1. Go to: https://github.com/settings/tokens/new")
        print("  2. Select scopes: repo (all)")
        print("  3. Generate token")
        print("  4. Save to ~/.github_token")
        print()
        print("Option 4: Manual Setup")
        print("  1. Go to: https://github.com/new")
        print("  2. Name: FluxStudio")
        print("  3. Visibility: Public")
        print("  4. Don't initialize")
        print("  5. Run: git remote add origin git@github.com:kentin0-fiz0l/FluxStudio.git")
        print("  6. Run: git push -u origin main")
        return 1

    print("✓ GitHub token found")

    # Create repository
    print("\n2. Creating GitHub repository...")
    success, result = create_github_repo(token)

    if success:
        print(f"✓ Repository created: {result['html_url']}")
        repo_url = result['html_url']
    else:
        if 'errors' in result or result.get('message') == 'Repository creation failed.':
            print(f"\n❌ Failed to create repository")
            print(f"Error: {result}")
            return 1
        elif 'name' in result.get('errors', [{}])[0]:
            # Repository might already exist
            print("⚠ Repository might already exist, continuing...")
            repo_url = f"https://github.com/{GITHUB_USERNAME}/{REPO_NAME}"
        else:
            print(f"\n❌ Failed to create repository")
            print(f"Error: {result.get('message', 'Unknown error')}")
            return 1

    # Setup git remote and push
    print("\n3. Configuring git remote and pushing code...")
    if setup_git_remote():
        print("✓ Code pushed to GitHub")
    else:
        print("\n⚠ Failed to push code automatically")
        print("\nManual push commands:")
        print(f"  git remote add origin git@github.com:{GITHUB_USERNAME}/{REPO_NAME}.git")
        print("  git branch -M main")
        print("  git push -u origin main")
        return 1

    print()
    print("=" * 50)
    print("✓ GitHub Repository Setup Complete!")
    print("=" * 50)
    print()
    print(f"Repository URL: {repo_url}")
    print()
    print("Next Steps:")
    print("  1. Verify repository: " + repo_url)
    print("  2. Deploy to App Platform: ./deploy-complete.sh")
    print("  or")
    print("  2. Run: doctl apps create --spec .do/app.yaml --wait")
    print()

    return 0

if __name__ == "__main__":
    sys.exit(main())
