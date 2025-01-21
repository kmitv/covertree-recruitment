// __tests__/fullIntegration.test.ts

import { ApolloServer, gql } from "apollo-server"; // For Apollo Server v3
// If using Apollo Server v4: import { ApolloServer } from '@apollo/server';

import dotenv from "dotenv";
dotenv.config(); // Load .env (Supabase & Weatherstack credentials)

// Our real Supabase client (no mocks):
import { supabase } from "../src/controllers/supabaseClient";

// Schema & resolvers that implement all user stories:
import { typeDefs } from "../src/models/schema";
import { resolvers } from "../src/controllers/resolvers";

describe("Full Integration Tests - No Mocks (Supabase + Weatherstack)", () => {
  let server: ApolloServer;
  // We'll store created IDs for cleanup
  let createdPropertyIds: string[] = [];

  beforeAll(async () => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env");
    }
    if (!process.env.WEATHERSTACK_API_KEY) {
      throw new Error("Missing WEATHERSTACK_API_KEY in .env");
    }

    // Create an in-memory Apollo Server with our schema/resolvers
    server = new ApolloServer({ typeDefs, resolvers });
    // If using Apollo Server v4: await server.start();
  });

  afterAll(async () => {
    // Clean up any test data created
    // If you want to keep the data, remove this
    for (const id of createdPropertyIds) {
      await supabase.from("properties").delete().eq("id", id);
    }

    // Stop server if using Apollo Server v3
    if (typeof server.stop === "function") {
      await server.stop();
    }
  });

  // ------------------------------------------------------
  // HELPER: Creates multiple properties for testing filter/sort
  // ------------------------------------------------------
  const CREATE_PROPERTY_MUTATION = gql`
    mutation CreateProperty($input: CreatePropertyInput!) {
      createProperty(input: $input) {
        id
        city
        street
        state
        zipCode
        lat
        long
        weatherData {
          temperature
        }
        created_at
      }
    }
  `;

  async function createProperty(
    city: string,
    street: string,
    state: string,
    zipCode: string
  ) {
    const res = await server.executeOperation({
      query: CREATE_PROPERTY_MUTATION,
      variables: {
        input: {
          city,
          street,
          state,
          zipCode
        }
      }
    });
    if (res.errors) {
      throw new Error(`Failed creating property: ${res.errors[0].message}`);
    }
    const prop = res.data?.createProperty;
    createdPropertyIds.push(prop.id);
    return prop;
  }

  // ------------------------------------------------------
  // USER STORY #5: Add new property (with Weatherstack call)
  // We'll create a few test properties right away
  // ------------------------------------------------------
  describe("User Story #5: Add new property", () => {
    it("should create multiple properties to test other stories (sorting/filtering)", async () => {
      // 1) "Fountain Hills" in Arizona
      const propA = await createProperty(
        "Fountain Hills",
        "15528 E Golden Eagle Blvd",
        "AZ",
        "85268"
      );
      expect(propA.city).toBe("Fountain Hills");
      expect(propA.weatherData).toBeDefined();

      // 2) "Phoenix" in Arizona
      const propB = await createProperty(
        "Phoenix",
        "456 Main St",
        "AZ",
        "85001"
      );
      expect(propB.city).toBe("Phoenix");
      expect(propB.weatherData).toBeDefined();

      // 3) "Austin" in Texas
      const propC = await createProperty(
        "Austin",
        "1100 Congress Ave",
        "TX",
        "78701"
      );
      expect(propC.city).toBe("Austin");
      expect(propC.weatherData).toBeDefined();

      // We now have 3 properties with different cities and creation times
    });
  });

  // ------------------------------------------------------
  // USER STORY #1: Query all properties
  // USER STORY #2: Sort by creation date
  // USER STORY #3: Filter by city, zip code, state
  // ------------------------------------------------------
  describe("Queries: properties", () => {
    const PROPERTIES_QUERY = gql`
      query Properties(
        $city: String
        $state: String
        $zipCode: String
        $sort: String
      ) {
        properties(city: $city, state: $state, zipCode: $zipCode, sort: $sort) {
          id
          city
          street
          state
          zipCode
          created_at
        }
      }
    `;

    // USER STORY #1: Query all
    it("User Story #1: should return all properties", async () => {
      const res = await server.executeOperation({
        query: PROPERTIES_QUERY,
        variables: {}
      });
      expect(res.errors).toBeUndefined();

      const list = res.data?.properties;
      expect(Array.isArray(list)).toBe(true);
      // We expect at least the 3 we inserted in the previous test
      expect(list.length).toBeGreaterThanOrEqual(3);
    });

    // USER STORY #2: Sort by creation date
    it("User Story #2: should sort properties by creation date descending", async () => {
      const res = await server.executeOperation({
        query: PROPERTIES_QUERY,
        variables: { sort: "desc" }
      });
      expect(res.errors).toBeUndefined();

      const list = res.data?.properties;
      expect(list.length).toBeGreaterThanOrEqual(3);

      // Verify that the first item is the newest created
      // (We can't guarantee timing, but generally the last one created is "Austin" if done quickly)
      // For a robust test, you'd create them with a short delay or check the created_at times.
      const [first, second, third] = list;
      expect(new Date(first.created_at).getTime()).toBeGreaterThanOrEqual(
        new Date(second.created_at).getTime()
      );
      expect(new Date(second.created_at).getTime()).toBeGreaterThanOrEqual(
        new Date(third.created_at).getTime()
      );
    });

    // USER STORY #3: Filter by city, zip code, state
    it('User Story #3: should filter by city = "Phoenix"', async () => {
      const res = await server.executeOperation({
        query: PROPERTIES_QUERY,
        variables: { city: "Phoenix" }
      });
      expect(res.errors).toBeUndefined();

      const filtered = res.data?.properties;
      // We expect exactly 1 property if no other "Phoenix" was inserted
      expect(filtered.length).toBe(1);
      expect(filtered[0].city).toBe("Phoenix");
    });

    it('User Story #3: should filter by zipCode = "78701" (Austin)', async () => {
      const res = await server.executeOperation({
        query: PROPERTIES_QUERY,
        variables: { zipCode: "78701" }
      });
      expect(res.errors).toBeUndefined();

      const filtered = res.data?.properties;
      expect(filtered.length).toBe(1);
      expect(filtered[0].city).toBe("Austin");
    });

    it('User Story #3: should filter by state = "AZ" (multiple matches)', async () => {
      const res = await server.executeOperation({
        query: PROPERTIES_QUERY,
        variables: { state: "AZ" }
      });
      expect(res.errors).toBeUndefined();

      const filtered = res.data?.properties;
      // Should match at least 2 (Fountain Hills & Phoenix)
      expect(filtered.length).toBeGreaterThanOrEqual(2);
      // Check all returned are indeed state = "AZ"
      filtered.forEach((p: any) => expect(p.state).toBe("AZ"));
    });
  });

  // ------------------------------------------------------
  // USER STORY #4: Query details of any property
  // ------------------------------------------------------
  describe("User Story #4: property(id: ID!)", () => {
    const GET_PROPERTY_QUERY = gql`
      query GetProperty($id: String!) {
        property(id: $id) {
          id
          city
          street
          state
          zipCode
          lat
          long
          weatherData {
            temperature
          }
          created_at
        }
      }
    `;

    it("should query details of a known property (e.g., the first one created)", async () => {
      // We'll pick the first created property in our array
      // That should be the "Fountain Hills" one if the test runs quickly
      const propertyId = createdPropertyIds[0];

      const res = await server.executeOperation({
        query: GET_PROPERTY_QUERY,
        variables: { id: propertyId }
      });
      expect(res.errors).toBeUndefined();

      const detail = res.data?.property;
      expect(detail.id).toBe(propertyId);
      expect(detail.city).toBe("Fountain Hills");
      // We should have weatherData from Weatherstack
      expect(detail.weatherData).toBeDefined();
    });
  });

  // ------------------------------------------------------
  // USER STORY #6: Delete any property
  // ------------------------------------------------------
  describe("User Story #6: deleteProperty", () => {
    const DELETE_PROPERTY_MUTATION = gql`
      mutation DeleteProperty($id: String!) {
        deleteProperty(id: $id)
      }
    `;

    let testPropertyId: string;

    beforeAll(async () => {
      // Create a test property
      const propertyInput = {
        city: "Phoenix",
        street: "123 Main St",
        state: "AZ",
        zipCode: "85001"
      };

      const res = await server.executeOperation({
        query: CREATE_PROPERTY_MUTATION,
        variables: { input: propertyInput }
      });

      expect(res.errors).toBeUndefined();
      const prop = res.data?.createProperty;
      expect(prop).toBeDefined();
      testPropertyId = prop.id;
    });

    it("should delete newly created test property", async () => {
      const idToDelete = testPropertyId;

      const res = await server.executeOperation({
        query: DELETE_PROPERTY_MUTATION,
        variables: { id: idToDelete }
      });
      expect(res.errors).toBeUndefined();

      // Confirm it's deleted
      const checkRes = await server.executeOperation({
        query: gql`
          query CheckDeleted($id: String!) {
            property(id: $id) {
              id
            }
          }
        `,
        variables: { id: idToDelete }
      });
      // Should be null or throw an error, depending on your resolver logic
      expect(checkRes.data?.property).toBeNull();

      // Remove from our local array so we don't try to delete it again in afterAll
      createdPropertyIds = createdPropertyIds.filter(id => id !== idToDelete);
    });
  });
});
