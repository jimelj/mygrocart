"use client";

import { ApolloLink, HttpLink, from } from "@apollo/client";
import {
  ApolloClient,
  InMemoryCache,
  ApolloNextAppProvider,
} from "@apollo/client-integration-nextjs";
import { onError, ErrorResponse } from "@apollo/client/link/error";
import { RetryLink } from "@apollo/client/link/retry";
import { ReactNode } from "react";
import { GraphQLError } from "graphql";

function makeClient() {
  const httpLink = new HttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:5001/graphql',
  });

  const authLink = new ApolloLink((operation, forward) => {
    // Get the authentication token from local storage if it exists
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

    // Add authorization header
    operation.setContext({
      headers: {
        authorization: token ? `Bearer ${token}` : "",
      }
    });

    return forward(operation);
  });

  // Error handling link for JWT expiration and network errors
  const errorLink = onError((errorResponse: ErrorResponse) => {
    const { graphQLErrors, networkError, operation } = errorResponse;
    if (graphQLErrors) {
      graphQLErrors.forEach((error: GraphQLError) => {
        const { message, locations, path } = error;
        console.error(
          `[GraphQL error]: Message: ${message}, Location: ${JSON.stringify(locations)}, Path: ${path}`
        );

        // Handle JWT expiration/authorization errors
        if (message.includes('Unauthorized') || message.includes('Invalid token') || message.includes('jwt expired')) {
          // Clear expired token from localStorage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');

            // Show user-friendly message
            alert('Your session has expired. Please log in again.');

            // Redirect to login page
            window.location.href = '/login';
          }
        }
      });
    }

    if (networkError) {
      console.error(`[Network error]: ${networkError.message}`);

      // Show user-friendly error for network issues
      if (typeof window !== 'undefined') {
        if (networkError.message.includes('Failed to fetch') || networkError.message.includes('Network request failed')) {
          alert('Unable to connect to the server. Please check your internet connection and try again.');
        } else if (networkError.message.includes('timeout')) {
          alert('The request took too long. Please try again.');
        }
      }
    }
  });

  // Retry logic for failed network requests
  const retryLink = new RetryLink({
    delay: {
      initial: 300,
      max: 3000,
      jitter: true,
    },
    attempts: {
      max: 3,
      retryIf: (error, _operation) => {
        // Retry on network errors but not on auth errors
        return !!error && !error.message.includes('Unauthorized') && !error.message.includes('jwt expired');
      },
    },
  });

  return new ApolloClient({
    cache: new InMemoryCache(),
    link: from([errorLink, retryLink, authLink, httpLink]),
    // Default error policy
    defaultOptions: {
      watchQuery: {
        errorPolicy: 'all',
      },
      query: {
        errorPolicy: 'all',
      },
      mutate: {
        errorPolicy: 'all',
      },
    },
  });
}

export function ApolloWrapper({ children }: { children: ReactNode }) {
  return (
    <ApolloNextAppProvider makeClient={makeClient}>
      {children}
    </ApolloNextAppProvider>
  );
}
