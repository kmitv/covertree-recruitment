import { supabase } from "./supabase-client";
import { ApolloError } from "apollo-server";
import { ERROR_MESSAGES } from "../messages/errors";
import { fetchWeatherData } from "../services/weatherstack";

interface CreatePropertyInput {
  city: string;
  street: string;
  state: string;
  zipCode: string;
}

export const resolvers = {
  Query: {
    properties: async (
      _: never,
      args: { city?: string; state?: string; zipCode?: string; sort?: string }
    ) => {
      const { city, state, zipCode, sort } = args;

      try {
        let query = supabase.from("properties").select("*");

        if (city) query = query.ilike("city", city);
        if (state) query = query.ilike("state", state);
        if (zipCode) query = query.ilike("zipCode", zipCode);

        if (sort && ["asc", "desc"].includes(sort.toLowerCase())) {
          query = query.order("created_at", {
            ascending: sort.toLowerCase() === "asc"
          });
        }

        const { data, error } = await query;

        if (error) {
          throw new ApolloError(
            `${ERROR_MESSAGES.FETCH_PROPERTIES}: ${error.message}`
          );
        }

        return data;
      } catch {
        throw new ApolloError(`${ERROR_MESSAGES.FETCH_PROPERTIES}.`);
      }
    },

    property: async (_: never, args: { id: string }) => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", args.id)
        .single();

      if (error) {
        throw new ApolloError(
          `${ERROR_MESSAGES.FETCH_PROPERTY}: ${error.message}`
        );
      }

      return data;
    }
  },

  Mutation: {
    createProperty: async (
      _: never,
      { input }: { input: CreatePropertyInput }
    ) => {
      const { city, street, state, zipCode } = input;
      try {
        const weatherData = await fetchWeatherData(city, state, zipCode);
        const { current, location } = weatherData;
        const lat = location?.lat;
        const long = location?.lon;

        const { data, error } = await supabase
          .from("properties")
          .insert({
            city,
            street,
            state,
            zipCode,
            weatherData: current,
            lat,
            long
          })
          .select();

        if (error) {
          throw new ApolloError(
            `${ERROR_MESSAGES.CREATE_PROPERTY}: ${error.message}`
          );
        }

        return data[0];
      } catch (err) {
        throw new ApolloError(
          `${ERROR_MESSAGES.CREATE_PROPERTY}: ${
            err instanceof Error ? err.message : ERROR_MESSAGES.UNKOWN
          }`
        );
      }
    },

    deleteProperty: async (_: never, { id }: { id: string }) => {
      try {
        const { data, error } = await supabase
          .from("properties")
          .delete()
          .eq("id", id);

        if (error) {
          throw new ApolloError(
            `${ERROR_MESSAGES.DELETE_PROPERTY}: ${error.message}`
          );
        }

        return data;
      } catch (err) {
        throw new ApolloError(
          `${ERROR_MESSAGES.DELETE_PROPERTY}: ${
            err instanceof Error ? err.message : ERROR_MESSAGES.UNKOWN
          }`
        );
      }
    }
  }
};
