import { notFound } from "next/navigation";

export default function BlogPostPage({
  params: _params,
}: {
  params: { slug: string };
}) {
  // Blog posts not yet available
  notFound();
}
