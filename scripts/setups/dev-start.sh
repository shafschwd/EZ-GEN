#!/bin/bash
echo '🚀 Starting EZ-GEN Development Server...'
echo '📍 Project: ~/EZ-GEN'
echo '🌐 URL: http://localhost:5005'
echo ''

# Set up SSH agent for git
eval \ > /dev/null 2>&1
ssh-add ~/.ssh/id_ed25519 > /dev/null 2>&1

# Start the server
npm start
