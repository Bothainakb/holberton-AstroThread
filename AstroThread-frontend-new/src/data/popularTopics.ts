export interface PopularTopic {
  id: string;
  label: string;
  query: string;
}

export const popularTopics: readonly PopularTopic[] = [
  {
    id: "black-holes",
    label: "Black Holes",
    query: "Black Holes",
  },
  {
    id: "gravitational-waves",
    label: "Gravitational Waves",
    query: "Gravitational Waves",
  },
  {
    id: "exoplanets",
    label: "Exoplanets",
    query: "Exoplanets",
  },
];