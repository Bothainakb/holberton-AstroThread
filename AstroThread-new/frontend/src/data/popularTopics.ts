export interface PopularTopic {
  id: string;
  label: string;
  query: string;
}

export const popularTopics: readonly PopularTopic[] = [
  {
    id: "black-holes",
    label: "Black holes",
    query: "Black holes",
  },
  {
    id: "gravitational-waves",
    label: "Gravitational waves",
    query: "Gravitational waves",
  },
  {
    id: "exoplanets",
    label: "Exoplanets",
    query: "Exoplanets",
  },
];