import { redirect } from "next/navigation";

export default async function KursPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/kurs/${id}/kalkulation`);
}
