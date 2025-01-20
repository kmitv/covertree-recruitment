import { gql } from "apollo-server";

export const typeDefs = gql`
  type WeatherData {
    observation_time: String
    temperature: Int
    weather_code: Int
    weather_icons: [String]
    weather_descriptions: [String]
    wind_speed: Int
    wind_degree: Int
    wind_dir: String
    pressure: Int
    precip: Float
    humidity: Int
    cloudcover: Int
    feelslike: Int
    uv_index: Int
    visibility: Int
    is_day: String
  }

  type Property {
    id: String!
    city: String!
    street: String!
    state: String!
    zipCode: String!
    lat: Float
    long: Float
    weatherData: WeatherData
    created_at: String
  }

  input CreatePropertyInput {
    city: String!
    street: String!
    state: String!
    zipCode: String!
  }

  type Query {
    properties(
      city: String
      state: String
      zipCode: String
      sort: String
    ): [Property!]!
    property(id: String!): Property
  }

  type Mutation {
    createProperty(input: CreatePropertyInput!): Property
    deleteProperty(id: String!): Boolean
  }
`;
