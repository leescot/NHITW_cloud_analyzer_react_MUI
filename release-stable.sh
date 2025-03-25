#!/bin/bash

# Script to automate merging current branch into release branch and pushing

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
    read -p "Enter the new version number: " NEW_VERSION
    
    # Update the version in package.json
    sed -i "" "s/\(\"version\":\s*\"\)$CURRENT_VERSION\(\"\)/\1$NEW_VERSION\2/" package.json
    
    echo "Version updated to $NEW_VERSION"
    
    # Commit the version change
    git add package.json
    git commit -m "Bump version to $NEW_VERSION"
    echo "Version change committed"
fi

# Switch to release branch
echo "Switching to release branch..."
git checkout release || { echo "Failed to switch to release branch"; exit 1; }

# Pull latest changes from release branch
echo "Pulling latest changes from release branch..."
git pull origin release || echo "Warning: Failed to pull from release branch. Continuing..."

# Merge the current branch into release
echo "Merging $CURRENT_BRANCH into release..."
git merge $CURRENT_BRANCH || { 
    echo "Merge conflict occurred. Aborting merge and switching back to $CURRENT_BRANCH"
    git merge --abort
    git checkout $CURRENT_BRANCH
    exit 1
}

# Push the release branch
echo "Pushing release branch to remote..."
git push origin release || { 
    echo "Failed to push release branch. Switching back to $CURRENT_BRANCH"
    git checkout $CURRENT_BRANCH
    exit 1
}

# Switch back to the original branch
echo "Switching back to $CURRENT_BRANCH..."
git checkout $CURRENT_BRANCH || echo "Warning: Failed to switch back to $CURRENT_BRANCH"

echo "Release process completed successfully!"
echo "GitHub Actions workflow should now be building and creating a release."
