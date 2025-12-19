import { gql } from '@apollo/client';

// Product request mutation
export const REQUEST_PRODUCT = gql`
  mutation RequestProduct($productName: String!) {
    requestProduct(productName: $productName) {
      requestId
      productName
      status
      createdAt
    }
  }
`;

// Price update request mutation
export const REQUEST_PRICE_UPDATE = gql`
  mutation RequestPriceUpdate($upc: String!, $priority: String) {
    requestPriceUpdate(upc: $upc, priority: $priority) {
      requestId
      upc
      priority
      status
      createdAt
    }
  }
`;

// ===================================
// NEW LIST-BASED MUTATIONS
// ===================================

// Add item to shopping list (with smart suggestions)
export const ADD_LIST_ITEM = gql`
  mutation AddListItem($itemName: String!, $itemVariant: String, $category: String, $quantity: Int) {
    addListItem(itemName: $itemName, itemVariant: $itemVariant, category: $category, quantity: $quantity) {
      id
      itemName
      itemVariant
      category
      quantity
      checked
    }
  }
`;

// Update list item
export const UPDATE_LIST_ITEM = gql`
  mutation UpdateListItem($id: ID!, $quantity: Int, $checked: Boolean) {
    updateListItem(id: $id, quantity: $quantity, checked: $checked) {
      id
      quantity
      checked
    }
  }
`;

// Remove list item
export const REMOVE_LIST_ITEM = gql`
  mutation RemoveListItem($id: ID!) {
    removeListItem(id: $id)
  }
`;
