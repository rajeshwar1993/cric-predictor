import { render, screen } from "@testing-library/react";
import { EmptyState } from "./empty-state";
import { Inbox } from "lucide-react";

describe("EmptyState", () => {
  it("renders the title", () => {
    render(
      <EmptyState icon={Inbox} title="No items" description="Start adding items." />
    );
    expect(screen.getByText("No items")).toBeInTheDocument();
  });

  it("renders the description", () => {
    render(
      <EmptyState icon={Inbox} title="No items" description="Start adding items." />
    );
    expect(screen.getByText("Start adding items.")).toBeInTheDocument();
  });

  it("does not render an action when not provided", () => {
    const { container } = render(
      <EmptyState icon={Inbox} title="No items" description="Start adding items." />
    );
    // No extra div after the description paragraph
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(1);
  });

  it("renders an optional action element", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="No items"
        description="Start adding items."
        action={<button>Add Item</button>}
      />
    );
    expect(screen.getByText("Add Item")).toBeInTheDocument();
  });
});
