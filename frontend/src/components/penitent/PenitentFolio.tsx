import Link from "next/link";
import type { Route } from "next";

type PenitentFolioProps = {
  title: string;
  kicker: string;
  image: string;
  imageAlt: string;
  children: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
};

export function PenitentFolio({
  title,
  kicker,
  image,
  imageAlt,
  children,
  actionHref,
  actionLabel,
}: PenitentFolioProps) {
  return (
    <main className="penitent-folio-shell">
      <Link href={"/penitent" as Route} className="penitent-return">
        Back to manuscript
      </Link>
      <section className="penitent-folio" aria-labelledby="folio-title">
        <div className="penitent-folio__image">
          <img src={image} alt={imageAlt} />
        </div>
        <div className="penitent-folio__copy">
          <p className="penitent-kicker">{kicker}</p>
          <h1 id="folio-title">{title}</h1>
          <div>{children}</div>
          {actionHref && actionLabel ? (
            <Link href={actionHref as Route} className="ballzatram-button ballzatram-button--gold">
              {actionLabel}
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
