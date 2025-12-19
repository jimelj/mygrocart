import { gql } from '@apollo/client';

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        userId
        email
        name
      }
    }
  }
`;

export const SIGNUP_MUTATION = gql`
  mutation Signup(
    $email: String!
    $password: String!
    $name: String
    $zipCode: String!
  ) {
    signup(
      email: $email
      password: $password
      name: $name
      zipCode: $zipCode
    ) {
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

export const REQUEST_PRICE_UPDATE = gql`
  mutation RequestPriceUpdate($upc: String!, $priority: String) {
    requestPriceUpdate(upc: $upc, priority: $priority) {
      requestId
      upc
      priority
      status
    }
  }
`;

// NEW: Text-based shopping list mutations
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

export const UPDATE_LIST_ITEM = gql`
  mutation UpdateListItem($id: ID!, $quantity: Int, $checked: Boolean) {
    updateListItem(id: $id, quantity: $quantity, checked: $checked) {
      id
      quantity
      checked
    }
  }
`;

export const REMOVE_LIST_ITEM = gql`
  mutation RemoveListItem($id: ID!) {
    removeListItem(id: $id)
  }
`;
