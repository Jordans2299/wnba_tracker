import { permanentRedirect } from "next/navigation";

type Props = { params: { slug: string } };

export default function TeamRedirect({ params }: Props) {
  permanentRedirect(`/wnba/teams/${params.slug}`);
}
