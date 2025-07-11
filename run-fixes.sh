#!/bin/bash

echo "Running database fixes..."

# Run the SQL fixes
echo "1. Running user profile fixes..."
psql "$DATABASE_URL" -f fix-user-profile.sql

echo "2. Running missing tables setup..."
psql "$DATABASE_URL" -f add-missing-tables.sql

echo "Database fixes completed!"
echo ""
echo "Next steps:"
echo "1. Refresh your browser"
echo "2. Try logging in with Google again"
echo "3. Check the browser console for any remaining errors" 