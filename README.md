# MyGroCart - Smart Supermarket Price Comparison App

This document provides instructions to set up and run the MyGroCart application locally. The application consists of a React frontend and a Node.js/Express/GraphQL backend.

## Table of Contents
1.  [Prerequisites](#prerequisites)
2.  [Backend Setup](#backend-setup)
3.  [Frontend Setup](#frontend-setup)
4.  [Running the Application](#running-the-application)
5.  [Testing and Access](#testing-and-access)
6.  [Sample Credentials](#sample-credentials)

## 1. Prerequisites
Before you begin, ensure you have the following installed on your system:
-   **Node.js**: Version 18.x or higher (includes npm)
-   **pnpm**: Recommended package manager for faster installations. If not installed, you can install it via npm: `npm install -g pnpm`

## 2. Backend Setup

Navigate to the backend directory and install dependencies.

```bash
cd mygrocart-backend-node
pnpm install
```

### Environment Variables
Create a `.env` file in the `mygrocart-backend-node` directory with the following content:

```
PORT=5000
JWT_SECRET=your_jwt_secret_key_here # Replace with a strong, random key
MONGODB_URI=mongodb://localhost:27017/mygrocart # If you have MongoDB locally
```

*Note: If you don't have MongoDB installed, the application will use an in-memory data store for basic functionality. For persistent data, it's recommended to install MongoDB locally or use a cloud-hosted solution.* 

## 3. Frontend Setup

Navigate to the frontend directory and install dependencies.

```bash
cd mygrocart-app
pnpm install
```

## 4. Running the Application

### Start the Backend Server

In the `mygrocart-backend-node` directory, run:

```bash
pnpm start
```

This will start the Node.js backend server, typically on `http://localhost:5000`.

### Start the Frontend Development Server

In the `supermarket-app` directory, run:

```bash
pnpm dev
```

This will start the React development server, typically on `http://localhost:5174`.

## 5. Testing and Access

-   **Frontend Application**: Open your web browser and go to `http://localhost:5174`.
-   **Backend GraphQL Playground**: Access the GraphQL API playground at `http://localhost:5000/graphql` to test queries and mutations directly.

## 6. Sample Credentials

If you are using the in-memory data store (without a local MongoDB setup), you can sign up for a new account directly from the app's landing page. Use any email and password, along with dummy address details.

If you set up MongoDB and seeded sample data, you can use the following credentials:

**Email:** `test@example.com`
**Password:** `password123`

Enjoy using MyGroCart!

