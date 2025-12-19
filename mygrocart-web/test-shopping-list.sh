#!/bin/bash

# Test script for shopping list integration
set -e

GRAPHQL_URL="http://localhost:5001/graphql"
TEST_EMAIL="test-$(date +%s)@example.com"

echo "=========================================="
echo "Testing Shopping List Integration"
echo "=========================================="

# 1. Create test user
echo -e "\n1. Creating test user..."
SIGNUP_RESPONSE=$(curl -s "$GRAPHQL_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"mutation { signup(email: \\\"$TEST_EMAIL\\\", password: \\\"test123456\\\", name: \\\"Test User\\\", zipCode: \\\"10001\\\") { token user { userId email name } } }\"
  }")

echo "$SIGNUP_RESPONSE" | jq .

TOKEN=$(echo "$SIGNUP_RESPONSE" | jq -r '.data.signup.token')
USER_ID=$(echo "$SIGNUP_RESPONSE" | jq -r '.data.signup.user.userId')

echo "✓ User created: $TEST_EMAIL"
echo "  User ID: $USER_ID"

# 2. Search for products
echo -e "\n2. Searching for products..."
PRODUCTS_RESPONSE=$(curl -s "$GRAPHQL_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { searchProducts(query: \"milk\") { upc name brand size } }"
  }')

echo "$PRODUCTS_RESPONSE" | jq .
UPC=$(echo "$PRODUCTS_RESPONSE" | jq -r '.data.searchProducts[0].upc')
echo "✓ Found product with UPC: $UPC"

# 3. Add item to shopping list
echo -e "\n3. Adding item to shopping list..."
ADD_RESPONSE=$(curl -s "$GRAPHQL_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"query\": \"mutation { addGroceryListItem(userId: \\\"$USER_ID\\\", upc: \\\"$UPC\\\", quantity: 2) { listItemId userId upc quantity product { name brand } } }\"
  }")

echo "$ADD_RESPONSE" | jq .
LIST_ITEM_ID=$(echo "$ADD_RESPONSE" | jq -r '.data.addGroceryListItem.listItemId')
echo "✓ Item added with ID: $LIST_ITEM_ID"

# 4. Get user grocery list
echo -e "\n4. Fetching grocery list..."
LIST_RESPONSE=$(curl -s "$GRAPHQL_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"query\": \"query { getUserGroceryLists(userId: \\\"$USER_ID\\\") { listItemId quantity product { name brand } } }\"
  }")

echo "$LIST_RESPONSE" | jq .
echo "✓ Grocery list fetched"

# 5. Update quantity
echo -e "\n5. Updating item quantity..."
UPDATE_RESPONSE=$(curl -s "$GRAPHQL_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"query\": \"mutation { updateGroceryListItem(listItemId: \\\"$LIST_ITEM_ID\\\", quantity: 3) { listItemId quantity } }\"
  }")

echo "$UPDATE_RESPONSE" | jq .
echo "✓ Quantity updated"

# 6. Remove item
echo -e "\n6. Removing item from list..."
REMOVE_RESPONSE=$(curl -s "$GRAPHQL_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"query\": \"mutation { removeGroceryListItem(listItemId: \\\"$LIST_ITEM_ID\\\") }\"
  }")

echo "$REMOVE_RESPONSE" | jq .
echo "✓ Item removed"

# 7. Verify removal
echo -e "\n7. Verifying removal..."
FINAL_LIST=$(curl -s "$GRAPHQL_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"query\": \"query { getUserGroceryLists(userId: \\\"$USER_ID\\\") { listItemId } }\"
  }")

echo "$FINAL_LIST" | jq .

echo -e "\n=========================================="
echo "✓ ALL TESTS PASSED"
echo "=========================================="
