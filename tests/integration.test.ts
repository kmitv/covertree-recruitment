import { ApolloServer, gql } from "apollo-server";
import { supabase } from "../src/controllers/supabase-client";
import { typeDefs } from "../src/models/schema";
import { resolvers } from "../src/controllers/resolvers";
import dotenv from "dotenv";
import { Property } from "../src/models/types";

dotenv.config();

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

    server = new ApolloServer({ typeDefs, resolvers });
  });

  afterAll(async () => {
    for (const id of createdPropertyIds) {
      await supabase.from("properties").delete().eq("id", id);
    }

    if (typeof server.stop === "function") {
      await server.stop();
    }
  });

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

  describe("User Story #5: Add new property", () => {
    it("should create multiple properties to test other stories (sorting/filtering)", async () => {
      const propA = await createProperty(
        "Fountain Hills",
        "15528 E Golden Eagle Blvd",
        "AZ",
        "85268"
      );
      expect(propA.city).toBe("Fountain Hills");
      expect(propA.weatherData).toBeDefined();

      const propB = await createProperty(
        "Phoenix",
        "456 Main St",
        "AZ",
        "85001"
      );
      expect(propB.city).toBe("Phoenix");
      expect(propB.weatherData).toBeDefined();

      const propC = await createProperty(
        "Austin",
        "1100 Congress Ave",
        "TX",
        "78701"
      );
      expect(propC.city).toBe("Austin");
      expect(propC.weatherData).toBeDefined();
    });
  });

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

    it("User Story #1: should return all properties", async () => {
      const res = await server.executeOperation({
        query: PROPERTIES_QUERY,
        variables: {}
      });
      expect(res.errors).toBeUndefined();

      const list = res.data?.properties;
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThanOrEqual(3);
    });

    it("User Story #2: should sort properties by creation date descending", async () => {
      const res = await server.executeOperation({
        query: PROPERTIES_QUERY,
        variables: { sort: "desc" }
      });
      expect(res.errors).toBeUndefined();

      const list = res.data?.properties;
      expect(list.length).toBeGreaterThanOrEqual(3);

      const [first, second, third] = list;
      expect(new Date(first.created_at).getTime()).toBeGreaterThanOrEqual(
        new Date(second.created_at).getTime()
      );
      expect(new Date(second.created_at).getTime()).toBeGreaterThanOrEqual(
        new Date(third.created_at).getTime()
      );
    });

    it('User Story #3: should filter by city = "Phoenix"', async () => {
      const res = await server.executeOperation({
        query: PROPERTIES_QUERY,
        variables: { city: "Phoenix" }
      });
      expect(res.errors).toBeUndefined();

      const filtered = res.data?.properties;

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

      expect(filtered.length).toBeGreaterThanOrEqual(2);
      filtered.forEach((p: Property) => expect(p.state).toBe("AZ"));
    });
  });

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
      const propertyId = createdPropertyIds[0];

      const res = await server.executeOperation({
        query: GET_PROPERTY_QUERY,
        variables: { id: propertyId }
      });
      expect(res.errors).toBeUndefined();

      const detail = res.data?.property;
      expect(detail.id).toBe(propertyId);
      expect(detail.city).toBe("Fountain Hills");

      expect(detail.weatherData).toBeDefined();
    });
  });

  describe("User Story #6: deleteProperty", () => {
    const DELETE_PROPERTY_MUTATION = gql`
      mutation DeleteProperty($id: String!) {
        deleteProperty(id: $id)
      }
    `;

    let testPropertyId: string;

    beforeAll(async () => {
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
      expect(checkRes.data?.property).toBeNull();

      createdPropertyIds = createdPropertyIds.filter(id => id !== idToDelete);
    });
  });
});
