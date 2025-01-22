export type WeatherData = {
  observation_time: string;
  temperature: number;
  weather_code: number;
  weather_icons: string[];
  weather_descriptions: string[];
  wind_speed: number;
  wind_degree: number;
  wind_dir: string;
  pressure: number;
  precip: number;
  humidity: number;
  cloudcover: number;
  feelslike: number;
  uv_index: number;
  visibility: number;
  is_day: string;
};

export type Property = {
  id: string;
  city: string;
  street: string;
  state: string;
  zipCode: string;
  lat?: number;
  long?: number;
  weatherData?: WeatherData;
  created_at?: string;
};

export type CreatePropertyInput = {
  city: string;
  street: string;
  state: string;
  zipCode: string;
};

export type Query = {
  properties: Property[];
  property?: Property;
};

export type Mutation = {
  createProperty: Property;
  deleteProperty: boolean;
};
