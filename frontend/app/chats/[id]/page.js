import { ChatThreadView } from "@/components/ChatThreadView";

export default async function ChatThreadPage({ params }) {
  const resolvedParams = await params;

  return <ChatThreadView threadId={resolvedParams.id} />;
}
