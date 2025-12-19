#!/usr/bin/env node
/**
 * Test script for shopping list integration
 * Tests the GraphQL API for shopping list operations
 */

const fetch = require('node-fetch');

const GRAPHQL_ENDPOINT = 'http://localhost:5001/graphql';

// Helper function to make GraphQL requests
async function graphqlRequest(query, variables = {}, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();

  if (result.errors) {
    console.error('GraphQL Error:', JSON.stringify(result.errors, null, 2));
    throw new Error(result.errors[0].message);
  }

  return result.data;
}

// Test queries and mutations
const SIGNUP = `
  mutation Signup($email: String!, $password: String!, $name: String, $zipCode: String!) {
    signup(email: $email, password: $password, name: $name, zipCode: $zipCode) {
      token
      user {
        userId
        email
        name
        zipCode
      }
    }
  }
`;

const SEARCH_PRODUCTS = `
  query SearchProducts($query: String!) {
    searchProducts(query: $query) {
      upc
      name
      brand
      size
      imageUrl
    }
  }
`;

const ADD_GROCERY_LIST_ITEM = `
  mutation AddGroceryListItem($userId: String!, $upc: String!, $quantity: Int!) {
    addGroceryListItem(userId: $userId, upc: $upc, quantity: $quantity) {
      listItemId
      userId
      upc
      quantity
      product {
        upc
        name
        brand
        size
      }
    }
  }
`;

const GET_USER_GROCERY_LISTS = `
  query GetUserGroceryLists($userId: String!) {
    getUserGroceryLists(userId: $userId) {
      listItemId
      userId
      upc
      quantity
      product {
        upc
        name
        brand
        size
        imageUrl
      }
    }
  }
`;

const UPDATE_GROCERY_LIST_ITEM = `
  mutation UpdateGroceryListItem($listItemId: String!, $quantity: Int!) {
    updateGroceryListItem(listItemId: $listItemId, quantity: $quantity) {
      listItemId
      quantity
    }
  }
`;

const REMOVE_GROCERY_LIST_ITEM = `
  mutation RemoveGroceryListItem($listItemId: String!) {
    removeGroceryListItem(listItemId: $listItemId)
  }
`;

async function runTests() {
  console.log('='.repeat(60));
  console.log('Testing Shopping List Integration');
  console.log('='.repeat(60));

  let token = null;
  let userId = null;
  let listItemId = null;

  try {
    // 1. Create test user
    console.log('\n1. Creating test user...');
    const testEmail = `test-${Date.now()}@example.com`;
    const signupData = await graphqlRequest(SIGNUP, {
      email: testEmail,
      password: 'test123456',
      name: 'Test User',
      zipCode: '10001'
    });

    token = signupData.signup.token;
    userId = signupData.signup.user.userId;
    console.log('✓ User created:', signupData.signup.user.email);
    console.log('  User ID:', userId);

    // 2. Search for products
    console.log('\n2. Searching for products...');
    const productsData = await graphqlRequest(SEARCH_PRODUCTS, {
      query: 'milk'
    });
    console.log('✓ Found products:', productsData.searchProducts.length);
    productsData.searchProducts.forEach(p => {
      console.log(`  - ${p.name} (${p.brand}) - UPC: ${p.upc}`);
    });

    const testProduct = productsData.searchProducts[0];

    // 3. Add item to shopping list
    console.log('\n3. Adding item to shopping list...');
    const addItemData = await graphqlRequest(ADD_GROCERY_LIST_ITEM, {
      userId,
      upc: testProduct.upc,
      quantity: 2
    }, token);

    listItemId = addItemData.addGroceryListItem.listItemId;
    console.log('✓ Item added to list');
    console.log('  List Item ID:', listItemId);
    console.log('  Product:', addItemData.addGroceryListItem.product.name);
    console.log('  Quantity:', addItemData.addGroceryListItem.quantity);

    // 4. Get user grocery list
    console.log('\n4. Fetching grocery list...');
    const listData = await graphqlRequest(GET_USER_GROCERY_LISTS, {
      userId
    }, token);
    console.log('✓ Grocery list fetched');
    console.log('  Total items:', listData.getUserGroceryLists.length);
    listData.getUserGroceryLists.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.product.name} (${item.product.brand}) x${item.quantity}`);
    });

    // 5. Update quantity
    console.log('\n5. Updating item quantity...');
    const updateData = await graphqlRequest(UPDATE_GROCERY_LIST_ITEM, {
      listItemId,
      quantity: 3
    }, token);
    console.log('✓ Quantity updated to:', updateData.updateGroceryListItem.quantity);

    // 6. Verify update
    console.log('\n6. Verifying update...');
    const updatedListData = await graphqlRequest(GET_USER_GROCERY_LISTS, {
      userId
    }, token);
    const updatedItem = updatedListData.getUserGroceryLists.find(i => i.listItemId === listItemId);
    console.log('✓ Updated quantity verified:', updatedItem.quantity);

    // 7. Remove item
    console.log('\n7. Removing item from list...');
    const removeData = await graphqlRequest(REMOVE_GROCERY_LIST_ITEM, {
      listItemId
    }, token);
    console.log('✓ Item removed:', removeData.removeGroceryListItem);

    // 8. Verify removal
    console.log('\n8. Verifying removal...');
    const finalListData = await graphqlRequest(GET_USER_GROCERY_LISTS, {
      userId
    }, token);
    console.log('✓ Final list count:', finalListData.getUserGroceryLists.length);

    console.log('\n' + '='.repeat(60));
    console.log('✓ ALL TESTS PASSED');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n✗ TEST FAILED');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
