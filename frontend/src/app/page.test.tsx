import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("home page", () => {
  it("renders portal entry points", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: /frontend foundation/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open admin baseline/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open citizen baseline/i })).toBeInTheDocument();
  });
});
