/** Shared home feature copy for live home + layout prototypes. */
export const HOME_FEATURES = [
  {
    title: "Same amount, same order, every round",
    body: "Everyone puts in on the same schedule. Each round the pot goes to the next person in line.",
  },
  {
    title: "Nothing changes without everyone agreeing",
    body: "Amount, schedule, who's in. Anyone can propose a change. It only sticks if every active member says yes.",
  },
  {
    title: "Mark it sent, see who's caught up",
    body: "Contribute with a tap. See who's paid and who's still owed before the payout goes out.",
  },
  {
    title: "A rules doc everyone signed",
    body: "Terms get written down once the group agrees, so there's a clear record to point to later.",
  },
  {
    title: "Ask instead of digging",
    body: "Questions like who's next or why a payout is paused use your group's real status and rules.",
  },
] as const;

export const HOME_PROTOTYPE_LINKS = [
  {
    href: "/prototypes/home-a",
    name: "Feature Grid",
    blurb:
      "Three columns on desktop, two on tablet. Equal weight, no cards. Common landing pattern.",
  },
  {
    href: "/prototypes/home-b",
    name: "Scroll Rail (shipped)",
    blurb:
      "Horizontal snap rail of feature panels. Now live on the home page.",
  },
  {
    href: "/prototypes/home-c",
    name: "Split Band",
    blurb:
      "Title and intro on the left; feature grid on the right. Editorial divided layout.",
  },
] as const;
