export const SEARCH = {
  name: "search",
  description: "search messages across the channel in the server",
  options: [
    { name: "word", type: 3, description: "serach word", required: true },
    {
      name: "limit",
      description: "max charater limit",
      type: 4,
      required: true,
    },
  ],
};
