# Covertree API

## Project Description

This project is a back-end application that allows management of property records through a GraphQL API. During the creation of a property, an API call is made to the Weatherstack API to fetch the current weather for the property's location.

## Tech Stack

- **Node.js (22.1.0)**: JavaScript runtime environment (I specifically used Bun during development)
- **TypeScript**
- **GraphQL**
- **Weatherstack API**
- **Supabase**: Backend as a Service (BaaS) for database storage.
- **Jest**: Testing framework.

## User Stories

1. As a user, I can query all the properties.
2. As a user, I am able to sort the properties by date of creation.
3. As a user, I’m able to filter the properties list by their city, zip code, and state.
4. As a user, I can query details of any property.
5. As a user, I can add a new property (all properties are within the United States).
6. As a user, I can delete any property.

## Property Fields

- `id`: Automatically generated during creation.
- `city`: Passed via GraphQL mutation argument on creation (e.g., Fountain Hills).
- `street`: Passed via GraphQL mutation argument on creation (e.g., 15528 E Golden Eagle Blvd).
- `state`: Passed via GraphQL mutation argument on creation (abbreviation, e.g., AZ).
- `zipCode`: Passed via GraphQL mutation argument on creation (5-digit, e.g., 85268).
- `weatherData`: Object containing the `current` property from the Weatherstack API call.
- `lat`: Latitude from the Weatherstack API response (e.g., 33.609).
- `long`: Longitude from the Weatherstack API response (e.g., -111.729).

## Setup Instructions

1. Clone the repository:
    ```sh
    git clone <repository-url>
    cd covertree-api
    ```

2. Install dependencies:
    ```sh
    npm install
    ```

3. Set up environment variables:
    Create a `.env` file in the root directory and add your variables as following:
    ```
    SUPABASE_URL=
    SUPABASE_ANON_KEY=
    WEATHERSTACK_API_KEY=
    PORT=

    ```

4. Build and start the server:
    ```sh
    npm build
    ```
    ```sh
    npm start
    ```

## Example GraphQL Queries and Mutations

### Query All Properties
```graphql
query {
  properties {
    id
    city
    street
    state
    zipCode
    weatherData {
      current {
        temperature
        weather_descriptions
      }
    }
    lat
    long
  }
}
```

### Query Property Details
```graphql
query {
  property(id: "property_id") {
    id
    city
    street
    state
    zipCode
    weatherData {
      current {
        temperature
        weather_descriptions
      }
    }
    lat
    long
  }
}
```

### Add a New Property
```graphql
mutation {
  addProperty(
    city: "Fountain Hills",
    street: "15528 E Golden Eagle Blvd",
    state: "AZ",
    zipCode: "85268"
  ) {
    id
    city
    street
    state
    zipCode
    weatherData {
      current {
        temperature
        weather_descriptions
      }
    }
    lat
    long
  }
}
```

### Delete a Property
```graphql
mutation {
  deleteProperty(id: "property_id") {
    id
  }
}
```
