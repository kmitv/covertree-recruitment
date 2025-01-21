import { supabase } from "./supabaseClient";
import axios from "axios";
import { ApolloError } from "apollo-server";
import { ERROR_MESSAGES } from "./messages/errors";

interface CreatePropertyInput {
  city: string;
  street: string;
  state: string;
  zipCode: string;
}

const WEATHERSTACK_BASE_URL = "http://api.weatherstack.com/current";

const fetchWeatherData = async (
  city: string,
  state: string,
  zipCode: string
) => {
  const url = new URL(WEATHERSTACK_BASE_URL);
  url.searchParams.append("access_key", process.env.WEATHERSTACK_API_KEY ?? "");
  url.searchParams.append(
    "query",
    `${city}, ${state}, ${zipCode}, United States`
  );

  const response = await axios.get(url.toString());

  if (response.data.error) {
    throw new Error(
      `${ERROR_MESSAGES.WEATHER_API}: ${response.data.error.info}`
    );
  }

  return response.data;
};

export const resolvers = {
  Query: {
    properties: async (
      _: any,
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
      } catch (error) {
        throw new ApolloError(`${ERROR_MESSAGES.FETCH_PROPERTIES}.`);
      }
    },

    property: async (_: any, args: { id: string }) => {
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
      _: any,
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
      } catch (err: any) {
        throw new ApolloError(
          `${ERROR_MESSAGES.CREATE_PROPERTY}: ${err.message}`
        );
      }
    },

    deleteProperty: async (_: any, { id }: { id: string }) => {
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
      } catch (err: any) {
        throw new ApolloError(
          `${ERROR_MESSAGES.DELETE_PROPERTY}: ${err.message}`
        );
      }
    }
  }
};
