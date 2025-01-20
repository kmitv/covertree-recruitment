import { supabase } from "./supabaseClient";
import axios from "axios";
import { ApolloError } from "apollo-server";

interface CreatePropertyInput {
  city: string;
  street: string;
  state: string;
  zipCode: string;
}

const WEATHERSTACK_BASE_URL = "http://api.weatherstack.com/current";

export const resolvers = {
  Query: {
    properties: async (
      _: any,
      args: { city?: string; state?: string; zipCode?: string; sort?: string }
    ) => {
      const { city, state, zipCode, sort } = args;

      let query = supabase.from("properties").select("*");

      // Optional filtering
      if (city) {
        query = query.ilike("city", city);
      }
      if (state) {
        query = query.ilike("state", state);
      }
      if (zipCode) {
        query = query.ilike("zipCode", zipCode);
      }

      // Optional sorting by created_at
      if (
        sort &&
        (sort.toLowerCase() === "asc" || sort.toLowerCase() === "desc")
      ) {
        query = query.order("created_at", {
          ascending: sort.toLowerCase() === "asc"
        });
      }

      const { data, error } = await query;
      if (error) {
        throw new ApolloError(error.message);
      }

      return data;
    },

    property: async (_: any, args: { id: string }) => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", args.id)
        .single();

      if (error) {
        throw new ApolloError(error.message);
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
        // 1. Call Weatherstack API to get current weather
        const url = `${WEATHERSTACK_BASE_URL}?access_key=${
          process.env.WEATHERSTACK_API_KEY
        }&query=${encodeURIComponent(
          `${city}, ${state}, ${zipCode}, United States`
        )}`;
        const response = await axios.get(url);

        if (response.data.error) {
          throw new Error(response.data.error.info);
        }

        const { current, location } = response.data;
        // Weatherstack location typically includes lat/lon
        // If your plan doesn't provide lat/long, you'd need a separate geocoding step.
        const lat = location?.lat;
        const long = location?.lon;

        // 2. Insert into Supabase
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

        console.log("DUDUUD data, error", data, error);

        if (error) {
          throw new ApolloError(error.message);
        }

        return data[0];
      } catch (err: any) {
        throw new ApolloError(err.message);
      }
    },

    deleteProperty: async (_: any, { id }: { id: string }) => {
      const { data, error } = await supabase
        .from("properties")
        .delete()
        .eq("id", id);

      if (error) {
        throw new ApolloError(error.message);
      }

      // If the row was successfully deleted, data should be an array with the deleted records.
      // Return true if at least one record was deleted, false otherwise.
      //   return data && data.length > 0;
      return data;
    }
  }
};
