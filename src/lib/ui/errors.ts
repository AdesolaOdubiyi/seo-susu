/** Turn thrown values into short user-facing copy. */

const KNOWN: Record<string, string> = {
  "Group not found": "We could not find that group.",
  "User not found": "We could not find that member.",
  "Invalid invite code": "That invite code does not match a group.",
  "Poll not found": "That vote is no longer available.",
  "Already voted on this poll": "You already voted on this.",
  "You can't vote on your own removal": "You cannot vote on your own removal.",
  "A member with that name already exists in this group":
    "Someone in this group already uses that name.",
  "That user is not an active member of this group":
    "That person is not an active member of this group.",
  "User is not an active member of this group":
    "You need to be an active member to do that.",
  "The current cycle isn't complete yet":
    "This cycle is not finished yet.",
  "No agreement is awaiting signatures":
    "There is no agreement waiting for signatures.",
  "Internal server error": "Something went wrong on our side. Try again.",
  "Request body must be a JSON object": "The request was not valid.",
  "Groq returned an empty reply":
    "The assistant did not return a reply. Try again.",
  "Not available": "That action is only available while developing.",
};

export function getErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Try again.",
): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "";
  const message = raw.trim();
  if (!message) return fallback;
  if (KNOWN[message]) return KNOWN[message];
  return humanize(message);
}

function humanize(message: string): string {
  return message
    .replace(/\bchangeType\b/gi, "proposal type")
    .replace(/\bchangeDetails\b/gi, "proposal details")
    .replace(/\bstart_cycle\b/g, "start next cycle")
    .replace(/"([^"]+)"/g, "$1")
    .replace(/_/g, " ");
}
