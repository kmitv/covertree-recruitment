import axios from "axios";
import { ERROR_MESSAGES } from "../messages/errors";

const WEATHERSTACK_BASE_URL = "http://api.weatherstack.com/current";

export const fetchWeatherData = async (
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
