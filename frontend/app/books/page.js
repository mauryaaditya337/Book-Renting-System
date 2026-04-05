import { BooksBrowse } from "@/components/BooksBrowse";

export default function BooksPage({ searchParams }) {
  return <BooksBrowse initialView = {searchParams?.view === "saved" ? "saved" : "all"} />;
}
