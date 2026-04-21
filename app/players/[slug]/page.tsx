import { permanentRedirect } from "next/navigation";

type Props = { params: { slug: string } };

export default function PlayerRedirect({ params }: Props) {
  permanentRedirect(`/wnba/players/${params.slug}`);
}
