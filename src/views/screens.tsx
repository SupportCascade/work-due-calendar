"use client";

import dynamic from "next/dynamic";

// Browser-only: the theme reads localStorage and the calendar works from the
// visitor's clock, so these render on the client after the server has
// checked the session.
export const CalendarScreen = dynamic(() => import("./CalendarApp"), {
  ssr: false,
});

export const LoginScreen = dynamic(
  () => import("./LoginPage").then(module => module.LoginScreen),
  { ssr: false },
);
