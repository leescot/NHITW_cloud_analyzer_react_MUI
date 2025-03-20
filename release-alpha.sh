#!/bin/bash

# Script to automate merging current branch into alpha-release branch and pushing

# Store the current branch name
CURRENT_BRANCH=$(git symbolic-ref --short HEAD)
echo "Current branch: $CURRENT_BRANCH"

# Check if there are any uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "Error: You have uncommitted changes. Please commit or stash them first."
    exit 1
fi

# Get the current version from package.json
CURRENT_VERSION=$(grep '"version":' package.json | sed 's/.*"version": "\(.*\)".*/\1/')
echo "Current version in package.json: $CURRENT_VERSION"

# Ask if the user wants to update the version
read -p "Do you want to update the version in package.json? (y/n): " UPDATE_VERSION

if [[ "$UPDATE_VERSION" =~ ^[Yy]$ ]]; then
    # Suggest an alpha version increment
    if [[ "$CURRENT_VERSION" =~ -alpha\.[0-9]+$ ]]; then
        # It's already an alpha version, suggest incrementing the alpha number
        ALPHA_NUM=$(echo "$CURRENT_VERSION" | sed 's/.*-alpha\.\([0-9]\+\).*/\1/')
        NEXT_ALPHA=$((ALPHA_NUM + 1))
        BASE_VERSION=$(echo "$CURRENT_VERSION" | sed 's/\(.*\)-alpha\.[0-9]\+.*/\1/')
        SUGGESTED_VERSION="${BASE_VERSION}-alpha.${NEXT_ALPHA}"
        echo "Suggested next alpha version: $SUGGESTED_VERSION"
    else
        # It's not an alpha version, suggest making it one
        SUGGESTED_VERSION="${CURRENT_VERSION}-alpha.1"
        echo "Suggested alpha version: $SUGGESTED_VERSION"
    fi
    
    read -p "Enter the new version number [$SUGGESTED_VERSION]: " NEW_VERSION
    NEW_VERSION=${NEW_VERSION:-$SUGGESTED_VERSION}
    
    # Update the version in package.json
    sed -i "" "s/\(\"version\":\s*\"\)$CURRENT_VERSION\(\"\)/\1$NEW_VERSION\2/" package.json
    
    echo "Version updated to $NEW_VERSION"
    
    # Commit the version change
    git add package.json
    git commit -m "Bump version to $NEW_VERSION"
    echo "Version change committed"
fi

# Switch to alpha-release branch
echo "Switching to alpha-release branch..."
git checkout alpha-release || { echo "Failed to switch to alpha-release branch"; exit 1; }

# Pull latest changes from alpha-release branch
echo "Pulling latest changes from alpha-release branch..."
git pull origin alpha-release || echo "Warning: Failed to pull from alpha-release branch. Continuing..."

# Merge the current branch into alpha-release
echo "Merging $CURRENT_BRANCH into alpha-release..."
git merge $CURRENT_BRANCH || { 
    echo "Merge conflict occurred. Aborting merge and switching back to $CURRENT_BRANCH"
    git merge --abort
    git checkout $CURRENT_BRANCH
    exit 1
}

# Push the alpha-release branch
echo "Pushing alpha-release branch to remote..."
git push origin alpha-release || { 
    echo "Failed to push alpha-release branch. Switching back to $CURRENT_BRANCH"
    git checkout $CURRENT_BRANCH
    exit 1
}

# Switch back to the original branch
echo "Switching back to $CURRENT_BRANCH..."
git checkout $CURRENT_BRANCH || echo "Warning: Failed to switch back to $CURRENT_BRANCH"

echo "Alpha release process completed successfully!"
echo "GitHub Actions workflow should now be building and creating an alpha release."
