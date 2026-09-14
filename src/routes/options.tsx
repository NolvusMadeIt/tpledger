import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/options")({
  beforeLoad: () => {
    throw redirect({ to: "/settings" });
  },
  component: () => null,
});
