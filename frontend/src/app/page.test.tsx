import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("home page", () => {
  it("renders portal entry points", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: /operational console/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open admin console/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open citizen space/i })).toBeInTheDocument();
  });
});
